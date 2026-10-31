-- Benefícios de quem estava na lista de espera (Fundador).
--
-- Quem cria a conta com o mesmo e-mail da lista ganha:
--   * founder_number: o número do selo Fundador (ordem de cadastro na lista,
--     o mesmo que aparece na página /lista e no e-mail de lançamento);
--   * 1 mês de PRO grátis, contado a partir do primeiro login.
--
-- O PRO de fundador usa o mesmo is_pro de sempre, com pro_source = 'founder',
-- para que todas as travas de plano (triggers de limite, telas PRO) funcionem
-- sem mudança. Os apps chamam sync_founder() ao iniciar a sessão: ele liga o
-- benefício na primeira vez, religa se um PRO pago acabar antes do prazo e
-- desliga quando o mês termina.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founder_number integer,
  ADD COLUMN IF NOT EXISTS founder_pro_until timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pro_source_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pro_source_check CHECK (pro_source IN ('cakto', 'store', 'founder'));

-- Trava contra o usuário se dar PRO ou selo pelo próprio app. Agora também
-- vale para o INSERT (antes só o UPDATE era verificado) e para as colunas de
-- fundador. Só passam o service_role (webhooks) e o sync_founder().
CREATE OR REPLACE FUNCTION public.prevent_is_pro_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF current_setting('role') = 'service_role'
     OR current_setting('ascend.founder_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_pro, false)
       OR NEW.pro_source IS NOT NULL
       OR NEW.founder_number IS NOT NULL
       OR NEW.founder_pro_until IS NOT NULL THEN
      RAISE EXCEPTION 'is_pro can only be changed by the server (payment webhook)';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
     OR NEW.pro_source IS DISTINCT FROM OLD.pro_source
     OR NEW.founder_number IS DISTINCT FROM OLD.founder_number
     OR NEW.founder_pro_until IS DISTINCT FROM OLD.founder_pro_until THEN
    RAISE EXCEPTION 'is_pro can only be changed by the server (payment webhook)';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trig_prevent_is_pro_escalation ON public.profiles;
CREATE TRIGGER trig_prevent_is_pro_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_is_pro_escalation();

CREATE OR REPLACE FUNCTION public.sync_founder()
RETURNS TABLE (founder_number integer, founder_pro_until timestamptz, is_pro boolean, pro_source text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_number integer;
  p public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT * INTO p FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  PERFORM set_config('ascend.founder_sync', 'on', true);

  -- Primeira vez: procura o e-mail (já confirmado) na lista de espera.
  IF p.founder_number IS NULL THEN
    SELECT lower(u.email) INTO v_email
      FROM auth.users u
     WHERE u.id = v_uid AND u.email_confirmed_at IS NOT NULL;

    IF v_email IS NOT NULL THEN
      SELECT w.n INTO v_number
        FROM (SELECT lower(email) AS e, row_number() OVER (ORDER BY seq) AS n
                FROM public.waitlist) w
       WHERE w.e = v_email;

      IF v_number IS NOT NULL THEN
        UPDATE public.profiles
           SET founder_number = v_number,
               founder_pro_until = now() + interval '1 month'
         WHERE id = v_uid
        RETURNING * INTO p;
      END IF;
    END IF;
  END IF;

  IF p.founder_pro_until IS NOT NULL THEN
    IF p.founder_pro_until > now() AND NOT COALESCE(p.is_pro, false) THEN
      UPDATE public.profiles SET is_pro = true, pro_source = 'founder'
       WHERE id = v_uid RETURNING * INTO p;
    ELSIF p.founder_pro_until <= now() AND p.is_pro AND p.pro_source = 'founder' THEN
      UPDATE public.profiles SET is_pro = false, pro_source = NULL
       WHERE id = v_uid RETURNING * INTO p;
    END IF;
  END IF;

  PERFORM set_config('ascend.founder_sync', 'off', true);

  RETURN QUERY SELECT p.founder_number, p.founder_pro_until, COALESCE(p.is_pro, false), p.pro_source;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_founder() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sync_founder() TO authenticated;
