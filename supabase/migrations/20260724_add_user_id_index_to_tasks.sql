-- Migration: add index on user_id for tasks table
-- The tasks table was missing an index on user_id, causing full table scans
-- on every query. With recurring tasks multiplying the row count, this
-- became a critical performance bottleneck.
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

-- Also add indexes on recurrence-related columns used in queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON public.tasks(is_recurring);

-- Composite index for the most common query pattern: user_id + is_recurring + parent_id
CREATE INDEX IF NOT EXISTS idx_tasks_user_recurring ON public.tasks(user_id, is_recurring);
