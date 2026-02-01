-- ============================================================================
-- Migration: Add Admin Audit Logging
-- Version: 2.20.0
-- Date: 2026-02-01
--
-- Description:
-- Creates audit log table to track all admin actions for security and
-- compliance purposes. Every admin action (approve, reject, role change, etc.)
-- will be logged with admin ID, action type, target, IP address, and timestamp.
--
-- Uses:
-- - Security monitoring and incident response
-- - Compliance auditing
-- - Investigating unauthorized access
-- - Tracking admin behavior patterns
--
-- Instructions:
-- Run this migration manually: npx supabase db push
-- ============================================================================

-- Create AdminAuditLog table
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,                    -- e.g., 'APPROVE_USER', 'REJECT_USER', 'CHANGE_ROLE'
  "targetId" UUID,                           -- User/resource being acted upon
  "targetType" TEXT,                         -- e.g., 'User', 'Build', 'Race'
  "details" JSONB,                           -- Additional context (e.g., { userEmail: '...' })
  "ipAddress" TEXT,                          -- IP address of admin making the request
  "userAgent" TEXT,                          -- Browser/client identifier
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_admin_audit_log_admin_id ON "AdminAuditLog"("adminId");
CREATE INDEX idx_admin_audit_log_timestamp ON "AdminAuditLog"("timestamp" DESC);
CREATE INDEX idx_admin_audit_log_action ON "AdminAuditLog"("action");
CREATE INDEX idx_admin_audit_log_target ON "AdminAuditLog"("targetId", "targetType");

-- Add comment for documentation
COMMENT ON TABLE "AdminAuditLog" IS 'Audit log of all admin actions for security and compliance';

COMMENT ON COLUMN "AdminAuditLog"."action" IS 'Type of action performed: APPROVE_USER, REJECT_USER, CHANGE_ROLE, DELETE_USER, etc.';
COMMENT ON COLUMN "AdminAuditLog"."details" IS 'Additional context as JSONB (e.g., { userEmail: ''old@email.com'', newRole: ''ADMIN'' })';

-- Enable Row Level Security
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- - Admins can view all audit logs
-- - No one can insert directly (must use API with auth)
-- - No one can update or delete audit logs (immutable)

CREATE POLICY "Admins can view audit logs"
  ON "AdminAuditLog"
  FOR SELECT
  USING (
    "adminId" IN (
      SELECT "id" FROM "User" WHERE "role" = 'ADMIN'
    )
  );

CREATE POLICY "No direct inserts" ON "AdminAuditLog" FOR INSERT WITH CHECK (false);
CREATE POLICY "No updates" ON "AdminAuditLog" FOR UPDATE USING (false);
CREATE POLICY "No deletes" ON "AdminAuditLog" FOR DELETE USING (false);

-- Verification query (should return 1)
SELECT 1 as migration_complete;
