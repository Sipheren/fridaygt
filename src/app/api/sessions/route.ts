import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/sessions - List sessions with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    const runListId = searchParams.get('runListId')
    const myAttending = searchParams.get('myAttending') === 'true'

    // Build query
    let query = supabase
      .from('RunSession')
      .select(`
        id,
        name,
        date,
        currentEntryOrder,
        status,
        createdAt,
        updatedAt,
        runList:RunList(
          id,
          name,
          description,
          isPublic,
          createdBy:User!createdById(id, name, email)
        ),
        attendance:SessionAttendance(
          count,
          userId
        )
      `)
      .order('date', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (runListId) {
      query = query.eq('runListId', runListId)
    }

    if (myAttending) {
      const session = await auth()
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Filter to sessions where user is attending
      query = query.eq('attendance.userId', userData.id)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create a new session from a run list
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { runListId, name, date, status } = body

    // Validation
    if (!runListId) {
      return NextResponse.json(
        { error: 'runListId is required' },
        { status: 400 }
      )
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Session name is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify run list exists
    const { data: runList } = await supabase
      .from('RunList')
      .select('id, name, createdById')
      .eq('id', runListId)
      .single()

    if (!runList) {
      return NextResponse.json({ error: 'Run list not found' }, { status: 404 })
    }

    // Get user's ID
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create session
    const now = new Date().toISOString()
    const sessionDate = date ? new Date(date).toISOString() : now

    const { data: newSession, error } = await supabase
      .from('RunSession')
      .insert({
        id: crypto.randomUUID(),
        runListId,
        name: name.trim(),
        date: sessionDate,
        status: status || 'SCHEDULED',
        currentEntryOrder: null, // Will be set when session starts
        createdAt: now,
        updatedAt: now,
      })
      .select(`
        id,
        name,
        date,
        currentEntryOrder,
        status,
        createdAt,
        updatedAt,
        runList:RunList(
          id,
          name,
          description,
          isPublic,
          createdBy:User!createdById(id, name, email)
        )
      `)
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json(
        { error: 'Failed to create session', details: error.message },
        { status: 500 }
      )
    }

    // Automatically add creator to attendance
    await supabase.from('SessionAttendance').insert({
      id: crypto.randomUUID(),
      sessionId: newSession.id,
      userId: userData.id,
      status: 'PRESENT',
      joinedAt: now,
    })

    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
