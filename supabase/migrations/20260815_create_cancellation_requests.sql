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
BEGIN
  PERFORM net.http_post(
    url := 'https://rwdzcbbneczjefmjzkdr.supabase.co/functions/v1/notify-cancellation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3ZHpjYmJuZWN6amVmbWp6a2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTE1NjMsImV4cCI6MjA5MzA2NzU2M30.O5PHKNZvSFTWdzGNPnNmWR9-THZBrjwyn3AbD6TWJn0'
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
