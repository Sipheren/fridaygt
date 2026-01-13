import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendApprovalNotification } from '@/lib/email'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { role } = await request.json()

  if (!['PENDING', 'USER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
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

  if (!session || (session.user as any)?.role !== 'ADMIN') {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send rejection email
  if (user?.email) {
    try {
      await sendApprovalNotification(user.email, false)
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError)
    }
  }

  return NextResponse.json({ success: true })
}
