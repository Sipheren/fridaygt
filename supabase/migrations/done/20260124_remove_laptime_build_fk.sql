-- ============================================================================
-- Remove LapTime.buildId Foreign Key Constraint
-- ============================================================================
-- Issue: LapTime.buildId has a foreign key to CarBuild which prevents deletion
-- Solution: Remove the foreign key constraint entirely
--
-- buildId is now just a reference field (snapshot of which build was used)
-- If a build is deleted, lap times keep their buildId for historical reference

-- Drop the foreign key constraint
ALTER TABLE "LapTime" DROP CONSTRAINT IF EXISTS "LapTime_buildId_fkey";

-- The buildId column remains as a plain UUID field with no foreign key
-- This allows builds to be deleted without affecting lap times
