-- Adiciona os critérios SMART às metas de longo prazo.
-- Os campos permanecem opcionais no banco para preservar metas criadas antes desta migração;
-- a interface exige o preenchimento ao criar novas metas de longo prazo.
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS smart_specific text,
  ADD COLUMN IF NOT EXISTS smart_measurable text,
  ADD COLUMN IF NOT EXISTS smart_achievable text,
  ADD COLUMN IF NOT EXISTS smart_relevant text;

COMMENT ON COLUMN public.goals.smart_specific IS 'Descrição específica do objetivo: o que será alcançado, por quem e por que importa';
COMMENT ON COLUMN public.goals.smart_measurable IS 'Indicador ou número usado para medir o progresso da meta';
COMMENT ON COLUMN public.goals.smart_achievable IS 'Recursos, tempo e habilidades que tornam a meta atingível';
COMMENT ON COLUMN public.goals.smart_relevant IS 'Motivação e alinhamento da meta com as prioridades atuais';
COMMENT ON COLUMN public.goals.deadline IS 'Prazo (T de SMART) da meta de longo prazo';

