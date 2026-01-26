/**
 * Race Members API
 *
 * GET /api/races/[id]/members - Get all race members with user & tyre data
 * POST /api/races/[id]/members - Add a member to race (admin only)
 *
 * Debugging Tips:
 * - Members ordered by 'order' field (position in list)
 * - Gamertags only (no names/emails exposed)
 * - Default tyre: Racing: Soft if not specified
 * - Active users only (role IN ('USER', 'ADMIN'))
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// GET /api/races/[id]/members - Get all race members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()

    // Get race members with user and part data
    const { data: members, error } = await supabase
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
      .eq('raceid', id)
      .order('"order"', { ascending: true })

    if (error) {
      console.error('Error fetching race members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch race members', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ members: members || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/races/[id]/members - Add a member to race (admin only)
export async function POST(
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
        { error: 'Access denied - only admins can add race members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, partId } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify user exists and is active
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check user is active (not pending)
    if (user.role !== 'USER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'User must be active (USER or ADMIN) to be added to race' },
        { status: 400 }
      )
    }

    // Check if user is already in this race
    const { data: existingMember } = await supabase
      .from('RaceMember')
      .select('id')
      .eq('raceid', raceId)
      .eq('userid', userId)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this race' },
        { status: 409 }
      )
    }

    // Determine tyre selection
    let selectedPartId = partId

    if (!selectedPartId) {
      // Default to Racing: Soft
      const { data: defaultTyre } = await supabase
        .from('Part')
        .select('id')
        .eq('name', 'Racing: Soft')
        .single()

      if (!defaultTyre) {
        return NextResponse.json(
          { error: 'Default tyre (Racing: Soft) not found in Parts table' },
          { status: 404 }
        )
      }

      selectedPartId = defaultTyre.id
    } else {
      // Validate specified part exists
      const { data: part } = await supabase
        .from('Part')
        .select('id')
        .eq('id', selectedPartId)
        .single()

      if (!part) {
        return NextResponse.json({ error: 'Specified part not found' }, { status: 404 })
      }
    }

    // Get next order position
    const { data: lastMember } = await supabase
      .from('RaceMember')
      .select('"order"')
      .eq('raceid', raceId)
      .order('"order"', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = lastMember ? lastMember.order + 1 : 1

    // Create race member
    const now = new Date().toISOString()
    const { data: member, error: memberError } = await supabase
      .from('RaceMember')
      .insert({
        id: crypto.randomUUID(),
        raceid: raceId,
        userid: userId,
        partid: selectedPartId,
        "order": nextOrder,
        createdat: now,
        updatedat: now,
      })
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
      .single()

    if (memberError) {
      console.error('Error creating race member:', memberError)
      return NextResponse.json(
        { error: 'Failed to add member to race', details: memberError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
