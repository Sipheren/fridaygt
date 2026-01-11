import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// PATCH /api/lap-times/[id] - Update a lap time
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { timeMs, notes, conditions, buildId, sessionType } = body

    // Validation
    if (timeMs !== undefined) {
      if (typeof timeMs !== 'number' || timeMs <= 0) {
        return NextResponse.json(
          { error: 'timeMs must be a positive number' },
          { status: 400 }
        )
      }

      // Reasonable lap time validation (between 10 seconds and 30 minutes)
      if (timeMs < 10000 || timeMs > 1800000) {
        return NextResponse.json(
          { error: 'Lap time must be between 10 seconds and 30 minutes' },
          { status: 400 }
        )
      }
    }

    // Validate sessionType if provided
    if (sessionType !== undefined && !['Q', 'R'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'sessionType must be either Q or R' },
        { status: 400 }
      )
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

    // Check if lap time exists and belongs to user
    const { data: existingLapTime } = await supabase
      .from('LapTime')
      .select('id, userId')
      .eq('id', id)
      .single()

    if (!existingLapTime) {
      return NextResponse.json({ error: 'Lap time not found' }, { status: 404 })
    }

    if (existingLapTime.userId !== userData.id) {
      return NextResponse.json(
        { error: 'You can only edit your own lap times' },
        { status: 403 }
      )
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    }

    if (timeMs !== undefined) updates.timeMs = timeMs
    if (notes !== undefined) updates.notes = notes || null
    if (conditions !== undefined) updates.conditions = conditions || null
    if (buildId !== undefined) updates.buildId = buildId || null
    if (sessionType !== undefined) updates.sessionType = sessionType

    // Update lap time
    const { data: lapTime, error } = await supabase
      .from('LapTime')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        timeMs,
        notes,
        conditions,
        sessionType,
        createdAt,
        updatedAt,
        track:Track(id, name, slug, location, category, layout),
        car:Car(id, name, slug, manufacturer, year, category),
        build:CarBuild(id, name, description, isPublic)
      `)
      .single()

    if (error) {
      console.error('Error updating lap time:', error)
      return NextResponse.json(
        { error: 'Failed to update lap time', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ lapTime })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
