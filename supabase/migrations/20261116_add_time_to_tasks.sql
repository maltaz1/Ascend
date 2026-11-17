-- Horário opcional das tarefas ("HH:MM"). Coluna opcional: o web continua funcionando sem ela.
alter table public.tasks add column if not exists "time" text;
