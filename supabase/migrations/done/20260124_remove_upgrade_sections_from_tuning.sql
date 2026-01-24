-- Remove upgrade/part sections from tuning (redundant with Parts tab)
-- These are upgrades, not tuning settings, so they should only exist in Parts

-- Sections removed: Nitrous/Overtake, Supercharger, Intake & Exhaust, Brakes, Steering, Drivetrain, Engine Tuning, Bodywork

-- Step 1: Delete all settings in these sections first
DELETE FROM "TuningSetting"
WHERE "sectionId" IN (
  SELECT id FROM "TuningSection" 
  WHERE name IN (
    'Nitrous/Overtake',
    'Supercharger',
    'Intake & Exhaust',
    'Brakes',
    'Steering',
    'Drivetrain',
    'Engine Tuning',
    'Bodywork'
  )
);

-- Step 2: Delete the sections
DELETE FROM "TuningSection"
WHERE name IN (
  'Nitrous/Overtake',
  'Supercharger',
  'Intake & Exhaust',
  'Brakes',
  'Steering',
  'Drivetrain',
  'Engine Tuning',
  'Bodywork'
);
