-- Cleanup all data for test accounts
-- This will remove all traces allowing you to reuse the email addresses

-- First, let's see what test users exist (keep this for reference)
-- SELECT id, email, role FROM "User" WHERE email LIKE '%@sipheren.com' AND email != 'david@sipheren.com';

-- 1. Delete lap times from test users
DELETE FROM "LapTime"
WHERE "userId" IN (
  SELECT id FROM "User"
  WHERE email LIKE '%@sipheren.com'
  AND email != 'david@sipheren.com'
);

-- 2. Delete car builds from test users
DELETE FROM "CarBuildUpgrade"
WHERE "carBuildId" IN (
  SELECT id FROM "CarBuild"
  WHERE "userId" IN (
    SELECT id FROM "User"
    WHERE email LIKE '%@sipheren.com'
    AND email != 'david@sipheren.com'
  )
);

DELETE FROM "CarBuildSetting"
WHERE "carBuildId" IN (
  SELECT id FROM "CarBuild"
  WHERE "userId" IN (
    SELECT id FROM "User"
    WHERE email LIKE '%@sipheren.com'
    AND email != 'david@sipheren.com'
  )
);

DELETE FROM "CarBuild"
WHERE "userId" IN (
  SELECT id FROM "User"
  WHERE email LIKE '%@sipheren.com'
  AND email != 'david@sipheren.com'
);

-- 3. Delete run lists created by test users
DELETE FROM "RunListEntryCar"
WHERE "runListEntryId" IN (
  SELECT id FROM "RunListEntry"
  WHERE "runListId" IN (
    SELECT id FROM "RunList"
    WHERE "createdById" IN (
      SELECT id FROM "User"
      WHERE email LIKE '%@sipheren.com'
      AND email != 'david@sipheren.com'
    )
  )
);

DELETE FROM "RunListEntry"
WHERE "runListId" IN (
  SELECT id FROM "RunList"
  WHERE "createdById" IN (
    SELECT id FROM "User"
    WHERE email LIKE '%@sipheren.com'
    AND email != 'david@sipheren.com'
  )
);

DELETE FROM "RunList"
WHERE "createdById" IN (
  SELECT id FROM "User"
  WHERE email LIKE '%@sipheren.com'
  AND email != 'david@sipheren.com'
);

-- 4. Delete run sessions and attendance for test users
DELETE FROM "SessionAttendance"
WHERE "sessionId" IN (
  SELECT id FROM "RunSession"
  WHERE "runListId" IN (
    SELECT id FROM "RunList"
    WHERE "createdById" IN (
      SELECT id FROM "User"
      WHERE email LIKE '%@sipheren.com'
      AND email != 'david@sipheren.com'
    )
  )
);

DELETE FROM "RunSession"
WHERE "runListId" IN (
  SELECT id FROM "RunList"
  WHERE "createdById" IN (
    SELECT id FROM "User"
    WHERE email LIKE '%@sipheren.com'
    AND email != 'david@sipheren.com'
  )
);

-- 5. Delete races created by test users
DELETE FROM "RaceCar"
WHERE "raceId" IN (
  SELECT id FROM "Race"
  WHERE "createdById" IN (
    SELECT id FROM "User"
    WHERE email LIKE '%@sipheren.com'
    AND email != 'david@sipheren.com'
  )
);

DELETE FROM "Race"
WHERE "createdById" IN (
  SELECT id FROM "User"
  WHERE email LIKE '%@sipheren.com'
  AND email != 'david@sipheren.com'
);

-- 6. Delete from next_auth schema (sessions, accounts, users)
DELETE FROM next_auth.sessions
WHERE "userId" IN (
  SELECT id FROM "User"
  WHERE email LIKE '%@sipheren.com'
  AND email != 'david@sipheren.com'
);

DELETE FROM next_auth.accounts
WHERE "userId" IN (
  SELECT id FROM "User"
  WHERE email LIKE '%@sipheren.com'
  AND email != 'david@sipheren.com'
);

DELETE FROM next_auth.users
WHERE id IN (
  SELECT id FROM "User"
  WHERE email LIKE '%@sipheren.com'
  AND email != 'david@sipheren.com'
);

-- 7. Finally, delete the User records themselves
DELETE FROM "User"
WHERE email LIKE '%@sipheren.com'
AND email != 'david@sipheren.com';

-- Verify cleanup (should show 0 test users)
-- SELECT COUNT(*) FROM "User" WHERE email LIKE '%@sipheren.com' AND email != 'david@sipheren.com';
