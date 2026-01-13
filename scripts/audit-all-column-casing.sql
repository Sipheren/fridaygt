-- COMPLETE COLUMN CASING AUDIT
-- Run this to check ALL table columns in the database
--
-- Usage: Copy this entire script into Supabase SQL Editor and run it
-- Output will show all columns with their casing

\echo '========================================================================================================='
\echo 'COMPLETE DATABASE COLUMN CASING AUDIT'
\echo '========================================================================================================='
\echo ''

-- Create a temporary table to store results
DROP TABLE IF EXISTS _column_audit;
CREATE TEMP TABLE _column_audit (
  table_name text,
  column_name text,
  data_type text,
  is_camelcase boolean,
  issue text
);

-- Insert all columns
INSERT INTO _column_audit (table_name, column_name, data_type, is_camelcase, issue)
SELECT
  table_name,
  column_name,
  data_type,
  -- Check if column name follows camelCase convention:
  -- - Starts with lowercase
  -- - Contains no underscores
  -- - Not all lowercase (would be snake_case)
  -- - Not all uppercase (would be constant)
  column_name ~ '^[a-z][a-zA-Z0-9]*$' AND column_name != lower(column_name),
  CASE
    WHEN column_name = lower(column_name) THEN 'lowercase (should be camelCase)'
    WHEN column_name ~ '[A-Z]' AND column_name ~ '_' THEN 'mixed (should be camelCase)'
    WHEN column_name = upper(column_name) THEN 'uppercase (should be camelCase)'
    ELSE 'OK'
  END
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE '_%'  -- Skip temp tables
ORDER BY table_name, ordinal_position;

-- Show summary
\echo 'SUMMARY BY TABLE'
\echo '================'
SELECT
  table_name,
  count(*) as total_columns,
  sum(CASE WHEN issue = 'OK' THEN 1 ELSE 0 END) as ok_columns,
  sum(CASE WHEN issue != 'OK' THEN 1 ELSE 0 END) as problem_columns
FROM _column_audit
GROUP BY table_name
ORDER BY table_name;

\echo ''
\echo 'TABLES WITH CASING ISSUES'
\echo '========================='
SELECT
  table_name,
  string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY column_name) as problem_columns
FROM _column_audit
WHERE issue != 'OK'
GROUP BY table_name
ORDER BY table_name;

\echo ''
\echo 'DETAILED COLUMN LIST (ALL TABLES)'
\echo '================================='
\echo ''
\echo 'Car Table'
\echo '----------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'Car'
ORDER BY ordinal_position;

\echo ''
\echo 'Track Table'
\echo '-----------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'Track'
ORDER BY ordinal_position;

\echo ''
\echo 'Race Table'
\echo '----------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'Race'
ORDER BY ordinal_position;

\echo ''
\echo 'RaceCar Table'
\echo '-------------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'RaceCar'
ORDER BY ordinal_position;

\echo ''
\echo 'RunList Table'
\echo '-------------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'RunList'
ORDER BY ordinal_position;

\echo ''
\echo 'RunListEntry Table'
\echo '------------------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'RunListEntry'
ORDER BY ordinal_position;

\echo ''
\echo 'RunListEntryCar Table'
\echo '---------------------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'RunListEntryCar'
ORDER BY ordinal_position;

\echo ''
\echo 'LapTime Table'
\echo '-------------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'LapTime'
ORDER BY ordinal_position;

\echo ''
\echo 'CarBuild Table'
\echo '--------------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'CarBuild'
ORDER BY ordinal_position;

\echo ''
\echo 'User Table'
\echo '----------'
SELECT column_name, data_type, issue
FROM _column_audit
WHERE table_name = 'User'
ORDER BY ordinal_position;

\echo ''
\echo '========================================================================================================='
\echo 'AUDIT COMPLETE'
\echo '========================================================================================================='
\echo 'Copy the results above and save them for the migration plan.'
\echo ''

-- Cleanup
DROP TABLE IF EXISTS _column_audit;
