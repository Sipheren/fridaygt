-- COMPLETE COLUMN CASING AUDIT (Supabase-compatible)
-- Run this in Supabase SQL Editor
-- Output will show all columns with their casing

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position,
  CASE
    WHEN column_name = lower(column_name) THEN 'LOWERCASE (needs fixing)'
    WHEN column_name ~ '[A-Z]' AND column_name ~ '_' THEN 'MIXED (needs fixing)'
    WHEN column_name = upper(column_name) THEN 'UPPERCASE (needs fixing)'
    ELSE 'OK - camelCase'
  END as casing_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'Car',
    'Track',
    'Race',
    'RaceCar',
    'RunList',
    'RunListEntry',
    'RunListEntryCar',
    'LapTime',
    'CarBuild',
    'User'
  )
ORDER BY table_name, ordinal_position;
