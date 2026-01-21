-- Migration: Add Parts and Tuning Settings Tables
-- Date: 2026-01-21
-- Description: Create tables for parts shop categories, parts, tuning sections, and settings
--              Add foreign key relationships to CarBuildUpgrade and CarBuildSetting

-- ============================================================================
-- PART 1: Create New Tables
-- ============================================================================

-- Parts Shop Categories
CREATE TABLE IF NOT EXISTS "PartCategory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(50) NOT NULL UNIQUE,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Individual Parts
CREATE TABLE IF NOT EXISTS "Part" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId" UUID NOT NULL REFERENCES "PartCategory"("id") ON DELETE RESTRICT,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("categoryId", "name")
);

-- Tuning Setting Sections
CREATE TABLE IF NOT EXISTS "TuningSection" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(50) NOT NULL UNIQUE,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Individual Tuning Settings
CREATE TABLE IF NOT EXISTS "TuningSetting" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sectionId" UUID NOT NULL REFERENCES "TuningSection"("id") ON DELETE RESTRICT,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "defaultValue" VARCHAR(100),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("sectionId", "name")
);

-- ============================================================================
-- PART 2: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS "Part_categoryId_idx" ON "Part"("categoryId");
CREATE INDEX IF NOT EXISTS "Part_name_idx" ON "Part"("name");
CREATE INDEX IF NOT EXISTS "Part_isActive_idx" ON "Part"("isActive");

CREATE INDEX IF NOT EXISTS "TuningSetting_sectionId_idx" ON "TuningSetting"("sectionId");
CREATE INDEX IF NOT EXISTS "TuningSetting_name_idx" ON "TuningSetting"("name");
CREATE INDEX IF NOT EXISTS "TuningSetting_isActive_idx" ON "TuningSetting"("isActive");

-- ============================================================================
-- PART 3: Add Foreign Key Columns to Existing Tables (Nullable First)
-- ============================================================================

-- Add partId to CarBuildUpgrade (nullable for migration)
ALTER TABLE "CarBuildUpgrade"
  ADD COLUMN IF NOT EXISTS "partId" UUID REFERENCES "Part"("id");

-- Add settingId to CarBuildSetting (nullable for migration)
ALTER TABLE "CarBuildSetting"
  ADD COLUMN IF NOT EXISTS "settingId" UUID REFERENCES "TuningSetting"("id");

-- Create indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS "CarBuildUpgrade_partId_idx" ON "CarBuildUpgrade"("partId");
CREATE INDEX IF NOT EXISTS "CarBuildSetting_settingId_idx" ON "CarBuildSetting"("settingId");

-- ============================================================================
-- PART 4: Enable Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE "PartCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Part" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TuningSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TuningSetting" ENABLE ROW LEVEL SECURITY;

-- RLS Policies: PartCategory (read-only for all users)
CREATE POLICY "Allow read access to PartCategory"
  ON "PartCategory" FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to PartCategory"
  ON "PartCategory" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to PartCategory"
  ON "PartCategory" FOR UPDATE
  USING (true);

CREATE POLICY "Allow delete to PartCategory"
  ON "PartCategory" FOR DELETE
  USING (true);

-- RLS Policies: Part (read-only for all users)
CREATE POLICY "Allow read access to Part"
  ON "Part" FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to Part"
  ON "Part" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to Part"
  ON "Part" FOR UPDATE
  USING (true);

CREATE POLICY "Allow delete to Part"
  ON "Part" FOR DELETE
  USING (true);

-- RLS Policies: TuningSection (read-only for all users)
CREATE POLICY "Allow read access to TuningSection"
  ON "TuningSection" FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to TuningSection"
  ON "TuningSection" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to TuningSection"
  ON "TuningSection" FOR UPDATE
  USING (true);

CREATE POLICY "Allow delete to TuningSection"
  ON "TuningSection" FOR DELETE
  USING (true);

-- RLS Policies: TuningSetting (read-only for all users)
CREATE POLICY "Allow read access to TuningSetting"
  ON "TuningSetting" FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to TuningSetting"
  ON "TuningSetting" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to TuningSetting"
  ON "TuningSetting" FOR UPDATE
  USING (true);

CREATE POLICY "Allow delete to TuningSetting"
  ON "TuningSetting" FOR DELETE
  USING (true);

-- ============================================================================
-- PART 5: Add Helper Functions for Updated At
-- ============================================================================

-- Function to update updatedAt timestamp on PartCategory
CREATE OR REPLACE FUNCTION update_part_category_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER PartCategory_updated_at
  BEFORE UPDATE ON "PartCategory"
  FOR EACH ROW
  EXECUTE FUNCTION update_part_category_updated_at();

-- Function to update updatedAt timestamp on Part
CREATE OR REPLACE FUNCTION update_part_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER Part_updated_at
  BEFORE UPDATE ON "Part"
  FOR EACH ROW
  EXECUTE FUNCTION update_part_updated_at();

-- Function to update updatedAt timestamp on TuningSection
CREATE OR REPLACE FUNCTION update_tuning_section_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER TuningSection_updated_at
  BEFORE UPDATE ON "TuningSection"
  FOR EACH ROW
  EXECUTE FUNCTION update_tuning_section_updated_at();

-- Function to update updatedAt timestamp on TuningSetting
CREATE OR REPLACE FUNCTION update_tuning_setting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER TuningSetting_updated_at
  BEFORE UPDATE ON "TuningSetting"
  FOR EACH ROW
  EXECUTE FUNCTION update_tuning_setting_updated_at();

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After running the data migration script (migrate-parts-to-db.ts),
-- you will need to run the following commands to finalize the migration:
--
-- 1. Verify data migration was successful:
--    SELECT 'Parts' as source, COUNT(*) FROM "Part"
--    UNION ALL
--    SELECT 'TuningSettings', COUNT(*) FROM "TuningSetting"
--    UNION ALL
--    SELECT 'CarBuildUpgrade with partId', COUNT(*) FROM "CarBuildUpgrade" WHERE "partId" IS NOT NULL
--    UNION ALL
--    SELECT 'CarBuildSetting with settingId', COUNT(*) FROM "CarBuildSetting" WHERE "settingId" IS NOT NULL;
--
-- 2. If migration looks good, make columns NOT NULL and add constraints:
--    (See finalize-migration.sql for these commands)
--
-- 3. After finalization, consider making old columns nullable or dropping them:
--    ALTER TABLE "CarBuildUpgrade" ALTER COLUMN "category" DROP NULL;
--    ALTER TABLE "CarBuildUpgrade" ALTER COLUMN "part" DROP NULL;
--    ALTER TABLE "CarBuildSetting" ALTER COLUMN "category" DROP NULL;
--    ALTER TABLE "CarBuildSetting" ALTER COLUMN "setting" DROP NULL;
