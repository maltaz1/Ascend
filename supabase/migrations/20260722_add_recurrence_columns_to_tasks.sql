-- Migration: add recurrence columns to tasks table
-- Adds support for recurring tasks by storing recurrence configuration as JSONB

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence jsonb;

-- recurrence column stores the RecurrenceConfig object:
-- {
--   "type": "never" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom",
--   "status": "active" | "paused",
--   "interval": number,
--   "intervalUnit": "days" | "weeks" | "months" | "years",
--   "daysOfWeek": number[],
--   "endType": "never" | "after_occurrences" | "on_date",
--   "occurrences": number,
--   "endDate": string
-- }
