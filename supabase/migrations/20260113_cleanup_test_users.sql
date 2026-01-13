-- Cleanup test users and sessions
-- Keeps only the default admin user (david@sipheren.com)

-- Delete all sessions first (foreign key dependency)
DELETE FROM "next_auth"."sessions"
WHERE "userId" != '9932e1b2-b495-4a68-a5cb-367730342c68';

-- Delete all verification tokens
DELETE FROM "next_auth"."verification_tokens";

-- Delete all accounts (should be empty anyway)
DELETE FROM "next_auth"."accounts"
WHERE "userId" != '9932e1b2-b495-4a68-a5cb-367730342c68';

-- Delete all users except the admin
DELETE FROM "next_auth"."users"
WHERE "id" != '9932e1b2-b495-4a68-a5cb-367730342c68'
AND "email" != 'david@sipheren.com';

-- Verify cleanup
SELECT 'next_auth.users' as table_name, count(*) as count FROM "next_auth"."users"
UNION ALL
SELECT 'next_auth.sessions', count(*) FROM "next_auth"."sessions"
UNION ALL
SELECT 'next_auth.accounts', count(*) FROM "next_auth"."accounts"
UNION ALL
SELECT 'public.User', count(*) FROM "public"."User";
