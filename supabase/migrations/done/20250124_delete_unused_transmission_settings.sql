-- Delete unused gear settings from TuningSetting table
-- These are no longer used because gears are now stored as direct columns on CarBuild
-- We keep the Transmission section in TuningSection for the sidebar navigation

-- First get the Transmission section ID
DO $$
DECLARE
  transmission_section_id UUID;
BEGIN
  SELECT id INTO transmission_section_id
  FROM "TuningSection"
  WHERE name = 'Transmission';

  IF transmission_section_id IS NOT NULL THEN
    -- Delete all settings in the Transmission section
    DELETE FROM "TuningSetting"
    WHERE "sectionId" = transmission_section_id;

    RAISE NOTICE 'Deleted Transmission settings from TuningSetting';
  ELSE
    RAISE NOTICE 'Transmission section not found';
  END IF;
END $$;
