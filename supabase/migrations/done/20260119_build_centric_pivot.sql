-- Migration: Build-Centric Architecture Pivot
-- Date: 2026-01-19
-- Branch: buildfocussed
--
-- This migration makes builds the central entity of the application
-- All lap times must now be associated with a build

-- ============================================================================
-- Step 1: Delete orphaned lap times (no buildId)
-- ============================================================================
-- These lap times will be deleted as part of the pivot to build-centric model
DELETE FROM "LapTime"
WHERE "buildId" IS NULL;

-- ============================================================================
-- Step 2: Make LapTime.buildId REQUIRED (NOT NULL)
-- ============================================================================
-- First, drop any existing indexes that might reference buildId
DROP INDEX IF EXISTS "LapTime_buildId_idx";

-- Make the column NOT NULL
ALTER TABLE "LapTime"
  ALTER COLUMN "buildId" SET NOT NULL;

-- Re-create index for performance
CREATE INDEX "LapTime_buildId_idx" ON "LapTime"("buildId");

-- ============================================================================
-- Step 3: Simplify CarBuildUpgrade table (remove value column)
-- ============================================================================
-- The value column is not needed - parts are either installed (checked) or not
-- This makes the data model cleaner: presence of row = part is installed

-- First, drop any existing data in the value column (not needed)
UPDATE "CarBuildUpgrade" SET "value" = NULL WHERE "value" IS NOT NULL;

-- Remove the value column
ALTER TABLE "CarBuildUpgrade" DROP COLUMN IF EXISTS "value";

-- ============================================================================
-- Step 4: Add unique constraint to CarBuildUpgrade
-- ============================================================================
-- Ensure each part can only be added once per build
-- This is important since we're using row presence = installed

-- Drop existing unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CarBuildUpgrade_buildId_category_part_key'
  ) THEN
    ALTER TABLE "CarBuildUpgrade" DROP CONSTRAINT "CarBuildUpgrade_buildId_category_part_key";
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE "CarBuildUpgrade"
  ADD CONSTRAINT "CarBuildUpgrade_buildId_category_part_key"
  UNIQUE ("buildId", "category", "part");

-- ============================================================================
-- Step 5: Add unique constraint to CarBuildSetting
-- ============================================================================
-- Ensure each setting can only be added once per build

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CarBuildSetting_buildId_category_setting_key'
  ) THEN
    ALTER TABLE "CarBuildSetting" DROP CONSTRAINT "CarBuildSetting_buildId_category_setting_key";
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE "CarBuildSetting"
  ADD CONSTRAINT "CarBuildSetting_buildId_category_setting_key"
  UNIQUE ("buildId", "category", "setting");

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify the changes

-- Check that LapTime.buildId is NOT NULL
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'LapTime' AND column_name = 'buildId';

-- Check that CarBuildUpgrade has no value column
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'CarBuildUpgrade' AND column_name = 'value';

-- Count remaining lap times (should all have buildId now)
SELECT COUNT(*) as total_lap_times,
       COUNT(CASE WHEN "buildId" IS NOT NULL THEN 1 END) as with_build_id
FROM "LapTime";

-- ============================================================================
-- Summary
-- ============================================================================
-- ✓ Deleted orphaned lap times (no buildId)
-- ✓ Made LapTime.buildId NOT NULL (required)
-- ✓ Removed CarBuildUpgrade.value column (checkboxes only)
-- ✓ Added unique constraints to prevent duplicate parts/settings per build
-- ✓ Builds are now the central, required entity for all lap times
