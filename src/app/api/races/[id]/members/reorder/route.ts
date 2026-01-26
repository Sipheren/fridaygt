/**
 * Race Members Reorder API
 *
 * PATCH /api/races/[id]/members/reorder - Reorder members atomically (admin only)
 *
 * Debugging Tips:
 * - Calls reorder_race_members_atomic() RPC function
 * - Atomic operation with row-level locking
 * - Prevents race conditions during concurrent updates
 * - Matches pattern from /api/races/reorder
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// PATCH /api/races/[id]/members/reorder - Reorder members
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
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

    // Check admin authorization
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: 'Access denied - only admins can reorder race members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memberIds } = body

    // Validate memberIds array
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'memberIds must be a non-empty array' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify all members belong to this race
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

    // Call atomic reorder function
    const newOrder = memberIds.map((_, index) => index + 1)

    const { error: reorderError } = await supabase.rpc('reorder_race_members_atomic', {
      member_ids: memberIds,
      new_order: newOrder,
    })

    if (reorderError) {
      console.error('Error reordering race members:', reorderError)
      return NextResponse.json(
        { error: 'Failed to reorder race members', details: reorderError.message },
        { status: 500 }
      )
    }

    // Fetch updated members list
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
        user:User(id, gamertag),
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
