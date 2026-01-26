/**
 * User Listing API (Legacy/Admin)
 *
 * GET /api/users - List users with optional active filtering (admin only)
 *
 * Purpose: Provide admins with filtered list of users for dropdowns/selection
 * - Admin-only endpoint (prevents unauthorized access to user data)
 * - Supports filtering to active users only (USER + ADMIN roles)
 * - Returns minimal user data (id, name, email, role, gamertag)
 * - Excludes nulluser placeholder (used for race member backfill)
 * - Used for user selection in admin interfaces
 *
 * **Note: This is a legacy endpoint for admin user selection**
 * For full user management, use /api/admin/users instead
 * - /api/admin/users: Complete user data (all fields), no filtering
 * - /api/users: Minimal data, active filtering, admin-only
 *
 * Data Returned:
 * - id: User UUID (for selection)
 * - name: User's full name (for display)
 * - email: User email (for identification)
 * - role: PENDING | USER | ADMIN (for filtering)
 * - gamertag: GT7 gamertag (for display)
 * - Sorted by: name (A-Z)
 *
 * Filtering Options:
 * - active=true: Only active users (USER + ADMIN roles)
 * - No filter: All users (including PENDING)
 * - Default: All users (activeOnly=false)
 *
 * Null User Exclusion:
 * - "nulluser" email is a placeholder for race member backfill
 * - Excluded from all user lists (not a real user)
 * - Used when race members have no assigned user
 * - Always excluded via .not('email', 'eq', 'nulluser')
 *
 * Use Cases:
 * - Admin user selection dropdowns (race member assignment)
 * - Active user filtering (exclude pending approvals)
 * - User mention/autocomplete features
 * - Admin interface user lists
 *
 * Security:
 * - Admin-only endpoint (verified via isAdmin())
 * - Returns sensitive data (emails, names, roles)
 * - Active filtering prevents showing pending users in production UIs
 *
 * How It Works:
 * 1. Authenticate and authorize (admin only)
 * 2. Parse activeOnly parameter
 * 3. Build query with optional role filtering
 * 4. Always exclude nulluser placeholder
 * 5. Sort by name ascending
 * 6. Return filtered user list
 *
 * Debugging Tips:
 * - Common error: "Forbidden" - check user role is ADMIN
 * - Empty list: Check User table has records (excluding nulluser)
 * - Pending users showing: Set active=true to filter to USER+ADMIN only
 * - Nulluser appearing: Check email exclusion is working
 * - Frontend: Display "No users found" if empty list returned
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // AUTHENTICATION & AUTHORIZATION
    // ============================================================
    // Authenticate user session
    // Authorize admin-only access
    // This prevents unauthorized access to user data
    //
    // Debugging Tips:
    // - Check session.user.id is set for authenticated users
    // - Check user role is ADMIN for authorization
    // - Common error: "Forbidden" - user is not ADMIN
    // ============================================================

    const session = await auth()

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check authorization - only admins can view users list
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 })
    }

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    // ============================================================
    // BUILD QUERY WITH FILTERS
    // ============================================================
    // Build query with optional active filtering
    // - activeOnly=true: Only USER and ADMIN roles (exclude PENDING)
    // - activeOnly=false: All roles (including PENDING)
    //
    // Active User Logic:
    // - Active users: USER and ADMIN roles (approved accounts)
    // - Pending users: PENDING role (awaiting approval)
    // - Default: Show all users (no filtering)
    //
    // Null User Exclusion:
    // - "nulluser" email is a placeholder for race member backfill
    // - Excluded from all user lists (not a real user account)
    // - Used when race members have no assigned user
    // - Always excluded via .not('email', 'eq', 'nulluser')
    //
    // Debugging Tips:
    // - Test with ?active=true to filter out PENDING users
    // - Check User table has USER/ADMIN users if expecting results
    // - Verify nulluser exclusion is working (should not appear in results)
    // - Frontend: Use active=true for production user selection
    // ============================================================

    let query = supabase
      .from('User')
      .select('id, name, email, role, gamertag')
      .order('name', { ascending: true })

    // Filter to only active users (USER or ADMIN, not PENDING)
    if (activeOnly) {
      query = query.in('role', ['USER', 'ADMIN'])
    }

    // Always exclude nulluser placeholder (used for race member backfill)
    query = query.not('email', 'eq', 'nulluser')

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // ============================================================
    // RETURN FILTERED USER LIST
    // ============================================================
    // Return users array (empty array if no users found)
    // Frontend should handle empty list gracefully
    //
    // Debugging Tips:
    // - Empty array: No users match filter (check User table)
    // - Nulluser appearing: Check email exclusion logic
    // - Frontend: Display "No users found" message if empty
    // ============================================================

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
