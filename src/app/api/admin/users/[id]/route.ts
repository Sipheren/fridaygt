/**
 * Admin User Management API
 *
 * PATCH /api/admin/users/[id] - Update user role or profile (admin only)
 * DELETE /api/admin/users/[id] - Delete user including next_auth records (admin only)
 *
 * Purpose: Allow admins to manage user roles and profiles
 * - PATCH: Change user roles (PENDING→USER), update gamertags, edit names
 * - DELETE: Remove users with cascade to next_auth records
 *
 * PATCH Endpoint:
 * - Supports role changes (PENDING → USER, USER → ADMIN, etc.)
 * - Supports profile updates (gamertag, name)
 * - Validates gamertag uniqueness (must be unique across all users)
 * - Email notification sent on PENDING→USER role change only
 * - Multiple validation schemas (UpdateUserRoleSchema, UpdateUserProfileSchema)
 *
 * DELETE Endpoint:
 * - Deletes user from public.User table
 * - Cascades to next_auth schema (sessions → accounts → users)
 * - All admins notified when user is deleted
 * - Permanent deletion (no soft delete, no undo)
 *
 * Role Management:
 * - PENDING: Awaiting approval (can view admin dashboard)
 * - USER: Full access to approved features
 * - ADMIN: Full access + admin tools
 * - Role changes logged in updatedAt timestamp
 *
 * Security:
 * - Admin-only endpoints (verified via isAdmin())
 * - Gamertag uniqueness enforced at database level
 * - No self-approval (admin must be different user)
 *
 * Debugging Tips:
 * - PATCH: Common error "Gamertag already taken" - check existing gamertags
 * - PATCH: Email notifications only for PENDING→USER (not USER→ADMIN)
 * - DELETE: Foreign key constraints require specific deletion order
 * - DELETE: Check logs for email notification failures
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
  // ============================================================
  // RATE LIMITING & AUTHORIZATION
  // ============================================================
  // Apply rate limiting: 20 requests per minute to prevent abuse
  // Debugging: Check rate limit headers in response if 429 errors occur
  // Admin-only: Only admins can update user roles/profiles
  // Debugging: Check user role is ADMIN
  // ============================================================

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

  // ============================================================
  // BUILD UPDATE DATA
  // ============================================================
  // Supports two types of updates:
  // 1. Role updates: PENDING → USER, USER → ADMIN, etc.
  // 2. Profile updates: gamertag, name
  //
  // Validates against two schemas:
  // - UpdateUserRoleSchema: role field
  // - UpdateUserProfileSchema: gamertag, name fields
  //
  // updatedAt always updated (audit trail)
  // ============================================================

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
    //
    // Why Excluding Current User?
    // - User can update their profile without changing gamertag
    // - Prevents "Gamertag already taken" when no change made
    // - Simplifies profile editing workflow
    //
    // Debugging Tips:
    // - Check User table for existing gamertag (excluding current user)
    // - Common error: "Gamertag already taken" - choose different gamertag
    // - Frontend: Show "Gamertag available" indicator in real-time
    // ============================================================

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

  // ============================================================
  // FETCH USER BEFORE UPDATE (FOR EMAIL NOTIFICATION)
  // ============================================================
  // Get user data before update to determine email notification
  // Only send email if role changes from PENDING to USER
  // Need: email (for sending), role (to check old role)
  //
  // Email Notification Logic:
  // - Send if: old role = PENDING AND new role = USER
  // - Don't send: USER → ADMIN (demotions, role changes)
  // - Don't send: Profile updates (gamertag, name)
  //
  // Debugging Tips:
  // - Check email is valid format before sending
  // - Verify role comparison works (PENDING → USER only)
  // - Email failures logged but don't block update
  // ============================================================

  const { data: user } = await supabase
    .from('User')
    .select('email, role')
    .eq('id', id)
    .single()

  // ============================================================
  // UPDATE USER
  // ============================================================
  // Update user record with validated changes
  // - role: New role (if provided)
  // - gamertag: New gamertag (if provided)
  // - name: New name (if provided)
  // - updatedAt: Current timestamp
  //
  // Debugging Tips:
  // - Check User table for id before update
  // - Verify updateData has at least one field besides updatedAt
  // - Check FK constraints if update fails
  // - Frontend: Refresh user data after update
  // ============================================================

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

  // ============================================================
  // SEND APPROVAL EMAIL (PENDING → USER ONLY)
  // ============================================================
  // Send approval email if changing from PENDING to USER
  // This is the only scenario that triggers email notification
  //
  // Email Notification Logic:
  // - Send if: old role = PENDING AND new role = USER
  // - Don't send: USER → ADMIN (demotions, role changes)
  // - Don't send: Profile updates (gamertag, name)
  // - Email contains login link and profile completion instructions
  //
  // Debugging Tips:
  // - Check sendApprovalNotification function in lib/email.tsx
  // - Email failures logged but don't block update (non-blocking)
  // - Verify RESEND_API_KEY and EMAIL_FROM are set
  // - Check spam folder if email not received
  // ============================================================

  if (user?.email && updateData.role === 'USER' && user.role === 'PENDING') {
    try {
      await sendApprovalNotification(user.email, true)
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({ user: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ============================================================
  // RATE LIMITING & AUTHORIZATION
  // ============================================================
  // Apply rate limiting: 20 requests per minute to prevent abuse
  // Debugging: Check rate limit headers in response if 429 errors occur
  // Admin-only: Only admins can delete users
  // Debugging: Check user role is ADMIN
  // ============================================================

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

  // ============================================================
  // FETCH USER DATA (FOR NOTIFICATION)
  // ============================================================
  // Get user email before deletion
  // Used for admin notification email
  //
  // Notification Strategy:
  // - All admins notified when user is deleted
  // - Helps maintain audit trail
  // - Prevents accidental deletions going unnoticed
  //
  // Debugging Tips:
  // - Check user.email is valid format
  // - Verify admin notification emails are valid
  // ============================================================

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
  // Deletion order is CRITICAL due to foreign key constraints
  //
  // Foreign Key Chain:
  // next_auth.sessions.userId → next_auth.users.id
  // next_auth.accounts.userId → next_auth.users.id
  // public.User.id (self-referencing FK)
  //
  // Deletion Order:
  // 1. sessions (references userId) - DELETE FIRST
  // 2. accounts (references userId) - DELETE SECOND
  // 3. users (next_auth schema) - uses 'id' column, not 'userId' - DELETE THIRD
  // 4. User (public schema) - done last via main query - DELETE FOURTH
  //
  // Why This Order?
  // - Must delete dependents before deleting referenced record
  // - Prevents foreign key constraint violations
  // - next_auth tables have circular dependencies requiring specific order
  //
  // Debugging Tips:
  // - Common error: "Foreign key violation" - check deletion order
  // - Verify all next_auth tables are cleaned up
  // - Check console logs for FK errors if deletion fails
  // - After deletion: User completely removed from all tables
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

  // ============================================================
  // SEND ADMIN NOTIFICATION
  // ============================================================
  // Send notification to ALL admins about user deletion
  // Prevents accidental deletions going unnoticed
  // Maintains audit trail of admin actions
  //
  // Notification Logic:
  // - All admins receive email (not just deleting admin)
  // - Email includes: deleted user email, deleting admin
  // - Non-blocking failure: Email failures don't block deletion
  //
  // Debugging Tips:
  // - Check sendUserRemovalNotification function in lib/email.tsx
  // - Email failures logged but don't block deletion
  // - Verify RESEND_API_KEY and EMAIL_FROM are set
  // - Check spam folder if admin emails not received
  // ============================================================

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
