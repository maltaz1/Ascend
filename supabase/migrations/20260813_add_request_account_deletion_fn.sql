-- ============================================================
-- FIX: implement request_account_deletion() referenced in the
-- LGPD migration (20260730) but never created.
--
-- Deletes all rows of the requesting user (auth.uid()) from the
-- public data tables using SECURITY DEFINER so it works even if
-- a table's RLS policy does not grant DELETE to the owner.
--
-- IMPORTANT: auth.users CANNOT be removed without service_role,
-- so the frontend should prefer the `delete-account` Edge
-- Function (which deletes auth users and requires re-auth).
-- This function remains available as a fallback for data-only
-- deletion.
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.tasks WHERE user_id = v_user_id;
  DELETE FROM public.goals WHERE user_id = v_user_id;
  DELETE FROM public.habits WHERE user_id = v_user_id;
  DELETE FROM public.workouts WHERE user_id = v_user_id;
  DELETE FROM public.workout_sessions WHERE user_id = v_user_id;
  DELETE FROM public.meals WHERE user_id = v_user_id;
  DELETE FROM public.hydration_logs WHERE user_id = v_user_id;
  DELETE FROM public.diet_settings WHERE user_id = v_user_id;
  DELETE FROM public.financial_transactions WHERE user_id = v_user_id;
  DELETE FROM public.notes WHERE user_id = v_user_id;
  DELETE FROM public.note_folders WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Callable only by authenticated users (never anon or service triggers).
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM anon, public;
