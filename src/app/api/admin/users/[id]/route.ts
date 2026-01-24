import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendApprovalNotification, sendUserRemovalNotification } from '@/lib/email'
import { isAdmin } from '@/lib/auth-utils'
import { UpdateUserRoleSchema, validateBody } from '@/lib/validation'
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

  // Validate request body with Zod
  const validationResult = await validateBody(UpdateUserRoleSchema, body)
  if (!validationResult.success) {
    return NextResponse.json({ error: validationResult.error }, { status: 400 })
  }

  const { role } = validationResult.data

  const supabase = createServiceRoleClient()

  // Get user before update to send email
  const { data: user } = await supabase
    .from('User')
    .select('email')
    .eq('id', id)
    .single()

  // Update user role
  const { data, error } = await supabase
    .from('User')
    .update({
      role,
      updatedAt: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }

  // Send approval email if changing from PENDING to USER
  if (user?.email && role === 'USER') {
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
