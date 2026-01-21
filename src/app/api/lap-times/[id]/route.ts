import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// DELETE /api/lap-times/[id] - Delete a lap time
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceRoleClient()

    // Get user's ID
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if lap time exists and belongs to user
    const { data: lapTime } = await supabase
      .from('LapTime')
      .select('id, userId')
      .eq('id', id)
      .single()

    if (!lapTime) {
      return NextResponse.json({ error: 'Lap time not found' }, { status: 404 })
    }

    if (lapTime.userId !== userData.id) {
      return NextResponse.json(
        { error: 'You can only delete your own lap times' },
        { status: 403 }
      )
    }

    // Delete lap time
    const { error } = await supabase
      .from('LapTime')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting lap time:', error)
      return NextResponse.json(
        { error: 'Failed to delete lap time' },
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
