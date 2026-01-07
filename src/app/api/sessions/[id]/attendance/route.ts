import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/sessions/[id]/attendance - Get attendance list for session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const supabase = createServiceRoleClient()

    // Verify session exists
    const { data: session } = await supabase
      .from('RunSession')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get all attendance records
    const { data: attendance, error } = await supabase
      .from('SessionAttendance')
      .select(`
        id,
        status,
        joinedAt,
        leftAt,
        user:User(id, name, email)
      `)
      .eq('sessionId', sessionId)
      .order('joinedAt', { ascending: true })

    if (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attendance' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sessions/[id]/attendance - Join session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Verify session exists
    const { data: sessionData } = await supabase
      .from('RunSession')
      .select('id, status')
      .eq('id', sessionId)
      .single()

    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if user is already attending
    const { data: existingAttendance } = await supabase
      .from('SessionAttendance')
      .select('id, status')
      .eq('sessionId', sessionId)
      .eq('userId', userData.id)
      .maybeSingle()

    if (existingAttendance) {
      // If user previously left, allow them to rejoin
      if (existingAttendance.status === 'LEFT') {
        const { data: updatedAttendance, error } = await supabase
          .from('SessionAttendance')
          .update({
            status: 'PRESENT',
            leftAt: null
          })
          .eq('id', existingAttendance.id)
          .select(`
            id,
            status,
            joinedAt,
            leftAt,
            user:User(id, name, email)
          `)
          .single()

        if (error) {
          console.error('Error rejoining session:', error)
          return NextResponse.json(
            { error: 'Failed to rejoin session', details: error.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ attendance: updatedAttendance })
      }

      // User is already attending
      return NextResponse.json(
        { error: 'Already attending this session' },
        { status: 400 }
      )
    }

    // Create attendance record
    const now = new Date().toISOString()
    const { data: attendance, error } = await supabase
      .from('SessionAttendance')
      .insert({
        id: crypto.randomUUID(),
        sessionId,
        userId: userData.id,
        status: 'PRESENT',
        joinedAt: now,
      })
      .select(`
        id,
        status,
        joinedAt,
        leftAt,
        user:User(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error joining session:', error)
      return NextResponse.json(
        { error: 'Failed to join session', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ attendance }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id]/attendance - Leave session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Find user's attendance record
    const { data: attendance } = await supabase
      .from('SessionAttendance')
      .select('id, status')
      .eq('sessionId', sessionId)
      .eq('userId', userData.id)
      .single()

    if (!attendance) {
      return NextResponse.json(
        { error: 'Not attending this session' },
        { status: 404 }
      )
    }

    if (attendance.status === 'LEFT') {
      return NextResponse.json(
        { error: 'Already left this session' },
        { status: 400 }
      )
    }

    // Update attendance to LEFT
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('SessionAttendance')
      .update({
        status: 'LEFT',
        leftAt: now
      })
      .eq('id', attendance.id)

    if (error) {
      console.error('Error leaving session:', error)
      return NextResponse.json(
        { error: 'Failed to leave session', details: error.message },
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
