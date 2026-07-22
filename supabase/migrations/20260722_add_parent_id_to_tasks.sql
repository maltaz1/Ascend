-- Migration: add parent_id column to tasks table
-- parent_id links recurring occurrences to their parent task.
-- When the parent is deleted, all occurrences are cascaded.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);
