-- ============================================================
-- Lista de espera do lançamento (página pública /lista).
--
-- A tabela não tem políticas de RLS: ninguém lê ou escreve nela
-- direto pelo client. O acesso público (anon) é só pelas funções
-- SECURITY DEFINER abaixo, que nunca devolvem e-mails.
--
-- Posição na fila: ordem de cadastro, e cada indicação que entra
-- pelo link da pessoa sobe ela 5 posições. O número de fundador
-- (o do selo) é fixo: a ordem de cadastro.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  email         text NOT NULL UNIQUE,
  name          text,
  referral_code text NOT NULL UNIQUE,
  referred_by   text REFERENCES public.waitlist (referral_code) ON DELETE SET NULL,
  source        text,
  consent_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_referred_by_idx ON public.waitlist (referred_by);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Status público de uma pessoa da lista (sem e-mail). Uso interno.
CREATE OR REPLACE FUNCTION public._waitlist_status_by_code(p_code text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH refs AS (
    SELECT referred_by AS code, count(*) AS n
    FROM public.waitlist
    WHERE referred_by IS NOT NULL
    GROUP BY referred_by
  ),
  ranked AS (
    SELECT
      w.referral_code,
      w.name,
      coalesce(r.n, 0) AS referrals,
      row_number() OVER (ORDER BY w.seq) AS founder_number,
      row_number() OVER (ORDER BY w.seq - 5 * coalesce(r.n, 0), w.seq) AS position
    FROM public.waitlist w
    LEFT JOIN refs r ON r.code = w.referral_code
  )
  SELECT json_build_object(
    'code', referral_code,
    'name', name,
    'position', position,
    'referrals', referrals,
    'founder_number', founder_number,
    'total', (SELECT count(*) FROM public.waitlist)
  )
  FROM ranked
  WHERE referral_code = p_code;
$$;

CREATE OR REPLACE FUNCTION public.join_waitlist(
  p_email  text,
  p_name   text DEFAULT NULL,
  p_ref    text DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_email    text := lower(trim(p_email));
  v_name     text := nullif(left(trim(coalesce(p_name, '')), 80), '');
  v_ref      text := upper(trim(coalesce(p_ref, '')));
  v_code     text;
  v_existing text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  IF v_email IS NULL OR length(v_email) > 254
     OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  SELECT referral_code INTO v_existing FROM public.waitlist WHERE email = v_email;
  IF v_existing IS NOT NULL THEN
    RETURN (public._waitlist_status_by_code(v_existing)::jsonb || '{"already": true}')::json;
  END IF;

  IF v_ref = '' OR NOT EXISTS (SELECT 1 FROM public.waitlist WHERE referral_code = v_ref) THEN
    v_ref := NULL;
  END IF;

  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.waitlist WHERE referral_code = v_code);
  END LOOP;

  INSERT INTO public.waitlist (email, name, referral_code, referred_by, source)
  VALUES (v_email, v_name, v_code, v_ref, nullif(left(trim(coalesce(p_source, '')), 60), ''))
  ON CONFLICT (email) DO NOTHING;

  -- Dois envios simultâneos do mesmo e-mail: devolve o cadastro que ficou.
  IF NOT FOUND THEN
    SELECT referral_code INTO v_existing FROM public.waitlist WHERE email = v_email;
    RETURN (public._waitlist_status_by_code(v_existing)::jsonb || '{"already": true}')::json;
  END IF;

  RETURN (public._waitlist_status_by_code(v_code)::jsonb || '{"already": false}')::json;
END;
$$;

CREATE OR REPLACE FUNCTION public.waitlist_status(p_code text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT public._waitlist_status_by_code(upper(trim(p_code)));
$$;

CREATE OR REPLACE FUNCTION public.waitlist_total()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT count(*) FROM public.waitlist;
$$;

REVOKE ALL ON TABLE public.waitlist FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._waitlist_status_by_code(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_total() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.join_waitlist(text, text, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.waitlist_status(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.waitlist_total() FROM public;
