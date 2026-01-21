-- Simple cleanup for test accounts that didn't create any data
-- Just removes the user accounts and auth records

-- First, see what test users exist
SELECT id, email, role FROM "User" WHERE email LIKE '%@sipheren.com' AND email != '<no contact>';

-- Delete from next_auth schema (must do this first due to foreign keys)
DELETE FROM next_auth.sessions
WHERE "userId"::text IN (SELECT id::text FROM "User" WHERE email LIKE '%@sipheren.com' AND email != '<no contact>');

DELETE FROM next_auth.accounts
WHERE "userId"::text IN (SELECT id::text FROM "User" WHERE email LIKE '%@sipheren.com' AND email != '<no contact>');

DELETE FROM next_auth.users
WHERE id::text IN (SELECT id::text FROM "User" WHERE email LIKE '%@sipheren.com' AND email != '<no contact>');

-- Finally, delete the User records
DELETE FROM "User"
WHERE email LIKE '%@sipheren.com'
AND email != '<no contact>';

-- Verify cleanup
SELECT COUNT(*) as "Remaining test users" FROM "User" WHERE email LIKE '%@sipheren.com' AND email != '<no contact>';
