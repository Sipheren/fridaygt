/**
 * Admin Pending Users Listing API
 *
 * GET /api/admin/pending-users - List all pending users awaiting approval (admin only)
 *
 * Purpose: Provide admins with list of users who need account approval
 * - Admin-only endpoint (prevents unauthorized access)
 * - Filters to PENDING role only (users awaiting approval)
 * - Returns essential user data for approval decision
 * - Sorted by createdAt descending (oldest pending first)
 * - Used for admin dashboard to approve/reject new registrations
 *
 * Data Returned:
 * - id: User UUID (for approve/reject operations)
 * - email: User email (for identifying user)
 * - name: User's full name (optional)
 * - createdAt: When they registered (for context)
 *
 * Role Filtering:
 * - Only PENDING users returned (not USER or ADMIN)
 * - Filter applied via .eq('role', 'PENDING')
 * - Prevents showing already approved users
 *
 * Approval Workflow:
 * 1. User registers → role = PENDING
 * 2. Admin sees user in pending list
 * 3. Admin approves → role = USER, approval email sent
 * 4. Admin rejects → user deleted, no email sent
 *
 * Security:
 * - isAdmin() check ensures only admins can access
 * - Prevents users from approving themselves
 * - No pagination (pending users typically low volume)
 *
 * How It Works:
 * 1. Authenticate and authorize (admin only)
 * 2. Fetch users with role = PENDING
 * 3. Sort by createdAt descending (oldest first for priority)
 * 4. Return pending users list
 *
 * Debugging Tips:
 * - Common error: "Forbidden" - check user role is ADMIN
 * - Empty list: No pending users (all approved/rejected)
 * - Verify role filter is working (should not show USER/ADMIN)
 * - Frontend: Display "X pending users" badge with count
 * - Email notifications sent after approval (not rejection)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isAdmin } from '@/lib/auth-utils'

// GET /api/admin/pending-users - List all pending users
export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // Only admins can view pending users
    // This prevents unauthorized access to registration data
    // Prevents users from approving themselves
    // Debugging: Check user role is ADMIN
    // ============================================================

    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceRoleClient()

    // ============================================================
    // FETCH PENDING USERS
    // ============================================================
    // Fetch users with role = PENDING only
    // Returns essential data for approval decision:
    // - id: User UUID (needed for approve/reject operations)
    // - email: User email (identifies who registered)
    // - name: User's full name (optional, helps identify)
    // - createdAt: Registration time (shows how long they've been waiting)
    //
    // Role Filtering:
    // - Filter: .eq('role', 'PENDING')
    // - Excludes USER and ADMIN users
    // - Only shows users awaiting approval
    //
    // Sorting:
    // - Order by createdAt descending
    // - Oldest pending users shown first (priority queue)
    // - Helps admins identify users waiting longest
    //
    // Debugging Tips:
    // - Empty list: No pending users (all approved/rejected)
    // - Check User table has PENDING users if expecting results
    // - Verify sorting (oldest users first for priority)
    // - Frontend: Display "X days ago" based on createdAt
    // ============================================================

    const { data: users, error } = await supabase
      .from('User')
      .select('id, email, name, createdAt')
      .eq('role', 'PENDING')
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching pending users:', error)
      return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in GET /api/admin/pending-users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
