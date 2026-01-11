-- Add support for multiple cars per run list entry
-- Each entry can have multiple cars, each with an optional build

-- Create junction table for entry-car relationships with build
CREATE TABLE IF NOT EXISTS "RunListEntryCar" (
  "id" TEXT PRIMARY KEY,
  "runListEntryId" TEXT NOT NULL REFERENCES "RunListEntry"("id") ON DELETE CASCADE,
  "carId" TEXT NOT NULL REFERENCES "Car"("id") ON DELETE CASCADE,
  "buildId" TEXT REFERENCES "CarBuild"("id") ON DELETE SET NULL,
  "createdAt" TEXT NOT NULL DEFAULT (now()),
  "updatedAt" TEXT NOT NULL DEFAULT (now())
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "RunListEntryCar_runListEntryId_idx" ON "RunListEntryCar"("runListEntryId");
CREATE INDEX IF NOT EXISTS "RunListEntryCar_carId_idx" ON "RunListEntryCar"("carId");

-- Add unique constraint to prevent duplicate car entries per race entry
CREATE UNIQUE INDEX IF NOT EXISTS "RunListEntryCar_entry_car_unique" ON "RunListEntryCar"("runListEntryId", "carId");

-- Migrate existing data from RunListEntry to RunListEntryCar
INSERT INTO "RunListEntryCar" ("id", "runListEntryId", "carId", "buildId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "carId",
  "buildId",
  "createdAt",
  "updatedAt"
FROM "RunListEntry"
WHERE "carId" IS NOT NULL;

-- Now we can drop the old columns (optional - keeping them for now for backwards compatibility)
-- ALTER TABLE "RunListEntry" DROP COLUMN IF EXISTS "carId";
-- ALTER TABLE "RunListEntry" DROP COLUMN IF EXISTS "buildId";

-- Add comments
COMMENT ON TABLE "RunListEntryCar" IS 'Links run list entries to cars with optional builds';
COMMENT ON COLUMN "RunListEntryCar"."buildId" IS 'Optional build for this car in this race';
