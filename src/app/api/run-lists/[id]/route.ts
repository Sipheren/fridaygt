import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/run-lists/[id] - Get a single run list with entries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()

    // Fetch run list with entries
    const { data: runList, error } = await supabase
      .from('RunList')
      .select(`
        id,
        name,
        description,
        isPublic,
        isActive,
        isLive,
        createdAt,
        updatedAt,
        createdBy:User!createdById(id, name, email),
        entries:RunListEntry(
          id,
          order,
          notes,
          raceId,
          createdAt,
          updatedAt,
          track:Track(id, name, slug, location, length, category),
          lobbySettings:LobbySettings(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !runList) {
      return NextResponse.json({ error: 'Run list not found' }, { status: 404 })
    }

    // Fetch cars for each entry from RunListEntryCar
    const entryIds = runList.entries?.map((e: any) => e.id) || []
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
    if (runList.entries) {
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
    }

    // Check privacy - public lists or owner can view
    if (!runList.isPublic) {
      const session = await auth()
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      const createdBy = runList.createdBy as any
      if (userData?.id !== createdBy?.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Sort entries by order
    if (runList.entries) {
      runList.entries.sort((a: any, b: any) => a.order - b.order)
    }

    return NextResponse.json(runList)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/run-lists/[id] - Update a run list
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
    const { name, description, isPublic, isActive, isLive } = body

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
    const { data: existingRunList } = await supabase
      .from('RunList')
      .select('createdById')
      .eq('id', id)
      .single()

    if (!existingRunList || existingRunList.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Access denied - only the creator can edit this run list' },
        { status: 403 }
      )
    }

    // If setting this run list to active, deactivate all other run lists for this user
    if (isActive === true) {
      await supabase
        .from('RunList')
        .update({ isActive: false })
        .eq('createdById', userData.id)
        .neq('id', id)
    }

    // If setting this run list to live, un-live all other run lists globally
    if (isLive === true) {
      await supabase
        .from('RunList')
        .update({ isLive: false })
        .neq('id', id)
    }

    // Update run list
    const updates: any = {
      updatedAt: new Date().toISOString()
    }

    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (isPublic !== undefined) updates.isPublic = isPublic
    if (isActive !== undefined) updates.isActive = isActive
    if (isLive !== undefined) updates.isLive = isLive

    const { data: runList, error } = await supabase
      .from('RunList')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        name,
        description,
        isPublic,
        isActive,
        isLive,
        createdAt,
        updatedAt,
        createdBy:User!createdById(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating run list:', error)
      return NextResponse.json(
        { error: 'Failed to update run list', details: error.message },
        { status: 500 }
      )
    }

    // Log the edit
    await supabase.from('RunListEdit').insert({
      id: crypto.randomUUID(),
      runListId: id,
      userId: userData.id,
      action: 'UPDATE',
      details: JSON.stringify({ name, description, isPublic }),
      createdAt: new Date().toISOString()
    })

    return NextResponse.json(runList)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/run-lists/[id] - Delete a run list
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
    const { data: runList } = await supabase
      .from('RunList')
      .select('createdById')
      .eq('id', id)
      .single()

    if (!runList || runList.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Access denied - only the creator can delete this run list' },
        { status: 403 }
      )
    }

    // Delete run list (entries will cascade delete)
    const { error } = await supabase
      .from('RunList')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting run list:', error)
      return NextResponse.json(
        { error: 'Failed to delete run list', details: error.message },
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
