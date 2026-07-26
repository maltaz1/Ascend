-- Migration: add exceptions field to recurrence configuration
-- This allows tracking which dates have been excluded from a recurring task
-- The exceptions are stored as an array of YYYY-MM-DD strings within the recurrence JSONB

-- Note: This migration is informational. The exceptions field is already part of the 
-- RecurrenceConfig interface and will be stored in the existing recurrence JSONB column.
-- No schema changes are needed as JSONB is flexible and can accommodate new fields.

-- Example of updated recurrence structure:
-- {
--   "type": "daily",
--   "status": "active",
--   "endType": "never",
--   "exceptions": ["2026-07-25", "2026-07-26"]
-- }

-- This ensures that when a user deletes a single occurrence, the date is recorded
-- and the automatic generation will skip that date in the future.
