-- Update free plan weekly task limit from 1 to 5
-- Mirrors FREE_LIMITS.tasksPerWeek = 5 in client/src/config/planLimits.ts (PR #9)

CREATE OR REPLACE FUNCTION public.enforce_free_task_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_is_pro boolean := false;
  v_week_count int := 0;
  v_limit int := 5; -- tasksPerWeek for Free plan
BEGIN
  SELECT COALESCE(p.is_pro, false) INTO v_is_pro
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

  IF v_is_pro THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_week_count
    FROM public.tasks t
    WHERE t.user_id = NEW.user_id
      AND date_trunc('week', t.date) = date_trunc('week', COALESCE(NEW.date, CURRENT_DATE));

  IF v_week_count >= v_limit THEN
    RAISE EXCEPTION 'free_plan_limit: you have reached the weekly task limit';
  END IF;
  RETURN NEW;
END;
$function$;
