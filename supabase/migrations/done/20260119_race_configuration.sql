-- Migration: Race Configuration and RaceCar Constraints
-- Date: 2026-01-19
-- Branch: buildfocussed
--
-- This migration adds race configuration (laps, weather) and updates RaceCar constraints
-- to support the build-centric race system

-- ============================================================================
-- Step 1: Add configuration columns to Race table
-- ============================================================================

ALTER TABLE "Race"
  ADD COLUMN IF NOT EXISTS "laps" INTEGER,
  ADD COLUMN IF NOT EXISTS "weather" VARCHAR(20);

-- Add indexes for querying by laps and weather
CREATE INDEX IF NOT EXISTS "Race_laps_idx" ON "Race"("laps");
CREATE INDEX IF NOT EXISTS "Race_weather_idx" ON "Race"("weather");

-- ============================================================================
-- Step 2: Make RaceCar.buildId NOT NULL
-- ============================================================================
-- This ensures that every car in a race must have a build

-- First, drop any existing NULL buildId entries (clean slate)
DELETE FROM "RaceCar" WHERE "buildId" IS NULL;

-- Make the column NOT NULL
ALTER TABLE "RaceCar"
  ALTER COLUMN "buildId" SET NOT NULL;

-- ============================================================================
-- Step 3: Remove unique constraint on carId (allow multiple builds per car)
-- ============================================================================

-- Drop the old unique constraint that prevented duplicate cars
DROP INDEX IF EXISTS "RaceCar_raceid_carid_key";

-- ============================================================================
-- Step 4: Add new unique constraint on buildId
-- ============================================================================
-- Each build can only be added once per race

CREATE UNIQUE INDEX IF NOT EXISTS "RaceCar_raceId_buildId_key"
  ON "RaceCar"("raceId", "buildId");

-- ============================================================================
-- Verification
-- ============================================================================

-- Check Race table has laps and weather columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'Race' AND column_name IN ('laps', 'weather');

-- Check RaceCar.buildId is NOT NULL
SELECT
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'RaceCar' AND column_name = 'buildId';

-- Check new unique constraint exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'racecar' AND indexname = 'RaceCar_raceId_buildId_key';

-- ============================================================================
-- Summary
-- ============================================================================
-- ✓ Added Race.laps column (INTEGER, nullable)
-- ✓ Added Race.weather column (VARCHAR(20), nullable)
-- ✓ Created indexes on Race.laps and Race.weather
-- ✓ Made RaceCar.buildId NOT NULL
-- ✓ Removed RaceCar_raceid_carid_key (allow duplicate cars)
-- ✓ Added RaceCar_raceId_buildId_key (each build once per race)
