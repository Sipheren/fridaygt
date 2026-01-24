-- Migration 01: Add gear columns to CarBuild table
-- Run this first to add the new columns

ALTER TABLE "CarBuild"
  ADD COLUMN IF NOT EXISTS "finalDrive" numeric,
  ADD COLUMN IF NOT EXISTS "gear1" numeric,
  ADD COLUMN IF NOT EXISTS "gear2" numeric,
  ADD COLUMN IF NOT EXISTS "gear3" numeric,
  ADD COLUMN IF NOT EXISTS "gear4" numeric,
  ADD COLUMN IF NOT EXISTS "gear5" numeric,
  ADD COLUMN IF NOT EXISTS "gear6" numeric,
  ADD COLUMN IF NOT EXISTS "gear7" numeric,
  ADD COLUMN IF NOT EXISTS "gear8" numeric,
  ADD COLUMN IF NOT EXISTS "gear9" numeric,
  ADD COLUMN IF NOT EXISTS "gear10" numeric,
  ADD COLUMN IF NOT EXISTS "gear11" numeric,
  ADD COLUMN IF NOT EXISTS "gear12" numeric,
  ADD COLUMN IF NOT EXISTS "gear13" numeric,
  ADD COLUMN IF NOT EXISTS "gear14" numeric,
  ADD COLUMN IF NOT EXISTS "gear15" numeric,
  ADD COLUMN IF NOT EXISTS "gear16" numeric,
  ADD COLUMN IF NOT EXISTS "gear17" numeric,
  ADD COLUMN IF NOT EXISTS "gear18" numeric,
  ADD COLUMN IF NOT EXISTS "gear19" numeric,
  ADD COLUMN IF NOT EXISTS "gear20" numeric;

-- Verify columns were added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'CarBuild'
  AND column_name LIKE '%gear%'
  OR column_name = 'finalDrive'
ORDER BY column_name;
