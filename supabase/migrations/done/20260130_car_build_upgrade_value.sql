-- Add value column to CarBuildUpgrade for storing dropdown part values
-- This enables storing string values for GT Auto and Custom Parts dropdowns

-- Add value column (nullable for backward compatibility)
ALTER TABLE "CarBuildUpgrade"
ADD COLUMN "value" TEXT;

-- Add comment
COMMENT ON COLUMN "CarBuildUpgrade"."value" IS 'Selected value for dropdown parts (GT Auto, Custom Parts). Null for checkbox parts.';

-- Existing checkbox parts will have value = NULL
-- New dropdown parts will have value = selected option (e.g., "Yes", "Standard", "Type A", etc.)
