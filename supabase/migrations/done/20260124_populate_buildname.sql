-- ============================================================================
-- Populate buildName for Existing Lap Times
-- ============================================================================
-- Purpose: Fill in buildName for existing lap times that have a build

-- Populate buildName for existing lap times that have a build
UPDATE "LapTime" lt
SET "buildName" = (
  SELECT cb.name
  FROM "CarBuild" cb
  WHERE cb.id = lt."buildId"
)
WHERE lt."buildId" IS NOT NULL
  AND lt."buildName" IS NULL;
