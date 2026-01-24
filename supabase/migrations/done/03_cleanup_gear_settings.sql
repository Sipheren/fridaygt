-- Migration 03: Clean up old gear settings from CarBuildSetting
-- ONLY RUN THIS AFTER VERIFYING that migration 02 was successful!
-- Check that your gear data is in CarBuild before running this!

-- Safety check: Show what will be deleted
SELECT
  "buildId",
  "setting",
  "value"
FROM "CarBuildSetting"
WHERE "category" = 'Transmission'
  AND (
    "setting" LIKE '%Gear%'
    OR "setting" LIKE '%Final Drive%'
    OR "setting" LIKE '%Final%'
  )
ORDER BY "buildId", "setting";

-- Uncomment the DELETE below after you've verified the migration was successful
-- DELETE FROM "CarBuildSetting"
-- WHERE "category" = 'Transmission'
--   AND (
--     "setting" LIKE '%Gear%'
--     OR "setting" LIKE '%Final Drive%'
--     OR "setting" LIKE '%Final%'
--   );

-- Verification query: show remaining transmission settings (should be 0 if successful)
SELECT COUNT(*) as remaining_gear_settings
FROM "CarBuildSetting"
WHERE "category" = 'Transmission'
  AND (
    "setting" LIKE '%Gear%'
    OR "setting" LIKE '%Final Drive%'
    OR "setting" LIKE '%Final%'
  );
