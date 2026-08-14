-- ============================================================
-- FIX (Crítico): Enforce plan limits server-side + block is_pro
-- self-escalation via REST.
--
-- 1. BEFORE UPDATE trigger on profiles: rejects any change of
--    is_pro made by anyone other than service_role (e.g. direct
--    REST PATCH from an authenticated client).
-- 2. BEFORE INSERT trigger on tasks: free users may have at most
--    tasksPerWeek (1) tasks per ISO week.
-- 3. BEFORE INSERT trigger on habits: free users may have at most
--    FREE_HABITS (3) habits total.
-- 4. BEFORE INSERT trigger on goals: free users may have at most
--    FREE_GOALS (1) goals, and at most FREE_WEEKLY_GOALS (2)
--    weekly-type goals.
--
-- All checks are bypassed for service_role (used by the Cakto
-- webhook and admin operations), so existing server-side flows
-- keep working.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_is_pro_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Only service_role may change is_pro (Cakto webhook, admin).
  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
     AND current_setting('role') <> 'service_role' THEN
    RAISE EXCEPTION 'is_pro can only be changed by the server (payment webhook)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_free_task_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_is_pro boolean := false;
  v_week_count int := 0;
  v_limit int := 1; -- tasksPerWeek for Free plan
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
$$;

CREATE OR REPLACE FUNCTION public.enforce_free_habit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_is_pro boolean := false;
  v_count int := 0;
  v_limit int := 3; -- habits limit for Free plan
BEGIN
  SELECT COALESCE(p.is_pro, false) INTO v_is_pro
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

  IF v_is_pro THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.habits t
    WHERE t.user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'free_plan_limit: you have reached the habits limit';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_free_goal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_is_pro boolean := false;
  v_goals int := 0;
  v_weekly int := 0;
  v_goals_limit int := 1;      -- total goals for Free plan
  v_weekly_limit int := 2;     -- weekly goals for Free plan
BEGIN
  SELECT COALESCE(p.is_pro, false) INTO v_is_pro
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

  IF v_is_pro THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_goals
    FROM public.goals t
    WHERE t.user_id = NEW.user_id;

  SELECT COUNT(*) INTO v_weekly
    FROM public.goals t
    WHERE t.user_id = NEW.user_id
      AND t.type = 'weekly';

  IF v_goals >= v_goals_limit THEN
    RAISE EXCEPTION 'free_plan_limit: you have reached the goals limit';
  END IF;

  IF v_weekly >= v_weekly_limit THEN
    RAISE EXCEPTION 'free_plan_limit: you have reached the weekly goals limit';
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers (idempotent: drop first if they already exist).
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trig_prevent_is_pro_escalation ON public.profiles;
  DROP TRIGGER IF EXISTS trig_enforce_free_task_limit ON public.tasks;
  DROP TRIGGER IF EXISTS trig_enforce_free_habit_limit ON public.habits;
  DROP TRIGGER IF EXISTS trig_enforce_free_goal_limit ON public.goals;
END $$;

CREATE TRIGGER trig_prevent_is_pro_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_is_pro_escalation();

CREATE TRIGGER trig_enforce_free_task_limit
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_free_task_limit();

CREATE TRIGGER trig_enforce_free_habit_limit
  BEFORE INSERT ON public.habits
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_free_habit_limit();

CREATE TRIGGER trig_enforce_free_goal_limit
  BEFORE INSERT ON public.goals
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_free_goal_limit();
