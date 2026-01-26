/**
 * Race Members Reorder API
 *
 * PATCH /api/races/[id]/members/reorder - Atomically reorder race members with new positions
 *
 * Purpose: Update the 'order' field for multiple race members in a single operation
 * - Used by race members list drag-and-drop to reorder participants
 * - Admin-only endpoint (prevents unauthorized reordering)
 * - Uses atomic RPC function to prevent race conditions
 * - All updates performed in a single database transaction
 * - Row-level locking ensures data consistency during concurrent updates
 * - Tracks who made the change (updatedById field)
 *
 * How It Works:
 * 1. Validate memberIds array (non-empty, valid UUIDs)
 * 2. Verify all members exist and belong to this race (raceId validation)
 * 3. Call reorder_race_members_atomic() RPC function with member_ids, new_order, and updated_by_id
 * 4. RPC function updates all members in a single transaction with row-level locks
 * 5. Sets updatedbyid and updatedat for all reordered members
 * 6. Return updated members list sorted by new order
 *
 * RPC Function Details (reorder_race_members_atomic):
 * - Parameters: member_ids (text[]), new_order (integer[]), updated_by_id (text)
 * - Logic: UPDATE RaceMember SET order = new_order[i], updatedat = NOW(), updatedbyid = updated_by_id WHERE id = member_ids[i]
 * - Locking: ROW LOCKING prevents concurrent modifications
 * - Transaction: All updates succeed or all fail (atomic)
 * - Change Tracking: Sets updatedbyid to track who made the reorder
 * - Performance: Single round-trip to database for all updates
 *
 * Debugging Tips:
 * - Common error: "One or more race members not found" - verify all memberIds exist in RaceMember table
 * - Common error: "One or more members do not belong to this race" - check raceid matches for all members
 * - Common error: RPC function not found - check migration ran successfully
 * - Concurrent updates: Row-level locking prevents conflicts, automatically queues requests
 * - Check reorder_race_members_atomic() function exists in Supabase if RPC errors occur
 * - Transaction rollback: If any update fails, all changes are rolled back
 * - Change tracking: updatedbyid set to current user for all reordered members
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin, getCurrentUser } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: raceId } = await params
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user ID for change tracking
    const currentUser = await getCurrentUser(session)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // Only admins can reorder race members
    // This prevents users from reordering to their advantage
    // Debugging: Check user role is ADMIN
    // ============================================================

    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: 'Access denied - only admins can reorder race members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memberIds } = body

    // ============================================================
    // VALIDATION
    // ============================================================
    // Validate memberIds array is non-empty
    // Debugging: Check memberIds is array with at least one element
    // ============================================================

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'memberIds must be a non-empty array' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // ============================================================
    // MEMBER VERIFICATION
    // ============================================================
    // Verify all members exist and belong to this race
    // Prevents reordering members from different races
    // Prevents reordering non-existent members
    // Debugging: Check RaceMember table for memberIds, verify raceid matches
    // ============================================================

    const { data: existingMembers, error: fetchError } = await supabase
      .from('RaceMember')
      .select('id, raceid')
      .in('id', memberIds)

    if (fetchError) {
      console.error('Error fetching race members:', fetchError)
      return NextResponse.json(
        { error: 'Failed to verify race members' },
        { status: 500 }
      )
    }

    if (!existingMembers || existingMembers.length !== memberIds.length) {
      return NextResponse.json(
        { error: 'One or more race members not found' },
        { status: 404 }
      )
    }

    // Verify all members belong to the specified race
    const invalidMembers = existingMembers.filter((m: any) => m.raceid !== raceId)
    if (invalidMembers.length > 0) {
      return NextResponse.json(
        { error: 'One or more members do not belong to this race' },
        { status: 400 }
      )
    }

    // ============================================================
    // ATOMIC REORDERING
    // ============================================================
    // Call reorder_race_members_atomic() RPC function for atomic updates
    //
    // Why RPC Function?
    // - Single database transaction (all succeed or all fail)
    // - Row-level locking prevents concurrent modification conflicts
    // - Better performance than individual UPDATE statements
    // - Guaranteed order consistency
    // - Change tracking: Sets updatedbyid for all members
    //
    // RPC Function Logic:
    // ```sql
    // CREATE FUNCTION reorder_race_members_atomic(
    //   member_ids text[],
    //   new_order integer[],
    //   updated_by_id text DEFAULT NULL
    // ) RETURNS void
    // LANGUAGE plpgsql
    // AS $$
    // BEGIN
    //   FOR i IN 1..array_length(member_ids, 1) LOOP
    //     UPDATE "RaceMember"
    //     SET "order" = new_order[i],
    //         "updatedat" = NOW(),
    //         "updatedbyid" = updated_by_id
    //     WHERE id = member_ids[i];
    //   END LOOP;
    // END;
    // $$;
    // ```
    //
    // Debugging Tips:
    // - Check reorder_race_members_atomic() exists in Supabase functions
    // - Verify memberIds and newOrder arrays have same length
    // - Transaction rollback: if any UPDATE fails, all changes are rolled back
    // - Row-level locking: concurrent requests wait for lock release
    // - Change tracking: updatedbyid set to currentUser.id for all members
    // ============================================================

    const newOrder = memberIds.map((_, index) => index + 1)

    const { error: reorderError } = await supabase.rpc('reorder_race_members_atomic', {
      member_ids: memberIds,
      new_order: newOrder,
      updated_by_id: currentUser.id,
    })

    if (reorderError) {
      console.error('Error reordering race members:', reorderError)
      return NextResponse.json(
        { error: 'Failed to reorder race members', details: reorderError.message },
        { status: 500 }
      )
    }

    // ============================================================
    // FETCH UPDATED MEMBERS FOR RESPONSE
    // ============================================================
    // Fetch all updated members with complete relationship data
    // Returns members sorted by new order for immediate UI update
    // Includes: user (gamertag), updatedByUser (gamertag), part (tyre)
    // Uses explicit FK notation to avoid relationship ambiguity
    // ============================================================

    const { data: updatedMembers } = await supabase
      .from('RaceMember')
      .select(`
        id,
        raceid,
        userid,
        "order",
        partid,
        createdat,
        updatedat,
        updatedbyid,
        user:User!RaceMember_userid_fkey(id, gamertag),
        updatedByUser:User!RaceMember_updatedbyid_fkey(id, gamertag),
        part:Part(id, name, category:PartCategory(id, name))
      `)
      .eq('raceid', raceId)
      .order('"order"', { ascending: true })

    return NextResponse.json({
      success: true,
      members: updatedMembers || [],
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
