/**
 * Individual Race Member Deletion API
 *
 * DELETE /api/races/[id]/members/[memberId] - Remove a member from race (admin only)
 *
 * Purpose: Delete a race member and update remaining members to reflect the deletion
 * - Admin-only endpoint (prevents unauthorized member removal)
 * - Deletes the RaceMember record from the database
 * - Updates ALL remaining members in the race to track the deletion
 * - Sets updatedat and updatedbyid for remaining members (change tracking)
 *
 * Change Tracking Strategy:
 * - When a member is deleted, that record is removed (can't track deletion on deleted record)
 * - Solution: Update ALL remaining members in the race to reflect the deletion
 * - This ensures "Last Updated" shows current user and time for the member list
 * - Frontend displays "Last Updated by [user] at [timestamp]" based on most recent update
 *
 * How It Works:
 * 1. Authenticate and authorize (admin only)
 * 2. Verify member exists (get memberId and raceId)
 * 3. Delete the RaceMember record
 * 4. Update ALL remaining members in the race:
 *    - Set updatedat = NOW()
 *    - Set updatedbyid = current user ID
 * 5. Return success confirmation
 *
 * Debugging Tips:
 * - Common error: "Race member not found" - verify memberId exists in RaceMember table
 * - Common error: "Access denied" - check user role is ADMIN
 * - After deletion: Check remaining members have updated updatedat and updatedbyid
 * - Frontend: "Last Updated" should show current user and current time
 * - Change tracking: All remaining members updated to reflect the deletion
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin, getCurrentUser } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    // ============================================================
    // RATE LIMITING & AUTHENTICATION
    // ============================================================
    // Apply rate limiting: 20 requests per minute to prevent abuse
    // Debugging: Check rate limit headers in response if 429 errors occur
    // ============================================================

    const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const { memberId } = await params
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // Only admins can remove race members
    // This prevents users from removing others from races
    // Debugging: Check user role is ADMIN
    // ============================================================

    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: 'Access denied - only admins can remove race members' },
        { status: 403 }
      )
    }

    // Get current user ID for change tracking
    const currentUser = await getCurrentUser(session)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = createServiceRoleClient()

    // ============================================================
    // MEMBER VERIFICATION
    // ============================================================
    // Verify member exists before deletion
    // Get raceId for updating remaining members later
    // Debugging: Check RaceMember table for memberId
    // ============================================================

    const { data: existingMember, error: fetchError } = await supabase
      .from('RaceMember')
      .select('id, raceid')
      .eq('id', memberId)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Race member not found' }, { status: 404 })
    }

    const raceId = existingMember.raceid

    // ============================================================
    // DELETE MEMBER
    // ============================================================
    // Delete the RaceMember record
    // Database cascade constraints handle any related data
    // Debugging: Check FK constraints if deletion fails
    // ============================================================

    const { error: deleteError } = await supabase
      .from('RaceMember')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Error deleting race member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove member from race', details: deleteError.message },
        { status: 500 }
      )
    }

    // ============================================================
    // UPDATE REMAINING MEMBERS (CHANGE TRACKING)
    // ============================================================
    // Update ALL remaining members in this race to reflect the deletion
    //
    // Why Update All Remaining Members?
    // - Deleted record can't be tracked (it's gone)
    // - Solution: Update remaining members to show activity in member list
    // - Frontend displays "Last Updated by [user] at [timestamp]" based on most recent update
    // - This indicates someone made a change (deletion) to the member list
    //
    // What Gets Updated:
    // - updatedat = NOW() (current timestamp)
    // - updatedbyid = currentUser.id (user who deleted the member)
    //
    // Debugging Tips:
    // - After deletion, check remaining members have updated timestamps
    // - Frontend should show "Last Updated by [currentUser] at [currentTime]"
    // - All remaining members updated, not just the member before/after deleted position
    // ============================================================

    await supabase
      .from('RaceMember')
      .update({
        updatedat: new Date().toISOString(),
        updatedbyid: currentUser.id,
      })
      .eq('raceid', raceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
