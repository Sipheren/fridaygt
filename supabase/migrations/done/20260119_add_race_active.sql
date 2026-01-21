-- Migration: Add isActive to Race table
-- Date: 2026-01-19
-- Branch: buildfocussed
--
-- This migration adds an isActive boolean field to the Race table
-- to allow races to be marked as active for the Tonight page

-- Add isActive column to Race table (defaults to false)
ALTER TABLE "Race"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for querying active races
CREATE INDEX IF NOT EXISTS "Race_isActive_idx" ON "Race"("isActive");

-- ============================================================================
-- Verification
-- ============================================================================

-- Check Race table has isActive column
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Race' AND column_name = 'isActive';

-- ============================================================================
-- Summary
-- ============================================================================
-- ✓ Added Race.isActive column (BOOLEAN, NOT NULL, DEFAULT FALSE)
-- ✓ Created index on Race.isActive for fast queries
