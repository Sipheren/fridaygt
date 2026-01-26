/**
 * Race Member Tyre Selection API
 *
 * PATCH /api/races/[id]/members/[memberId]/tyre - Update member's tyre selection (admin only)
 *
 * Debugging Tips:
 * - Admin authorization required
 * - Validates part exists in Parts table
 * - Updates partId and updatedAt timestamp
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin, getCurrentUser } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// PATCH /api/races/[id]/members/[memberId]/tyre - Update tyre selection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
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

    const { memberId } = await params
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user ID
    const currentUser = await getCurrentUser(session)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check admin authorization
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: 'Access denied - only admins can update tyre selection' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { partId } = body

    // Validate partId
    if (!partId) {
      return NextResponse.json(
        { error: 'partId is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify part exists
    const { data: part, error: partError } = await supabase
      .from('Part')
      .select('id, name')
      .eq('id', partId)
      .single()

    if (partError || !part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    // Verify member exists
    const { data: existingMember, error: fetchError } = await supabase
      .from('RaceMember')
      .select('id')
      .eq('id', memberId)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Race member not found' }, { status: 404 })
    }

    // Update member's tyre selection
    const { data: member, error: updateError } = await supabase
      .from('RaceMember')
      .update({
        partid: partId,
        updatedat: new Date().toISOString(),
        updatedbyid: currentUser.id,
      })
      .eq('id', memberId)
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
      .single()

    if (updateError) {
      console.error('Error updating tyre selection:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tyre selection', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(member)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
