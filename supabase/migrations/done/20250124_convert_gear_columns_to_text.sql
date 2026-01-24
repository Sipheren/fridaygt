-- Migration: Convert gear columns from numeric to text
-- This allows preserving leading/trailing zeros in gear ratios
-- Run this after 03_cleanup_gear_settings.sql

-- Alter gear columns from numeric to text
ALTER TABLE "CarBuild"
  ALTER COLUMN "finalDrive" TYPE text USING "finalDrive"::text,
  ALTER COLUMN "gear1" TYPE text USING "gear1"::text,
  ALTER COLUMN "gear2" TYPE text USING "gear2"::text,
  ALTER COLUMN "gear3" TYPE text USING "gear3"::text,
  ALTER COLUMN "gear4" TYPE text USING "gear4"::text,
  ALTER COLUMN "gear5" TYPE text USING "gear5"::text,
  ALTER COLUMN "gear6" TYPE text USING "gear6"::text,
  ALTER COLUMN "gear7" TYPE text USING "gear7"::text,
  ALTER COLUMN "gear8" TYPE text USING "gear8"::text,
  ALTER COLUMN "gear9" TYPE text USING "gear9"::text,
  ALTER COLUMN "gear10" TYPE text USING "gear10"::text,
  ALTER COLUMN "gear11" TYPE text USING "gear11"::text,
  ALTER COLUMN "gear12" TYPE text USING "gear12"::text,
  ALTER COLUMN "gear13" TYPE text USING "gear13"::text,
  ALTER COLUMN "gear14" TYPE text USING "gear14"::text,
  ALTER COLUMN "gear15" TYPE text USING "gear15"::text,
  ALTER COLUMN "gear16" TYPE text USING "gear16"::text,
  ALTER COLUMN "gear17" TYPE text USING "gear17"::text,
  ALTER COLUMN "gear18" TYPE text USING "gear18"::text,
  ALTER COLUMN "gear19" TYPE text USING "gear19"::text,
  ALTER COLUMN "gear20" TYPE text USING "gear20"::text;

-- Verification: Check column types
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'CarBuild'
  AND (column_name LIKE 'gear%' OR column_name = 'finalDrive')
ORDER BY column_name;
