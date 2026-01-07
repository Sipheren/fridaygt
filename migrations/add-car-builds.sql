-- Phase 5: Car Builds & Tuning Database Schema
-- This migration adds support for saving and sharing car builds/tunes

-- Car Builds (saved tunes)
CREATE TABLE IF NOT EXISTS "CarBuild" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "carId" UUID NOT NULL REFERENCES "Car"("id") ON DELETE CASCADE,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "isPublic" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Upgrades/Parts installed
CREATE TABLE IF NOT EXISTS "CarBuildUpgrade" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buildId" UUID NOT NULL REFERENCES "CarBuild"("id") ON DELETE CASCADE,
  "category" VARCHAR(50) NOT NULL,
  "part" VARCHAR(100) NOT NULL,
  "value" VARCHAR(100)
);

-- Tuning Settings (suspension, LSD, gears, etc.)
CREATE TABLE IF NOT EXISTS "CarBuildSetting" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buildId" UUID NOT NULL REFERENCES "CarBuild"("id") ON DELETE CASCADE,
  "category" VARCHAR(50) NOT NULL,
  "setting" VARCHAR(100) NOT NULL,
  "value" VARCHAR(100) NOT NULL
);

-- Add buildId to LapTime (optional - which build was used for this lap)
ALTER TABLE "LapTime" ADD COLUMN IF NOT EXISTS "buildId" UUID REFERENCES "CarBuild"("id") ON DELETE SET NULL;

-- Add buildId to RunListEntry (suggested build for this combo)
-- Note: RunListEntry will be created in Phase 6, this is for future compatibility
CREATE TABLE IF NOT EXISTS "RunListEntry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "runListId" UUID NOT NULL,
  "order" INTEGER NOT NULL,
  "trackId" UUID NOT NULL REFERENCES "Track"("id") ON DELETE CASCADE,
  "carId" UUID REFERENCES "Car"("id") ON DELETE SET NULL,
  "buildId" UUID REFERENCES "CarBuild"("id") ON DELETE SET NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_car_build_user" ON "CarBuild"("userId");
CREATE INDEX IF NOT EXISTS "idx_car_build_car" ON "CarBuild"("carId");
CREATE INDEX IF NOT EXISTS "idx_car_build_public" ON "CarBuild"("isPublic");
CREATE INDEX IF NOT EXISTS "idx_car_build_upgrade_build" ON "CarBuildUpgrade"("buildId");
CREATE INDEX IF NOT EXISTS "idx_car_build_setting_build" ON "CarBuildSetting"("buildId");
CREATE INDEX IF NOT EXISTS "idx_lap_time_build" ON "LapTime"("buildId");
