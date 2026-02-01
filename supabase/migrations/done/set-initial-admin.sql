-- ============================================================================
-- Migration: Set Initial Admin User (Optional)
-- Version: 2.20.0
-- Date: 2026-02-01
--
-- Description:
-- This migration is OPTIONAL. The DEFAULT_ADMIN_EMAIL will be automatically
-- promoted to ADMIN when they sign in via the auto-promotion logic in auth.ts.
--
-- Use this migration ONLY if you want to pre-set the admin account before
-- the user signs in, or if the auto-promotion isn't working.
--
-- Alternative Methods to Set Admin:
-- 1. Auto-promotion: Set DEFAULT_ADMIN_EMAIL in .env, user is promoted on sign-in
-- 2. This migration: Manually promote via SQL (run this file)
-- 3. Admin API: Existing admin can promote other users via PATCH /api/admin/users/[id]
--
-- Instructions:
-- 1. Update the target_email below if needed
-- 2. Run manually: npx supabase db push
-- 3. OR just let auto-promotion handle it when DEFAULT_ADMIN_EMAIL signs in
-- ============================================================================

-- Set the initial admin account by email (OPTIONAL)
-- UPDATE THIS EMAIL to match your DEFAULT_ADMIN_EMAIL
DO $$
DECLARE
  target_email TEXT := 'david@sipheren.com';
  updated_count INTEGER;
BEGIN
  -- Check if user exists before updating
  IF EXISTS (SELECT 1 FROM "User" WHERE "email" = target_email) THEN
    -- Promote the specified user to ADMIN role
    UPDATE "User"
    SET "role" = 'ADMIN',
        "updatedAt" = NOW()
    WHERE "email" = target_email;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Successfully promoted % to ADMIN role via SQL migration', target_email;
  ELSE
    RAISE NOTICE 'User % does not exist yet. Auto-promotion will handle it when they sign in.', target_email;
  END IF;
END $$;

-- Verification query (returns admin count)
SELECT COUNT(*) as admin_count, "email" FROM "User" WHERE "role" = 'ADMIN' GROUP BY "email";
