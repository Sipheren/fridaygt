-- Migration 02: Migrate gear data from CarBuildSetting to CarBuild columns
-- Run this AFTER 01_add_gear_columns.sql has been executed successfully

-- First, let's see what gear data we have to migrate
SELECT
  cbs."buildId",
  cbs."setting",
  cbs."value"
FROM "CarBuildSetting" cbs
WHERE cbs."category" = 'Transmission'
  AND (
    cbs."setting" LIKE '%Gear%'
    OR cbs."setting" LIKE '%Final Drive%'
    OR cbs."setting" LIKE '%Final%'
  )
ORDER BY cbs."buildId", cbs."setting";

-- Now migrate the data
-- Using CTEs to pivot the gear settings into columns

WITH gear_data AS (
  SELECT
    "buildId",
    "setting",
    "value"
  FROM "CarBuildSetting"
  WHERE "category" = 'Transmission'
)
UPDATE "CarBuild"
SET
  "finalDrive" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = 'Final Drive'
    LIMIT 1
  ),
  "gear1" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '1st Gear'
    LIMIT 1
  ),
  "gear2" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '2nd Gear'
    LIMIT 1
  ),
  "gear3" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '3rd Gear'
    LIMIT 1
  ),
  "gear4" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '4th Gear'
    LIMIT 1
  ),
  "gear5" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '5th Gear'
    LIMIT 1
  ),
  "gear6" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '6th Gear'
    LIMIT 1
  ),
  "gear7" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '7th Gear'
    LIMIT 1
  ),
  "gear8" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '8th Gear'
    LIMIT 1
  ),
  "gear9" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '9th Gear'
    LIMIT 1
  ),
  "gear10" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '10th Gear'
    LIMIT 1
  ),
  "gear11" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '11th Gear'
    LIMIT 1
  ),
  "gear12" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '12th Gear'
    LIMIT 1
  ),
  "gear13" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '13th Gear'
    LIMIT 1
  ),
  "gear14" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '14th Gear'
    LIMIT 1
  ),
  "gear15" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '15th Gear'
    LIMIT 1
  ),
  "gear16" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '16th Gear'
    LIMIT 1
  ),
  "gear17" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '17th Gear'
    LIMIT 1
  ),
  "gear18" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '18th Gear'
    LIMIT 1
  ),
  "gear19" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '19th Gear'
    LIMIT 1
  ),
  "gear20" = (
    SELECT "value"::numeric
    FROM gear_data
    WHERE gear_data."buildId" = "CarBuild"."id"
      AND gear_data."setting" = '20th Gear'
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 FROM gear_data WHERE gear_data."buildId" = "CarBuild"."id"
);

-- Verify the migration - show migrated gear data
SELECT
  id,
  name,
  "finalDrive",
  gear1,
  gear2,
  gear3,
  gear4,
  gear5,
  gear6,
  gear7,
  gear8
FROM "CarBuild"
WHERE gear1 IS NOT NULL OR gear2 IS NOT NULL OR gear3 IS NOT NULL
ORDER BY name;
