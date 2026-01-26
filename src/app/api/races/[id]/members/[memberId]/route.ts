/**
 * Individual Race Member API
 *
 * DELETE /api/races/[id]/members/[memberId] - Remove member from race (admin only)
 *
 * Debugging Tips:
 * - Admin authorization required
 * - Cascade deletes handled by database constraints
 * - Returns success confirmation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// DELETE /api/races/[id]/members/[memberId] - Remove member from race
export async function DELETE(
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

    // Check admin authorization
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: 'Access denied - only admins can remove race members' },
        { status: 403 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify member exists
    const { data: existingMember, error: fetchError } = await supabase
      .from('RaceMember')
      .select('id, raceId')
      .eq('id', memberId)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Race member not found' }, { status: 404 })
    }

    // Delete the member
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
