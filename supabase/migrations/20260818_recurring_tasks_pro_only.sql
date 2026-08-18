-- Recurring tasks are now PRO-only.
-- Two enforcement points:
-- 1) enforce_free_recurring_task trigger: rejects INSERT of recurring tasks for non-PRO users.
-- 2) enforce_free_task_limit: unchanged (weekly count limit), updated in 20260818_update_free_task_limit_to_5.sql.

CREATE OR REPLACE FUNCTION public.enforce_free_recurring_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_is_pro boolean := false;
BEGIN
  -- Only new recurring tasks are blocked (existing recurring tasks from when they were PRO remain valid)
  IF NEW.is_recurring OR NEW.recurrence IS NOT NULL THEN
    SELECT COALESCE(p.is_pro, false) INTO v_is_pro
      FROM public.profiles p
      WHERE p.id = NEW.user_id;

    IF NOT v_is_pro THEN
      RAISE EXCEPTION 'pro_feature_limit: recurring tasks are only available on the Pro plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach the trigger to tasks table (drop first to be idempotent)
DROP TRIGGER IF EXISTS trig_enforce_free_recurring_task ON public.tasks;
CREATE TRIGGER trig_enforce_free_recurring_task
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_recurring_task();
