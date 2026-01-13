-- Verification script for Race/RaceCar column casing
--
-- Run this BEFORE and AFTER the migration to verify the changes
--
-- Usage:
--   psql -U postgres -d fridaygt -f verify-column-casing.sql

-- ============================================================================
-- CHECK CURRENT COLUMN NAMES
-- ============================================================================

\echo '=========================================='
\echo 'Race Table Columns'
\echo '=========================================='
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Race'
ORDER BY ordinal_position;

\echo ''
\echo '=========================================='
\echo 'RaceCar Table Columns'
\echo '=========================================='
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'RaceCar'
ORDER BY ordinal_position;

-- ============================================================================
-- CHECK FOREIGN KEY CONSTRAINTS
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'Foreign Key Constraints'
\echo '=========================================='
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN ('Race', 'RaceCar')
       OR ccu.table_name IN ('Race', 'RaceCar'))
ORDER BY
  tc.table_name,
  kcu.column_name;

-- ============================================================================
-- TEST QUERIES (should work after migration)
-- ============================================================================

\echo ''
\echo '=========================================='
\echo 'Test Query: Race with RaceCar'
\echo '=========================================='
SELECT
  "Race".id,
  "Race".name,
  "Race"."createdAt",
  "Race"."updatedAt",
  "Race"."createdById",
  "RaceCar"."carId",
  "RaceCar"."buildId",
  "Car".name AS car_name,
  "Car".manufacturer
FROM "Race"
LEFT JOIN "RaceCar" ON "Race"."id" = "RaceCar"."raceId"
LEFT JOIN "Car" ON "RaceCar"."carId" = "Car"."id"
LIMIT 5;

\echo ''
\echo '=========================================='
\echo 'Test Query: Count Races'
\echo '=========================================='
SELECT COUNT(*) AS total_races FROM "Race";

\echo ''
\echo '=========================================='
\echo 'Test Query: Count RaceCars'
\echo '=========================================='
SELECT COUNT(*) AS total_race_cars FROM "RaceCar";

\echo ''
\echo '=========================================='
\echo 'Verification Complete!'
\echo '=========================================='
