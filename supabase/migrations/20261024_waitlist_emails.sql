-- ============================================================
-- E-mails da lista de espera.
--
-- welcome_sent_at: e-mail de boas-vindas (função waitlist-welcome,
--   disparada pelo trigger abaixo a cada cadastro novo).
-- launch_sent_at: e-mail de lançamento (função waitlist-launch,
--   chamada manualmente no dia do lançamento).
-- unsubscribed_at: a pessoa clicou em "não quero mais e-mails"
--   (link com unsubscribe_token, tratado pela página /lista?sair=).
-- ============================================================

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS unsubscribed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_sent_at   timestamptz,
  ADD COLUMN IF NOT EXISTS launch_sent_at    timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_unsubscribe_token_idx
  ON public.waitlist (unsubscribe_token);

-- Descadastro público pelo link do e-mail. Devolve true se achou o token.
CREATE OR REPLACE FUNCTION public.waitlist_unsubscribe(p_token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH updated AS (
    UPDATE public.waitlist
    SET unsubscribed_at = coalesce(unsubscribed_at, now())
    WHERE unsubscribe_token = p_token
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

GRANT EXECUTE ON FUNCTION public.waitlist_unsubscribe(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waitlist_unsubscribe(uuid) FROM public;

-- Dispara o e-mail de boas-vindas depois de cada cadastro.
-- Mesmo padrão de notify_cancellation_webhook: pg_net, sem travar o insert
-- se a chamada falhar. A função só envia para quem ainda não recebeu.
CREATE OR REPLACE FUNCTION public.waitlist_welcome_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://rwdzcbbneczjefmjzkdr.supabase.co/functions/v1/waitlist-welcome',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('code', NEW.referral_code)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.waitlist_welcome_webhook() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS waitlist_welcome_after_insert ON public.waitlist;
CREATE TRIGGER waitlist_welcome_after_insert
  AFTER INSERT ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.waitlist_welcome_webhook();
