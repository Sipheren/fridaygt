import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendApprovalNotification, sendUserRemovalNotification } from '@/lib/email'
import { isAdmin } from '@/lib/auth-utils'
import { UpdateUserRoleSchema, UpdateUserProfileSchema, validateBody } from '@/lib/validation'
import type { DbUser } from '@/types/database'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    console.log(`Sending user removal notification to ${adminEmails.length} admins:`, adminEmails)

    try {
      await sendUserRemovalNotification(adminEmails, user.email, session.user?.email || 'Admin')
      console.log('User removal notification sent successfully')
    } catch (emailError) {
      console.error('Failed to send removal notification email:', emailError)
    }
  } else {
    console.log('Skipping user removal notification - no admins found or no user email')
  }

  return NextResponse.json({ success: true })
}
