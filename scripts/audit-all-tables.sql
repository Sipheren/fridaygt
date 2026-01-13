-- ============================================================================
-- COMPREHENSIVE DATABASE COLUMN AUDIT
-- ============================================================================
-- Purpose: Check ALL tables for column casing consistency
-- Expected: All columns should be camelCase (e.g., userId, trackId, createdAt)
--
-- Run this in Supabase SQL Editor and copy the FULL output results
-- ============================================================================

-- Check ALL user-defined tables
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE '_supabase_%'
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- COLUMNS THAT SHOULD BE CAMELCASE (Quick Reference)
-- ============================================================================
-- Expected patterns:
--   - ID columns ending in Id: userId, trackId, carId, raceId, buildId
--   - Timestamp columns: createdAt, updatedAt, deletedAt
--   - Boolean flags: isActive, isPublic, isLive, isDefault
--   - Foreign keys: createdById, updatedById, runListId
--
-- Common WRONG patterns (lowercase):
--   - userid, trackid, carid (should be userId, trackId, carId)
--   - createdat, updatedat (should be createdAt, updatedAt)
--   - createdbyid (should be createdById)
--   - ispublic, isactive (should be isPublic, isActive)
-- ============================================================================

-- Specifically check Race entity tables (most likely to have issues)
SELECT
  'Race' as table_name,
  column_name,
  CASE
    WHEN column_name ~ '[a-z]' AND column_name !~ '[A-Z]' THEN '❌ LOWERCASE - NEEDS FIX'
    WHEN column_name ~ '[A-Z]' THEN '✅ CAMELCASE - OK'
    ELSE '⚠️  CHECK MANUALLY'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Race'
ORDER BY ordinal_position;

SELECT
  'RaceCar' as table_name,
  column_name,
  CASE
    WHEN column_name ~ '[a-z]' AND column_name !~ '[A-Z]' THEN '❌ LOWERCASE - NEEDS FIX'
    WHEN column_name ~ '[A-Z]' THEN '✅ CAMELCASE - OK'
    ELSE '⚠️  CHECK MANUALLY'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'RaceCar'
ORDER BY ordinal_position;

-- Check RunListEntry table
SELECT
  'RunListEntry' as table_name,
  column_name,
  CASE
    WHEN column_name ~ '[a-z]' AND column_name !~ '[A-Z]' THEN '❌ LOWERCASE - NEEDS FIX'
    WHEN column_name ~ '[A-Z]' THEN '✅ CAMELCASE - OK'
    ELSE '⚠️  CHECK MANUALLY'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'RunListEntry'
ORDER BY ordinal_position;

-- Check RunList table
SELECT
  'RunList' as table_name,
  column_name,
  CASE
    WHEN column_name ~ '[a-z]' AND column_name !~ '[A-Z]' THEN '❌ LOWERCASE - NEEDS FIX'
    WHEN column_name ~ '[A-Z]' THEN '✅ CAMELCASE - OK'
    ELSE '⚠️  CHECK MANUALLY'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'RunList'
ORDER BY ordinal_position;

-- ============================================================================
-- SUMMARY: Tables that should be checked
-- ============================================================================
-- Core tables:
--   - User
--   - Track
--   - Car
--   - CarBuild
--   - LapTime
--
-- Run list tables:
--   - RunList
--   - RunListEntry
--   - RunListEntryCar
--   - RunSession
--   - SessionAttendance
--
-- Race tables (PRIORITY - most likely to have issues):
--   - Race
--   - RaceCar
--
-- ============================================================================
-- NEXT STEPS:
-- 1. Copy the FULL output from this query
-- 2. Paste it back for analysis
-- 3. I'll generate a migration script to fix any lowercase columns
-- ============================================================================
