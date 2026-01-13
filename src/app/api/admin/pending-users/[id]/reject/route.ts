import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// POST /api/admin/pending-users/[id]/reject - Reject a pending user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.id
    const body = await request.json()
    const { reason } = body

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

    // Delete the user (cascade will handle next_auth records)
    const { error: deleteError } = await supabase
      .from('User')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error rejecting user:', deleteError)
      return NextResponse.json({ error: 'Failed to reject user' }, { status: 500 })
    }

    // Optionally send rejection email
    // (Skipping for now, but could be added)

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name }
    })
  } catch (error) {
    console.error('Error in POST /api/admin/pending-users/[id]/reject:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
