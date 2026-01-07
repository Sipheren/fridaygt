import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// GET /api/sessions/tonight - Get the current active session (if any)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Find the most recent IN_PROGRESS session
    const { data: activeSession, error } = await supabase
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
            car:Car(id, name, slug, manufacturer, year),
            build:CarBuild(id, name, description, isPublic),
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
      .eq('status', 'IN_PROGRESS')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active session:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active session' },
        { status: 500 }
      )
    }

    // If no active session, return null
    if (!activeSession) {
      return NextResponse.json({ session: null })
    }

    // Sort entries by order
    if (activeSession.runList?.entries) {
      activeSession.runList.entries.sort((a: any, b: any) => a.order - b.order)
    }

    // Get the current entry based on currentEntryOrder
    let currentEntry = null
    if (activeSession.currentEntryOrder && activeSession.runList?.entries) {
      currentEntry = activeSession.runList.entries.find(
        (entry: any) => entry.order === activeSession.currentEntryOrder
      )
    }

    // Get statistics
    const totalEntries = activeSession.runList?.entries?.length || 0
    const completedEntries = activeSession.currentEntryOrder
      ? activeSession.currentEntryOrder - 1
      : 0

    return NextResponse.json({
      session: activeSession,
      currentEntry,
      progress: {
        total: totalEntries,
        completed: completedEntries,
        remaining: totalEntries - completedEntries,
        currentPosition: activeSession.currentEntryOrder || 0
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
