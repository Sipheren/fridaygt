/**
 * User Rejection API
 *
 * POST /api/admin/pending-users/[id]/reject - Reject and delete pending user (admin only)
 *
 * Debugging Tips:
 * - Admin-only endpoint
 * - Only PENDING users can be rejected (role check)
 * - Rejection reason (optional) logged for audit trail
 * - User is deleted from database (no soft delete)
 * - next_auth records cascade deleted via foreign key
 * - No email sent to rejected user (security/privacy)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isAdmin } from '@/lib/auth-utils'
import { logAdminAction } from '@/lib/audit-log'
import { checkRateLimit, RateLimit, rateLimitHeaders } from '@/lib/rate-limit'

interface RejectUserBody {
  reason?: string
}

// POST /api/admin/pending-users/[id]/reject - Reject a pending user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ============================================================
  // RATE LIMITING
  // ============================================================
  // Apply rate limiting: 20 requests per minute for mutations
  // Prevents rapid approval/rejection spam
  // ============================================================

  const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: userId } = await params

    // Parse and validate request body
    let body: RejectUserBody = {}
    try {
      body = await request.json()
    } catch {
      // Body is optional, default to empty object
    }

    const { reason } = body

    // Validate reason if provided
    if (reason !== undefined && typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Reason must be a string' },
        { status: 400 }
      )
    }

    if (reason !== undefined && reason.length > 500) {
      return NextResponse.json(
        { error: 'Reason must be 500 characters or less' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get the user to reject
    const { data: user, error: fetchError } = await supabase
      .from('User')
      .select('id, email, name, role')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'PENDING') {
      return NextResponse.json({ error: 'User is not pending' }, { status: 400 })
    }

    // Log rejection to audit log (replaces console.error logging)
    await logAdminAction({
      adminId: session.user.id,
      action: 'REJECT_USER',
      targetId: userId,
      targetType: 'User',
      details: {
        userEmail: user.email,
        userName: user.name,
        reason: reason || 'No reason provided'
      }
    })

    // Delete the user (cascade will handle next_auth records)
    const { error: deleteError } = await supabase
      .from('User')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error rejecting user:', deleteError)
      return NextResponse.json({ error: 'Failed to reject user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name }
    })
  } catch (error) {
    console.error('Error in POST /api/admin/pending-users/[id]/reject:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
