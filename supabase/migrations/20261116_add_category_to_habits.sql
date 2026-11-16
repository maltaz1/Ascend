-- Etiqueta de atributo (aba Eu) nos hábitos, igual à coluna que as tarefas já têm.
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS category text;
