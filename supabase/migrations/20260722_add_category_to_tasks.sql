-- Migration: add category column to tasks table
-- The category column was referenced in the app code but missing from the schema

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category text;
