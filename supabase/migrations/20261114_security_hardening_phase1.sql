-- ============================================================
-- Segurança — Fase 1 (auditoria de 14/11/2026)
--
-- 1. notify-cancellation: o gatilho passa a enviar só o id da
--    solicitação. A função busca os dados no banco e marca
--    notified_at, então uma chamada forjada não consegue mandar
--    e-mail com conteúdo inventado nem repetir o envio.
--    A chave anon deixa de ficar escrita no código do gatilho.
-- 2. Webhook da Cakto: get_user_id_by_email() acha o usuário direto
--    no auth.users (listUsers() só devolvia os 50 primeiros).
--    Só o service_role pode chamar.
-- 3. Trigger anti-autopromoção também protege cakto_subscription_id.
-- 4. Funções de gatilho deixam de ser chamáveis por anon/authenticated
--    via /rest/v1/rpc. O gatilho continua disparando normalmente:
--    o Postgres só checa EXECUTE ao criar o gatilho, não ao disparar.
-- 5. search_path fixo nas funções que estavam sem.
-- ============================================================

-- 1. notify-cancellation -------------------------------------
ALTER TABLE public.cancellation_requests
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Solicitações antigas já foram avisadas pelo fluxo anterior.
UPDATE public.cancellation_requests
   SET notified_at = created_at
 WHERE notified_at IS NULL;

CREATE OR REPLACE FUNCTION public.notify_cancellation_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://rwdzcbbneczjefmjzkdr.supabase.co/functions/v1/notify-cancellation',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('id', NEW.id)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_cancellation_webhook() FROM PUBLIC, anon, authenticated;

-- 2. Busca de usuário por e-mail (webhook da Cakto) -----------
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, pg_catalog
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;

-- 3. Anti-autopromoção também cobre cakto_subscription_id -----
CREATE OR REPLACE FUNCTION public.prevent_is_pro_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_setting('role') = 'service_role'
     OR current_setting('ascend.founder_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_pro, false)
       OR NEW.pro_source IS NOT NULL
       OR NEW.founder_number IS NOT NULL
       OR NEW.founder_pro_until IS NOT NULL
       OR NEW.cakto_subscription_id IS NOT NULL THEN
      RAISE EXCEPTION 'is_pro can only be changed by the server (payment webhook)';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
     OR NEW.pro_source IS DISTINCT FROM OLD.pro_source
     OR NEW.founder_number IS DISTINCT FROM OLD.founder_number
     OR NEW.founder_pro_until IS DISTINCT FROM OLD.founder_pro_until
     OR NEW.cakto_subscription_id IS DISTINCT FROM OLD.cakto_subscription_id THEN
    RAISE EXCEPTION 'is_pro can only be changed by the server (payment webhook)';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Funções de gatilho fora da API pública -------------------
REVOKE EXECUTE ON FUNCTION public.prevent_is_pro_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_free_task_limit()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_free_recurring_task() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_free_habit_limit()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_free_goal_limit()     FROM PUBLIC, anon, authenticated;

-- Só fazem sentido logado (já checam auth.uid()).
REVOKE EXECUTE ON FUNCTION public.sync_founder()             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;

-- 5. search_path fixo -----------------------------------------
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;
