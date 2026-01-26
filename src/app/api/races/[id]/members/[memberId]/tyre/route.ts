/**
 * Race Member Tyre Selection API
 *
 * PATCH /api/races/[id]/members/[memberId]/tyre - Update member's tyre selection (admin only)
 *
 * Purpose: Update the tyre compound (partId) for a specific race member
 * - Admin-only endpoint (prevents unauthorized tyre changes)
 * - Updates partId to reference a tyre from the Parts catalog
 * - Tracks who made the change (updatedbyid field)
 * - Updates timestamp (updatedat field) for change tracking
 *
 * Tyre Selection:
 * - Tyres are stored as Parts in the database (PartCategory: Tyres)
 * - Common tyres: Racing: Soft, Racing: Medium, Racing: Hard, etc.
 * - partId must reference an existing Part record
 * - Foreign key constraint: RaceMember.partId → Part.id
 *
 * Change Tracking:
 * - Sets updatedat = NOW() (current timestamp)
 * - Sets updatedbyid = currentUser.id (user who changed the tyre)
 * - Frontend displays "Last Updated by [user] at [timestamp]" based on this data
 *
 * How It Works:
 * 1. Authenticate and authorize (admin only)
 * 2. Validate partId is provided
 * 3. Verify part exists in Parts table
 * 4. Verify member exists in RaceMember table
 * 5. Update member's partId, updatedat, and updatedbyid
 * 6. Return updated member with all relationship data
 *
 * Debugging Tips:
 * - Common error: "partId is required" - check request body includes partId
 * - Common error: "Part not found" - verify partId exists in Part table
 * - Common error: "Race member not found" - verify memberId exists in RaceMember table
 * - Common error: "Access denied" - check user role is ADMIN
 * - After update: Check member has updated partId, updatedat, and updatedbyid
 * - Frontend: "Last Updated" should show current user and current time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin, getCurrentUser } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function PATCH(
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

    // Get current user ID for change tracking
    const currentUser = await getCurrentUser(session)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // Only admins can update tyre selection
    // This prevents users from changing others' tyre choices
    // Debugging: Check user role is ADMIN
    // ============================================================

    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: 'Access denied - only admins can update tyre selection' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { partId } = body

    // ============================================================
    // VALIDATION
    // ============================================================
    // Validate partId is provided
    // Debugging: Check request body includes partId field
    // ============================================================

    if (!partId) {
      return NextResponse.json(
        { error: 'partId is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // ============================================================
    // PART VERIFICATION
    // ============================================================
    // Verify part exists in Parts table before updating
    // Prevents invalid partId references (FK constraint violation)
    // Debugging: Check Part table for partId
    // ============================================================

    const { data: part, error: partError } = await supabase
      .from('Part')
      .select('id, name')
      .eq('id', partId)
      .single()

    if (partError || !part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    // ============================================================
    // MEMBER VERIFICATION
    // ============================================================
    // Verify member exists before updating
    // Debugging: Check RaceMember table for memberId
    // ============================================================

    const { data: existingMember, error: fetchError } = await supabase
      .from('RaceMember')
      .select('id')
      .eq('id', memberId)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Race member not found' }, { status: 404 })
    }

    // ============================================================
    // UPDATE TYRE SELECTION WITH CHANGE TRACKING
    // ============================================================
    // Update member's tyre selection (partId)
    // Track who made the change (updatedbyid)
    // Track when the change was made (updatedat)
    //
    // What Gets Updated:
    // - partid = partId (new tyre selection)
    // - updatedat = NOW() (current timestamp)
    // - updatedbyid = currentUser.id (user who changed the tyre)
    //
    // Foreign Key Constraints:
    // - RaceMember.partId → Part.id (must exist in Parts table)
    // - RaceMember.updatedbyid → User.id (must exist in Users table)
    //
    // Debugging Tips:
    // - Check FK constraints if update fails
    // - Verify partId exists in Part table
    // - After update: Check member has updated partId, updatedat, and updatedbyid
    // - Frontend: "Last Updated" should show current user and current time
    // ============================================================

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

