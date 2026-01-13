-- Fix remaining lowercase column names
-- Based on audit results from 2026-01-13
-- Only 4 columns across 3 tables need fixing

-- ============================================================================
-- RACE TABLE - Fix trackid column
-- ============================================================================

ALTER TABLE "Race" RENAME COLUMN "trackid" TO "trackId";

-- ============================================================================
-- RACECAR TABLE - Fix timestamp columns
-- ============================================================================

ALTER TABLE "RaceCar" RENAME COLUMN "createdat" TO "createdAt";
ALTER TABLE "RaceCar" RENAME COLUMN "updatedat" TO "updatedAt";

-- ============================================================================
-- RUNLISTENTRY TABLE - Fix raceid column
-- ============================================================================

ALTER TABLE "RunListEntry" RENAME COLUMN "raceid" TO "raceId";

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify Race table
SELECT
  'Race' as table_name,
  column_name,
  CASE
    WHEN column_name = lower(column_name) THEN 'STILL LOWERCASE'
    ELSE 'OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Race'
ORDER BY ordinal_position;

-- Verify RaceCar table
SELECT
  'RaceCar' as table_name,
  column_name,
  CASE
    WHEN column_name = lower(column_name) THEN 'STILL LOWERCASE'
    ELSE 'OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'RaceCar'
ORDER BY ordinal_position;

-- Verify RunListEntry table
SELECT
  'RunListEntry' as table_name,
  column_name,
  CASE
    WHEN column_name = lower(column_name) THEN 'STILL LOWERCASE'
    ELSE 'OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'RunListEntry'
ORDER BY ordinal_position;
