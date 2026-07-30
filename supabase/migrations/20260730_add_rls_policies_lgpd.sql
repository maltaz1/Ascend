-- ============================================================
-- Migration: Row Level Security (RLS) para todas as tabelas
-- Data: 2026-07-30
-- Propósito: Conformidade LGPD - garantir isolamento de dados
-- ============================================================

-- ── 1. Habilitar RLS em todas as tabelas ────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cakto_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- ── 2. Políticas RLS ────────────────────────────────────────

-- PROFILES: usuário só pode ver/editar seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- TASKS: usuário só pode ver/editar suas próprias tarefas
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- GOALS: usuário só pode ver/editar suas próprias metas
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- HABITS: usuário só pode ver/editar seus próprios hábitos
CREATE POLICY "Users can view own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- WORKOUTS: usuário só pode ver/editar seus próprios treinos
CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- WORKOUT_SESSIONS: usuário só pode ver/editar suas próprias sessões
CREATE POLICY "Users can view own workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sessions"
  ON public.workout_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sessions"
  ON public.workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- MEALS: usuário só pode ver/editar suas próprias refeições
CREATE POLICY "Users can view own meals"
  ON public.meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals"
  ON public.meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals"
  ON public.meals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals"
  ON public.meals FOR DELETE
  USING (auth.uid() = user_id);

-- HYDRATION_LOGS: usuário só pode ver/editar seus próprios registros
CREATE POLICY "Users can view own hydration"
  ON public.hydration_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hydration"
  ON public.hydration_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hydration"
  ON public.hydration_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hydration"
  ON public.hydration_logs FOR DELETE
  USING (auth.uid() = user_id);

-- DIET_SETTINGS: usuário só pode ver/editar suas próprias configurações
CREATE POLICY "Users can view own diet settings"
  ON public.diet_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diet settings"
  ON public.diet_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diet settings"
  ON public.diet_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diet settings"
  ON public.diet_settings FOR DELETE
  USING (auth.uid() = user_id);

-- FINANCIAL_TRANSACTIONS: usuário só pode ver/editar suas próprias transações
CREATE POLICY "Users can view own transactions"
  ON public.financial_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.financial_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.financial_transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.financial_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- NOTES: usuário só pode ver/editar suas próprias notas
CREATE POLICY "Users can view own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- NOTE_FOLDERS: usuário só pode ver/editar suas próprias pastas
CREATE POLICY "Users can view own note folders"
  ON public.note_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own note folders"
  ON public.note_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own note folders"
  ON public.note_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own note folders"
  ON public.note_folders FOR DELETE
  USING (auth.uid() = user_id);

-- CAKTO_WEBHOOK_EVENTS: apenas leitura via Service Role (admin)
-- Bloqueia acesso direto de usuários comuns
CREATE POLICY "Webhook events are admin-only"
  ON public.cakto_webhook_events FOR ALL
  USING (false);

-- WORKOUT_EXERCISES: usuário só pode ver/editar seus próprios exercícios
CREATE POLICY "Users can view own workout exercises"
  ON public.workout_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout exercises"
  ON public.workout_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout exercises"
  ON public.workout_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout exercises"
  ON public.workout_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. Coluna de consentimento no perfil ────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;

-- ── 4. Função para exclusão completa de conta (via Service Role) ──

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Excluir dados de todas as tabelas do usuário
  DELETE FROM public.tasks WHERE user_id = v_user_id;
  DELETE FROM public.goals WHERE user_id = v_user_id;
  DELETE FROM public.habits WHERE user_id = v_user_id;
  DELETE FROM public.workout_sessions WHERE user_id = v_user_id;
  DELETE FROM public.workouts WHERE user_id = v_user_id;
  DELETE FROM public.meals WHERE user_id = v_user_id;
  DELETE FROM public.hydration_logs WHERE user_id = v_user_id;
  DELETE FROM public.diet_settings WHERE user_id = v_user_id;
  DELETE FROM public.financial_transactions WHERE user_id = v_user_id;
  DELETE FROM public.notes WHERE user_id = v_user_id;
  DELETE FROM public.note_folders WHERE user_id = v_user_id;
  DELETE FROM public.workout_exercises WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Storage: Política de acesso ao bucket Avatars ─────────

-- Garantir que o bucket Avatars existe e tem RLS habilitado
INSERT INTO storage.buckets (id, name, public)
VALUES ('Avatars', 'Avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view own avatar"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Avatars' AND auth.uid()::text = (storage.foldername(name))[1]::text);

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'Avatars' AND auth.uid()::text = (storage.foldername(name))[1]::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'Avatars' AND auth.uid()::text = (storage.foldername(name))[1]::text);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'Avatars' AND auth.uid()::text = (storage.foldername(name))[1]::text);
