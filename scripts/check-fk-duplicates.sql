-- Check for duplicate foreign key constraints
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid::regclass::text IN ('CarBuildUpgrade', 'CarBuildSetting')
  OR confrelid::regclass::text IN ('Part', 'TuningSetting')
ORDER BY conrelid::regclass::text, conname;
