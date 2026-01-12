-- Migration: Create Race Entity Architecture
-- Date: 2026-01-12
-- FIXED: Using lowercase column names for PostgreSQL

-- ============================================================================
-- PART 1: Create Race Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Race" (
  id TEXT PRIMARY KEY,
  trackid TEXT NOT NULL REFERENCES "Track"(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  createdbyid TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  createdat TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedat TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Race_trackid_idx" ON "Race"("trackid");
CREATE INDEX IF NOT EXISTS "Race_createdbyid_idx" ON "Race"("createdbyid");

-- ============================================================================
-- PART 2: Create RaceCar Junction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "RaceCar" (
  id TEXT PRIMARY KEY,
  raceid TEXT NOT NULL,
  carid TEXT NOT NULL REFERENCES "Car"(id) ON DELETE CASCADE,
  buildid TEXT REFERENCES "CarBuild"(id) ON DELETE SET NULL,
  createdat TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedat TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RaceCar_raceid_fkey" FOREIGN KEY ("raceid") REFERENCES "Race"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RaceCar_raceid_carid_key" ON "RaceCar"("raceid", "carid");
CREATE INDEX IF NOT EXISTS "RaceCar_raceid_idx" ON "RaceCar"("raceid");
CREATE INDEX IF NOT EXISTS "RaceCar_carid_idx" ON "RaceCar"("carid");
CREATE INDEX IF NOT EXISTS "RaceCar_buildid_idx" ON "RaceCar"("buildid");

-- ============================================================================
-- PART 3: Add raceid to RunListEntry
-- ============================================================================

ALTER TABLE "RunListEntry" ADD COLUMN IF NOT EXISTS "raceid" TEXT;

-- ============================================================================
-- PART 4: Create Races from existing entries
-- ============================================================================

INSERT INTO "Race" (id, trackid, createdbyid, createdat, updatedat)
SELECT
  gen_random_uuid()::text,
  "trackId",
  (SELECT "createdById" FROM "RunList" WHERE id = "RunListEntry"."runListId" LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RunListEntry"
WHERE "trackId" IS NOT NULL
GROUP BY "trackId";

-- ============================================================================
-- PART 5: Migrate from RunListEntryCar (new system)
-- ============================================================================

INSERT INTO "RaceCar" (id, raceid, carid, buildid, createdat, updatedat)
SELECT
  gen_random_uuid()::text,
  r.id,
  ec."carId",
  ec."buildId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RunListEntry" re
INNER JOIN "RunListEntryCar" ec ON ec."runListEntryId" = re.id
INNER JOIN "Race" r ON r.trackid = re."trackId"
WHERE re."trackId" IS NOT NULL;

-- ============================================================================
-- PART 6: Migrate from legacy RunListEntry.carid (old system)
-- ============================================================================

INSERT INTO "RaceCar" (id, raceid, carid, buildid, createdat, updatedat)
SELECT
  gen_random_uuid()::text,
  r.id,
  re."carId",
  re."buildId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RunListEntry" re
INNER JOIN "Race" r ON r.trackid = re."trackId"
WHERE re."carId" IS NOT NULL
  AND re."trackId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "RunListEntryCar" ec
    WHERE ec."runListEntryId" = re.id
  );

-- ============================================================================
-- PART 7: Link RunListEntry to Race
-- ============================================================================

UPDATE "RunListEntry"
SET "raceid" = (
  SELECT r.id FROM "Race" r
  WHERE r.trackid = "RunListEntry"."trackId"
  LIMIT 1
)
WHERE "trackId" IS NOT NULL;

-- ============================================================================
-- PART 8: Add foreign key constraint
-- ============================================================================

ALTER TABLE "RunListEntry"
ADD CONSTRAINT "RunListEntry_raceid_fkey"
FOREIGN KEY ("raceid") REFERENCES "Race"("id") ON DELETE SET NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT COUNT(*) as race_count FROM "Race";
SELECT COUNT(*) as racecar_count FROM "RaceCar";
SELECT COUNT(*) as entries_with_race FROM "RunListEntry" WHERE "raceid" IS NOT NULL;
SELECT COUNT(*) as entries_without_race FROM "RunListEntry" WHERE "raceid" IS NULL;
