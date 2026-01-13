-- Fix Race and RaceCar table column naming to use camelCase
--
-- This migration aligns the Race/RaceCar tables with the rest of the database
-- which uses camelCase for column names (e.g., createdAt, trackId, carId)
--
-- Created: 2026-01-13
-- Author: David Hawkins
--
-- Safety notes:
-- - ALTER TABLE RENAME COLUMN is instant and safe
-- - Automatically updates foreign keys, indexes, and constraints
-- - No data loss
-- - Reversible (see rollback section below)

-- ============================================================================
-- RACE TABLE
-- ============================================================================

-- Rename timestamp columns
ALTER TABLE "Race" RENAME COLUMN "createdat" TO "createdAt";
ALTER TABLE "Race" RENAME COLUMN "updatedat" TO "updatedAt";

-- Rename foreign key columns
ALTER TABLE "Race" RENAME COLUMN "createdbyid" TO "createdById";

-- Add comments for documentation
COMMENT ON COLUMN "Race"."createdAt" IS 'Timestamp when race was created';
COMMENT ON COLUMN "Race"."updatedAt" IS 'Timestamp when race was last updated';
COMMENT ON COLUMN "Race"."createdById" IS 'ID of user who created the race';

-- ============================================================================
-- RACECAR TABLE
-- ============================================================================

-- Rename foreign key columns
ALTER TABLE "RaceCar" RENAME COLUMN "carid" TO "carId";
ALTER TABLE "RaceCar" RENAME COLUMN "buildid" TO "buildId";
ALTER TABLE "RaceCar" RENAME COLUMN "raceid" TO "raceId";

-- Add comments for documentation
COMMENT ON COLUMN "RaceCar"."carId" IS 'ID of the car';
COMMENT ON COLUMN "RaceCar"."buildId" IS 'ID of the car build (optional)';
COMMENT ON COLUMN "RaceCar"."raceId" IS 'ID of the race';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration, run:
--
-- ALTER TABLE "Race" RENAME COLUMN "createdAt" TO "createdat";
-- ALTER TABLE "Race" RENAME COLUMN "updatedAt" TO "updatedat";
-- ALTER TABLE "Race" RENAME COLUMN "createdById" TO "createdbyid";
--
-- ALTER TABLE "RaceCar" RENAME COLUMN "carId" TO "carid";
-- ALTER TABLE "RaceCar" RENAME COLUMN "buildId" TO "buildid";
-- ALTER TABLE "RaceCar" RENAME COLUMN "raceId" TO "raceid";
-- ============================================================================
