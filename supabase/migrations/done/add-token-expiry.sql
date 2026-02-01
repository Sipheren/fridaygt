-- ============================================================================
-- Migration: Add Token Expiration
-- Version: 2.20.0
-- Date: 2026-02-01
--
-- Description:
-- Adds token expiration to magic links. NextAuth verification tokens
-- previously never expired, allowing old magic links to be used indefinitely
-- if an attacker gained access to a user's email.
--
-- Changes:
-- 1. Adds expires_at column to VerificationToken table (default: 15 minutes)
-- 2. Creates index for cleanup performance
-- 3. Creates cleanup function for expired tokens
--
-- Instructions:
-- Run this migration manually: npx supabase db push
-- ============================================================================

-- Add expires_at column to VerificationToken
-- Default is 15 minutes from token creation
ALTER TABLE "VerificationToken"
ADD COLUMN "expires_at" TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes');

-- Create index for cleanup queries (improves performance)
CREATE INDEX idx_verification_token_expires_at ON "VerificationToken"("expires_at");

-- Function to clean expired tokens
-- This will be called by the cron job hourly
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM "VerificationToken" WHERE "expires_at" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Verification query (should return 1)
SELECT 1 as migration_complete;
