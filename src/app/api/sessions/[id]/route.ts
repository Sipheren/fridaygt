import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/sessions/[id] - Get session details with entries, lap times, and attendance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()

    // Fetch session with full details
    const { data: session, error } = await supabase
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
          createdBy:User!createdById(id, name, email),
          entries:RunListEntry(
            id,
            order,
            notes,
            track:Track(id, name, slug, location, length, category),
            lobbySettings:LobbySettings(*)
          )
        ),
        attendance:SessionAttendance(
          id,
          status,
          joinedAt,
          leftAt,
          user:User(id, name, email)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch cars for each entry from RunListEntryCar
    const runList = session.runList as any
    const entryIds = runList?.entries?.map((e: any) => e.id) || []
    let entryCars: any[] = []

    if (entryIds.length > 0) {
      const { data: carsData } = await supabase
        .from('RunListEntryCar')
        .select(`
          id,
          runListEntryId,
          carId,
          buildId,
          car:Car(id, name, slug, manufacturer, year),
          build:CarBuild(id, name, description, isPublic)
        `)
        .in('runListEntryId', entryIds)

      entryCars = carsData || []
    }

    // Attach cars to each entry
    if (runList?.entries) {
      runList.entries = (runList.entries as any[]).map((entry: any) => {
        const cars = entryCars
          .filter((ec: any) => ec.runListEntryId === entry.id)
          .map((ec: any) => ({
            id: ec.id,
            carId: ec.carId,
            buildId: ec.buildId,
            car: ec.car,
            build: ec.build
          }))

        return {
          ...entry,
          cars
        }
      })

      // Sort entries by order
      runList.entries.sort((a: any, b: any) => a.order - b.order)

      // Update session.runList with the modified entries
      ;(session as any).runList = runList
    }

    // Get lap times for this session
    const { data: lapTimes } = await supabase
      .from('LapTime')
      .select(`
        id,
        timeMs,
        notes,
        conditions,
        createdAt,
        user:User(id, name, email),
        track:Track(id, name, slug),
        car:Car(id, name, slug, manufacturer, year),
        build:CarBuild(id, name, description)
      `)
      .eq('sessionId', id)
      .order('createdAt', { ascending: false })

    return NextResponse.json({
      ...session,
      lapTimes: lapTimes || []
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/sessions/[id] - Update session (status, currentEntryOrder, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, currentEntryOrder, name, date } = body

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

    // Check if session exists and get run list creator
    const { data: existingSession } = await supabase
      .from('RunSession')
      .select(`
        id,
        runList:RunList(createdById)
      `)
      .eq('id', id)
      .single()

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only run list creator can update session
    const runList = existingSession.runList as any
    if (runList?.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Access denied - only the run list creator can manage this session' },
        { status: 403 }
      )
    }

    // Build updates
    const now = new Date().toISOString()
    const updates: any = { updatedAt: now }

    if (status !== undefined) {
      // Validate status
      const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        )
      }
      updates.status = status

      // If starting session, set currentEntryOrder to 1 if not already set
      if (status === 'IN_PROGRESS' && currentEntryOrder === undefined) {
        updates.currentEntryOrder = 1
      }
    }

    if (currentEntryOrder !== undefined) {
      updates.currentEntryOrder = currentEntryOrder
    }

    if (name !== undefined) {
      updates.name = name.trim()
    }

    if (date !== undefined) {
      updates.date = new Date(date).toISOString()
    }

    // Update session
    const { data: updatedSession, error } = await supabase
      .from('RunSession')
      .update(updates)
      .eq('id', id)
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
      console.error('Error updating session:', error)
      return NextResponse.json(
        { error: 'Failed to update session', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check ownership
    const { data: existingSession } = await supabase
      .from('RunSession')
      .select(`
        id,
        runList:RunList(createdById)
      `)
      .eq('id', id)
      .single()

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const runList = existingSession.runList as any
    if (runList?.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Access denied - only the run list creator can delete this session' },
        { status: 403 }
      )
    }

    // Delete session (attendance and lap time links will cascade)
    const { error } = await supabase
      .from('RunSession')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting session:', error)
      return NextResponse.json(
        { error: 'Failed to delete session', details: error.message },
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
