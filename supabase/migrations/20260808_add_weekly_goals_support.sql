-- 20260808_add_weekly_goals_support.sql
-- Adiciona suporte a metas semanais na tabela `goals`
--
-- Novas colunas:
--   type                    text    | 'longo_prazo' (padrão) | 'semanal'
--   target_frequency        integer | quantas vezes por semana (ex: 4)
--   days_completed_week     jsonb   | array de 7 booleans [seg..dom], reseta a cada segunda-feira
--   streak                  integer | semanas consecutivas batendo a meta
--   record_streak           integer | melhor streak já alcançado
--   linked_habit_id         text    | (opcional) id de um hábito do módulo Habits
--   week_start              text    | data da segunda-feira da semana atual do controle (YYYY-MM-DD)

ALTER TABLE goals ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'longo_prazo';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_frequency integer;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS days_completed_week jsonb NOT NULL DEFAULT '[false,false,false,false,false,false,false]'::jsonb;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS record_streak integer NOT NULL DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS linked_habit_id text;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS week_start text;
