-- Migration: Complete Data Reset (Keep Users Only)
-- Date: 2026-01-19
-- Branch: buildfocussed
--
-- WARNING: This will DELETE ALL DATA except User accounts
-- This is part of the build-centric architecture pivot

-- Disable triggers to speed up deletion
SET session_replication_role = 'replica';

-- ============================================================================
-- Delete all race-related data (if tables exist)
-- ============================================================================

-- Delete RaceCar entries (junction table)
DELETE FROM "RaceCar";

-- Delete Race entities
DELETE FROM "Race";

-- ============================================================================
-- Delete all run list data
-- ============================================================================

-- Delete run list entry cars (multi-car support)
DELETE FROM "RunListEntryCar";

-- Delete run list entries
DELETE FROM "RunListEntry";

-- Delete run lists
DELETE FROM "RunList";

-- ============================================================================
-- Delete all build data
-- ============================================================================

-- Delete build settings
DELETE FROM "CarBuildSetting";

-- Delete build upgrades
DELETE FROM "CarBuildUpgrade";

-- Delete car builds
DELETE FROM "CarBuild";

-- ============================================================================
-- Delete all lap time data
-- ============================================================================

DELETE FROM "LapTime";

-- ============================================================================
-- Delete car and track data (will be re-imported)
-- ============================================================================

DELETE FROM "Car";
DELETE FROM "Track";

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify: Only users remain
SELECT 'User' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Race' as table_name, COUNT(*) as count FROM "Race"
UNION ALL
SELECT 'RaceCar' as table_name, COUNT(*) as count FROM "RaceCar"
UNION ALL
SELECT 'RunList' as table_name, COUNT(*) as count FROM "RunList"
UNION ALL
SELECT 'RunListEntry' as table_name, COUNT(*) as count FROM "RunListEntry"
UNION ALL
SELECT 'RunListEntryCar' as table_name, COUNT(*) as count FROM "RunListEntryCar"
UNION ALL
SELECT 'CarBuild' as table_name, COUNT(*) as count FROM "CarBuild"
UNION ALL
SELECT 'CarBuildUpgrade' as table_name, COUNT(*) as count FROM "CarBuildUpgrade"
UNION ALL
SELECT 'CarBuildSetting' as table_name, COUNT(*) as count FROM "CarBuildSetting"
UNION ALL
SELECT 'LapTime' as table_name, COUNT(*) as count FROM "LapTime"
UNION ALL
SELECT 'Car' as table_name, COUNT(*) as count FROM "Car"
UNION ALL
SELECT 'Track' as table_name, COUNT(*) as count FROM "Track";

-- ============================================================================
-- Summary
-- ============================================================================
-- ✓ Deleted all Race and RaceCar data
-- ✓ Deleted all RunList and RunListEntry data
-- ✓ Deleted all CarBuild data
-- ✓ Deleted all LapTime data
-- ✓ Deleted all Car and Track data (will be re-imported)
-- ✓ User accounts preserved
