/**
 * Admin User Listing API
 *
 * GET /api/admin/users - List all users (admin only)
 *
 * Purpose: Provide admins with a complete list of all users in the system
 * - Admin-only endpoint (prevents unauthorized access to user data)
 * - Returns all user fields including roles, gamertags, timestamps
 * - Sorted by createdAt descending (newest users first)
 * - No pagination (suitable for current user base size)
 * - Used for admin dashboard user management
 *
 * Data Returned:
 * - All user fields: id, email, name, gamertag, role, createdAt, updatedAt
 * - All roles included: PENDING, USER, ADMIN
 * - No filtering (frontend handles search/filter)
 *
 * Use Cases:
 * - Admin dashboard user list
 * - User role management (approve/reject pending users)
 * - User profile editing
 * - Gamertag verification
 *
 * Security:
 * - isAdmin() check ensures only admins can access
 * - No user filtering (admin sees all users)
 * - Includes sensitive data (emails, names, roles)
 *
 * How It Works:
 * 1. Authenticate and authorize (admin only)
 * 2. Fetch all users from User table
 * 3. Sort by createdAt descending
 * 4. Return complete user list
 *
 * Debugging Tips:
 * - Common error: "Unauthorized" - check user role is ADMIN
 * - Verify isAdmin() check is working correctly
 * - Check User table has records if empty list returned
 * - Frontend: Display roles with badges (PENDING=gray, USER=blue, ADMIN=red)
 * - Performance: Consider pagination if user base grows beyond 1000 users
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isAdmin } from '@/lib/auth-utils'
import { checkRateLimit, RateLimit, rateLimitHeaders } from '@/lib/rate-limit'

export async function GET(request: Request) {
  // ============================================================
  // RATE LIMITING
  // ============================================================
  // Apply rate limiting: 100 requests per minute for admin queries
  // Prevents abuse of admin user listing endpoint
  // ============================================================

  const rateLimit = await checkRateLimit(request as any, RateLimit.Query())

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  // ============================================================
  // AUTHORIZATION CHECK
  // ============================================================
  // Only admins can list all users
  // This prevents unauthorized access to user data
  // Debugging: Check user role is ADMIN
  // ============================================================

  const session = await auth()

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ============================================================
  // FETCH ALL USERS
  // ============================================================
  // Fetch all users from User table
  // Returns complete user data (all fields)
  // Sorted by createdAt descending (newest first)
  //
  // Data Returned:
  // - id: User UUID
  // - email: User email (login identifier)
  // - name: User's full name
  // - gamertag: GT7 gamertag (display name)
  // - role: PENDING | USER | ADMIN
  // - createdAt: Account creation timestamp
  // - updatedAt: Last update timestamp
  //
  // Debugging Tips:
  // - Check User table has records if empty list returned
  // - Verify sorting (newest users first)
  // - Frontend: Filter by role for pending/approved users
  // ============================================================

  const supabase = createServiceRoleClient()
  const { data: users, error } = await supabase
    .from('User')
    .select('*')
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  return NextResponse.json({ users })
}
