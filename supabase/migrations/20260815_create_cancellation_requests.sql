-- Create cancellation_requests table
CREATE TABLE IF NOT EXISTS public.cancellation_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processed')),
    reason text,
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own cancellation requests" 
ON public.cancellation_requests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cancellation requests" 
ON public.cancellation_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cancellation requests" 
ON public.cancellation_requests FOR DELETE 
USING (auth.uid() = user_id);

-- Add cakto_subscription_id to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='cakto_subscription_id') THEN
        ALTER TABLE public.profiles ADD COLUMN cakto_subscription_id text;
    END IF;
END $$;

-- Webhook Function
CREATE OR REPLACE FUNCTION public.notify_cancellation_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _supabase_url text;
  _supabase_key text;
BEGIN
  -- Chaves de serviço nunca devem ficar hardcoded no código-fonte.
  -- O trigger usa a service role key injetada em runtime pelo Supabase
  -- Edge Runtime via Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  -- configurada no Dashboard > Settings > API (não precisa estar no repo).
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _supabase_key := current_setting('app.settings.supabase_key', true);

  IF _supabase_url IS NULL OR _supabase_key IS NULL THEN
    -- Fallback configurado via GUCs do Postgres (defina no dashboard do
    -- Supabase: Settings > Config, ou execute manualmente):
    --   ALTER DATABASE postgres SET app.settings.supabase_url = '...';
    --   ALTER DATABASE postgres SET app.settings.supabase_key = '...';
    _supabase_url := COALESCE(_supabase_url, 'https://rwdzcbbneczjefmjzkdr.supabase.co');
    _supabase_key := COALESCE(_supabase_key, '');
  END IF;

  IF _supabase_key = '' THEN
    -- Sem chave configurada: apenas registra o evento e retorna.
    RAISE LOG 'notify_cancellation_webhook: SUPABASE_KEY não configurado (GUC app.settings.supabase_key)';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-cancellation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _supabase_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS notify_cancellation_trigger ON public.cancellation_requests;
CREATE TRIGGER notify_cancellation_trigger
AFTER INSERT ON public.cancellation_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_cancellation_webhook();
