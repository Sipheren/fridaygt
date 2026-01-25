/**
 * Admin User Management API
 *
 * PATCH /api/admin/users/[id] - Update user role or profile (admin only)
 * DELETE /api/admin/users/[id] - Delete user including next_auth records (admin only)
 *
 * Debugging Tips:
 * - Admin-only endpoints (verified via isAdmin())
 * - PATCH supports both role changes (PENDING→USER) and profile updates (name, gamertag)
 * - Email notification sent on PENDING→USER role change only
 * - DELETE handles foreign key dependencies: sessions → accounts → users → User
 * - All admins notified when a user is deleted
 */

import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendApprovalNotification, sendUserRemovalNotification } from '@/lib/email'
import { isAdmin } from '@/lib/auth-utils'
import { UpdateUserRoleSchema, UpdateUserProfileSchema, validateBody } from '@/lib/validation'
import type { DbUser } from '@/types/database'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  const session = await auth()

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const supabase = createServiceRoleClient()

  // Build update data - supports both role and profile updates
  const updateData: {
    role?: string
    name?: string | null
    gamertag?: string | null
    updatedAt: string
  } = {
    updatedAt: new Date().toISOString()
  }

  // Validate role update
  const validationResult1 = await validateBody(UpdateUserRoleSchema, body)
  if (validationResult1.success) {
    const { role } = validationResult1.data
    updateData.role = role
  }

  // Validate profile update
  const validationResult2 = await validateBody(UpdateUserProfileSchema, body)
  if (validationResult2.success) {
    const { gamertag, name } = validationResult2.data

    // ============================================================
    // GAMERTAG UNIQUENESS CHECK
    // ============================================================
    // Gamertags must be unique across all users
    // Check excludes current user (neq('id', id))
    // This allows users to keep their existing gamertag
    // ============================================================

    // Check gamertag uniqueness if it's being updated
    if (gamertag !== undefined) {
      const { data: existingUser } = await supabase
        .from('User')
        .select('id')
        .eq('gamertag', gamertag)
        .neq('id', id)
        .single()

      if (existingUser) {
        return NextResponse.json({ error: 'Gamertag already taken' }, { status: 400 })
      }

      updateData.gamertag = gamertag
    }

    if (name !== undefined) {
      updateData.name = name
    }
  }

  // If neither validation passed, return error
  if (!validationResult1.success && !validationResult2.success) {
    return NextResponse.json(
      { error: validationResult1.error || validationResult2.error },
      { status: 400 }
    )
  }

  // Get user before update to send email (only if role is being changed)
  const { data: user } = await supabase
    .from('User')
    .select('email, role')
    .eq('id', id)
    .single()

  // Update user
  const { data, error } = await supabase
    .from('User')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }

  // Send approval email if changing from PENDING to USER
  if (user?.email && updateData.role === 'USER' && user.role === 'PENDING') {
    try {
      await sendApprovalNotification(user.email, true)
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
    }
  }

  return NextResponse.json({ user: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  const session = await auth()

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const supabase = createServiceRoleClient()

  // Get user email before deletion
  const { data: user } = await supabase
    .from('User')
    .select('email')
    .eq('id', id)
    .single()

  // Get all admin emails for notification
  const { data: admins } = await supabase
    .from('User')
    .select('email')
    .eq('role', 'ADMIN')

  // ============================================================
  // NEXT_AUTH FOREIGN KEY DELETION
  // ============================================================
  // Deletion order is critical due to foreign key constraints:
  // 1. sessions (references userId)
  // 2. accounts (references userId)
  // 3. users (next_auth schema) - uses 'id' column, not 'userId'
  // 4. User (public schema) - done last via main query
  // ============================================================

  // Delete from next_auth schema first (foreign key dependencies)
  // Order matters: sessions → accounts → users
  await supabase
    .schema('next_auth')
    .from('sessions')
    .delete()
    .eq('userId', id)

  await supabase
    .schema('next_auth')
    .from('accounts')
    .delete()
    .eq('userId', id)

  await supabase
    .schema('next_auth')
    .from('users')
    .delete()
    .eq('id', id)

  // Delete from public.User
  const { error } = await supabase
    .from('User')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }

  // Send notification to ALL admins
  if (user?.email && admins && admins.length > 0) {
    const adminEmails = admins
      .map((a: any) => a.email)
      .filter((e: string | null): e is string => e !== null && e !== '')

    try {
      await sendUserRemovalNotification(adminEmails, user.email, session.user?.email || 'Admin')
    } catch (emailError) {
      console.error('Failed to send removal notification email:', emailError)
    }
  }

  return NextResponse.json({ success: true })
}
