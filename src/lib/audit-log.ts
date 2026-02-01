/**
 * Admin Audit Logging
 *
 * This module provides functionality to log all admin actions for security
 * and compliance purposes.
 *
 * Usage:
 * ```typescript
 * import { logAdminAction } from '@/lib/audit-log'
 *
 * await logAdminAction({
 *   adminId: currentUser.id,
 *   action: 'APPROVE_USER',
 *   targetId: userId,
 *   targetType: 'User',
 *   details: { userEmail: 'user@example.com' }
 * })
 * ```
 *
 * Actions are logged with:
 * - Admin ID (who performed the action)
 * - Action type (what was done)
 * - Target ID and type (what was affected)
 * - Details (additional context)
 * - IP address (where the request came from)
 * - User agent (what client was used)
 * - Timestamp (when it happened)
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { headers } from 'next/headers'

export interface AuditLogParams {
  adminId: string
  action: AuditAction
  targetId?: string
  targetType?: string
  details?: Record<string, any>
}

/**
 * Standard admin action types
 * Add new action types here as needed
 */
export type AuditAction =
  | 'APPROVE_USER'
  | 'REJECT_USER'
  | 'CHANGE_ROLE'
  | 'DELETE_USER'
  | 'UPDATE_USER'
  | 'DELETE_BUILD'
  | 'DELETE_RACE'
  | 'UPDATE_SETTINGS'

/**
 * Log an admin action to the audit log
 *
 * @param params - Audit log parameters
 * @throws Error if logging fails (but doesn't fail the parent operation)
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient()

    // Get request metadata from headers (Next.js 15: headers() is async)
    const headersList = await headers()

    // Extract IP address (handle proxy/CDN forwarding)
    const forwarded = headersList.get('x-forwarded-for')
    const ipAddress = forwarded?.split(',')[0]?.trim() ||
                      headersList.get('x-real-ip') ||
                      'unknown'

    // Get user agent
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Insert audit log entry
    const { error } = await supabase.from('AdminAuditLog').insert({
      adminId: params.adminId,
      action: params.action,
      targetId: params.targetId || null,
      targetType: params.targetType || null,
      details: params.details || null,
      ipAddress,
      userAgent,
    })

    if (error) {
      // Log the error but don't throw - we don't want to fail admin operations
      // if audit logging fails (but we do want to know about it)
      console.error('Failed to log admin action:', {
        error: error.message,
        params: { ...params, adminId: '***' }, // Redact adminId in logs
      })
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error in audit logging:', {
      error: error instanceof Error ? error.message : String(error),
      params: { ...params, adminId: '***' },
    })
  }
}

/**
 * Query audit logs for a specific admin or target
 * This is useful for admin dashboard display
 *
 * @param filters - Filter criteria
 * @returns Array of audit log entries
 */
export async function getAuditLogs(filters: {
  adminId?: string
  targetId?: string
  action?: AuditAction
  limit?: number
}): Promise<any[]> {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('AdminAuditLog')
    .select('*')
    .order('timestamp', { ascending: false })

  if (filters.adminId) {
    query = query.eq('adminId', filters.adminId)
  }

  if (filters.targetId) {
    query = query.eq('targetId', filters.targetId)
  }

  if (filters.action) {
    query = query.eq('action', filters.action)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch audit logs:', error)
    return []
  }

  return data || []
}
