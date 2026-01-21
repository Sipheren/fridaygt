-- CRITICAL COLUMN CASING FIX
-- Fixes ONLY the columns breaking Race entity queries
--
-- Run this in Supabase SQL Editor
--
-- Columns being renamed:
-- Race.trackid → trackId
-- RaceCar.createdat → createdAt
-- RaceCar.updatedat → updatedAt
-- RunListEntry.raceid → raceId

BEGIN;

-- Fix Race table
ALTER TABLE "Race" RENAME COLUMN "trackid" TO "trackId";

-- Fix RaceCar table
ALTER TABLE "RaceCar" RENAME COLUMN "createdat" TO "createdAt";
ALTER TABLE "RaceCar" RENAME COLUMN "updatedat" TO "updatedAt";

-- Fix RunListEntry table
ALTER TABLE "RunListEntry" RENAME COLUMN "raceid" TO "raceId";

COMMIT;

-- Verification query (run this to confirm the changes)
SELECT
  table_name,
  column_name,
  'OK - camelCase' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('Race', 'RaceCar', 'RunListEntry')
  AND column_name IN ('trackId', 'createdAt', 'updatedAt', 'raceId')
ORDER BY table_name, column_name;
