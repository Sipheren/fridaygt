-- ============================================================
-- Remove voxace and RichR from all races
-- ============================================================

-- STEP 1: Check what will be deleted
-- This shows the current race memberships for these users
SELECT
  "RaceMember".id,
  "RaceMember".raceid,
  "Race".name as race_name,
  "User".gamertag,
  "User".email
FROM "RaceMember"
JOIN "User" ON "RaceMember".userid = "User".id
LEFT JOIN "Race" ON "RaceMember".raceid = "Race".id
WHERE "User".gamertag IN ('voxace', 'RichR')
ORDER BY "User".gamertag, "Race".name;

-- Expected result: Shows all race memberships that will be deleted
-- Review this before running the DELETE commands below


-- STEP 2: Delete race members for these users
-- Delete voxace from all races
DELETE FROM "RaceMember"
WHERE userid = (SELECT id FROM "User" WHERE gamertag = 'voxace');

-- Delete RichR from all races
DELETE FROM "RaceMember"
WHERE userid = (SELECT id FROM "User" WHERE gamertag = 'RichR');


-- STEP 3: Verify deletion
-- This should return 0 rows if deletion was successful
SELECT COUNT(*), "User".gamertag
FROM "RaceMember"
JOIN "User" ON "RaceMember".userid = "User".id
WHERE "User".gamertag IN ('voxace', 'RichR')
GROUP BY "User".gamertag;

-- Expected result: 0 rows (no race members remaining for these users)


-- ============================================================
-- Alternative: Single DELETE using IN clause
-- ============================================================
-- If you prefer a single query, use this instead of STEP 2:

-- DELETE FROM "RaceMember"
-- WHERE userid IN (
--   SELECT id FROM "User" WHERE gamertag IN ('voxace', 'RichR')
-- );

-- ============================================================
-- NOTES
-- ============================================================
-- 1. This only removes race memberships, NOT the users themselves
-- 2. Users will still exist in the User table
-- 3. Their lap times, builds, and other data remain intact
-- 4. Only their participation in races is removed
-- 5. "Last Updated" on remaining race members will show as nulluser
--    (this is expected behavior for cleanup operations)
