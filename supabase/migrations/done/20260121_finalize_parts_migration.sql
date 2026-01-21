-- Finalization: Parts and Tuning Settings Migration
-- Date: 2026-01-21
-- Description: Make foreign key columns NOT NULL and add constraints
--
-- RUN THIS AFTER: scripts/migrate-parts-to-db.ts has successfully completed
--
-- This script assumes that all existing CarBuildUpgrade and CarBuildSetting
-- records have been successfully migrated to use partId and settingId.

-- ============================================================================
-- PRE-RUN VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_total_upgrades INTEGER;
  v_migrated_upgrades INTEGER;
  v_total_settings INTEGER;
  v_migrated_settings INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_upgrades FROM "CarBuildUpgrade";
  SELECT COUNT(*) INTO v_migrated_upgrades FROM "CarBuildUpgrade" WHERE "partId" IS NOT NULL;

  SELECT COUNT(*) INTO v_total_settings FROM "CarBuildSetting";
  SELECT COUNT(*) INTO v_migrated_settings FROM "CarBuildSetting" WHERE "settingId" IS NOT NULL;

  RAISE NOTICE '=== Migration Status ===';
  RAISE NOTICE 'CarBuildUpgrade: % / % migrated', v_migrated_upgrades, v_total_upgrades;
  RAISE NOTICE 'CarBuildSetting: % / % migrated', v_migrated_settings, v_total_settings;

  -- Warn if not all records are migrated
  IF v_migrated_upgrades < v_total_upgrades THEN
    RAISE WARNING 'Not all CarBuildUpgrade records have been migrated. % records missing partId.', v_total_upgrades - v_migrated_upgrades;
  END IF;

  IF v_migrated_settings < v_total_settings THEN
    RAISE WARNING 'Not all CarBuildSetting records have been migrated. % records missing settingId.', v_total_settings - v_migrated_settings;
  END IF;

  -- Stop if there are records that would fail the NOT NULL constraint
  IF (v_total_upgrades > 0 AND v_migrated_upgrades = 0) OR (v_total_settings > 0 AND v_migrated_settings = 0) THEN
    RAISE EXCEPTION 'Cannot proceed. No records have been migrated. Please run the migration script first.';
  END IF;
END $$;

-- ============================================================================
-- STEP 1: Back up data (optional, but recommended)
-- ============================================================================

DROP TABLE IF EXISTS "CarBuildUpgrade_backup";
DROP TABLE IF EXISTS "CarBuildSetting_backup";

CREATE TABLE "CarBuildUpgrade_backup" AS
SELECT * FROM "CarBuildUpgrade";

CREATE TABLE "CarBuildSetting_backup" AS
SELECT * FROM "CarBuildSetting";

DO $$
BEGIN
  RAISE NOTICE 'Created backup tables';
END $$;

-- ============================================================================
-- STEP 2: Add constraints (only for records that have partId/settingId)
-- ============================================================================

-- Check for any records without partId and delete them
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "CarBuildUpgrade" WHERE "partId" IS NULL;

  IF v_count > 0 THEN
    RAISE WARNING 'Found % CarBuildUpgrade records without partId. Deleting...', v_count;
  END IF;
END $$;

DELETE FROM "CarBuildUpgrade" WHERE "partId" IS NULL;

-- Now make partId NOT NULL
ALTER TABLE "CarBuildUpgrade"
  ALTER COLUMN "partId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "CarBuildUpgrade"
  DROP CONSTRAINT IF EXISTS "CarBuildUpgrade_partId_fk",
  ADD CONSTRAINT "CarBuildUpgrade_partId_fk"
    FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT;

DO $$
BEGIN
  RAISE NOTICE 'CarBuildUpgrade.partId is now NOT NULL with FK constraint';
END $$;

-- Same for CarBuildSetting
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "CarBuildSetting" WHERE "settingId" IS NULL;

  IF v_count > 0 THEN
    RAISE WARNING 'Found % CarBuildSetting records without settingId. Deleting...', v_count;
  END IF;
END $$;

DELETE FROM "CarBuildSetting" WHERE "settingId" IS NULL;

-- Now make settingId NOT NULL
ALTER TABLE "CarBuildSetting"
  ALTER COLUMN "settingId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "CarBuildSetting"
  DROP CONSTRAINT IF EXISTS "CarBuildSetting_settingId_fk",
  ADD CONSTRAINT "CarBuildSetting_settingId_fk"
    FOREIGN KEY ("settingId") REFERENCES "TuningSetting"("id") ON DELETE RESTRICT;

DO $$
BEGIN
  RAISE NOTICE 'CarBuildSetting.settingId is now NOT NULL with FK constraint';
END $$;

-- ============================================================================
-- STEP 3: Optionally drop old columns (after testing)
-- ============================================================================

-- CAUTION: Only run this after you've verified everything works!
-- Commented out by default - run manually when ready

-- ALTER TABLE "CarBuildUpgrade" DROP COLUMN IF EXISTS "category";
-- ALTER TABLE "CarBuildUpgrade" DROP COLUMN IF EXISTS "part";
-- ALTER TABLE "CarBuildSetting" DROP COLUMN IF EXISTS "category";
-- ALTER TABLE "CarBuildSetting" DROP COLUMN IF EXISTS "setting";

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_part_categories INTEGER;
  v_parts INTEGER;
  v_tuning_sections INTEGER;
  v_tuning_settings INTEGER;
  v_upgrades INTEGER;
  v_settings INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_part_categories FROM "PartCategory";
  SELECT COUNT(*) INTO v_parts FROM "Part";
  SELECT COUNT(*) INTO v_tuning_sections FROM "TuningSection";
  SELECT COUNT(*) INTO v_tuning_settings FROM "TuningSetting";
  SELECT COUNT(*) INTO v_upgrades FROM "CarBuildUpgrade";
  SELECT COUNT(*) INTO v_settings FROM "CarBuildSetting";

  RAISE NOTICE '';
  RAISE NOTICE '=== Final Migration Status ===';
  RAISE NOTICE 'PartCategories:   %', v_part_categories;
  RAISE NOTICE 'Parts:            %', v_parts;
  RAISE NOTICE 'TuningSections:   %', v_tuning_sections;
  RAISE NOTICE 'TuningSettings:   %', v_tuning_settings;
  RAISE NOTICE 'CarBuildUpgrade:  % (all have partId)', v_upgrades;
  RAISE NOTICE 'CarBuildSetting:  % (all have settingId)', v_settings;
  RAISE NOTICE '';
  RAISE NOTICE 'Finalization complete!';
END $$;
