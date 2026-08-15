-- ============================================================
-- FIX (Crítico): trigger `trig_enforce_free_goal_limit` estava
-- bloqueando QUALQUER segunda meta no plano Free, porque o
-- limite total (v_goals_limit = 1) era verificado antes do
-- limite semanal, e metas semanais consumiam o "slot" total.
--
-- Nova regra (Free):
--   - Até 1 meta de longo prazo (type = 'longo_prazo' ou NULL)
--   - Até 2 metas semanais (type = 'semanal')
--   - Limites independentes entre si
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_free_goal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_is_pro boolean := false;
  v_long_term int := 0;
  v_weekly int := 0;
  v_long_term_limit int := 1;  -- metas de longo prazo para Free
  v_weekly_limit int := 2;     -- metas semanais para Free
  v_new_type text := COALESCE(NEW.type, 'longo_prazo');
BEGIN
  SELECT COALESCE(p.is_pro, false) INTO v_is_pro
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

  IF v_is_pro THEN RETURN NEW; END IF;

  -- Conta metas de longo prazo existentes (type 'longo_prazo' ou NULL),
  -- sem contar a própria linha sendo inserida (novo insert não tem id ainda).
  SELECT COUNT(*) INTO v_long_term
    FROM public.goals t
    WHERE t.user_id = NEW.user_id
      AND COALESCE(t.type, 'longo_prazo') = 'longo_prazo';

  SELECT COUNT(*) INTO v_weekly
    FROM public.goals t
    WHERE t.user_id = NEW.user_id
      AND t.type = 'semanal';

  IF v_new_type = 'semanal' AND v_weekly >= v_weekly_limit THEN
    RAISE EXCEPTION 'free_plan_limit: you have reached the weekly goals limit';
  END IF;

  IF v_new_type = 'longo_prazo' AND v_long_term >= v_long_term_limit THEN
    RAISE EXCEPTION 'free_plan_limit: you have reached the long-term goals limit';
  END IF;

  RETURN NEW;
END;
$$;
