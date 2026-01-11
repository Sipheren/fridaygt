import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// POST /api/run-lists/[id]/entries - Add entry to run list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runListId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { trackId, cars, lobbySettingsId, notes } = body

    // Validation
    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    if (!cars || !Array.isArray(cars) || cars.length === 0) {
      return NextResponse.json(
        { error: 'At least one car is required' },
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

    // Check ownership of run list
    const { data: runList } = await supabase
      .from('RunList')
      .select('createdById')
      .eq('id', runListId)
      .single()

    if (!runList || runList.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Access denied - only the creator can edit this run list' },
        { status: 403 }
      )
    }

    // Verify track exists
    const { data: track } = await supabase
      .from('Track')
      .select('id')
      .eq('id', trackId)
      .single()

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Verify all cars exist
    const carIds = cars.map((c: any) => c.carId)
    const { data: carsData } = await supabase
      .from('Car')
      .select('id')
      .in('id', carIds)

    if (!carsData || carsData.length !== carIds.length) {
      return NextResponse.json({ error: 'One or more cars not found' }, { status: 404 })
    }

    // Get the next order number
    const { data: entries } = await supabase
      .from('RunListEntry')
      .select('order')
      .eq('runListId', runListId)
      .order('order', { ascending: false })
      .limit(1)

    const nextOrder = entries && entries.length > 0 ? entries[0].order + 1 : 1

    // Create entry
    const now = new Date().toISOString()
    const { data: entry, error } = await supabase
      .from('RunListEntry')
      .insert({
        id: crypto.randomUUID(),
        runListId,
        order: nextOrder,
        trackId,
        lobbySettingsId: lobbySettingsId || null,
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .select(`
        id,
        order,
        notes,
        createdAt,
        updatedAt,
        track:Track(id, name, slug, location, length, category),
        lobbySettings:LobbySettings(*)
      `)
      .single()

    if (error) {
      console.error('Error creating entry:', error)
      return NextResponse.json(
        { error: 'Failed to create entry', details: error.message },
        { status: 500 }
      )
    }

    // Create RunListEntryCar records for each car
    const entryCarsToInsert = cars.map((c: any) => ({
      id: crypto.randomUUID(),
      runListEntryId: entry.id,
      carId: c.carId,
      buildId: c.buildId || null,
      createdAt: now,
      updatedAt: now,
    }))

    const { error: carsError } = await supabase
      .from('RunListEntryCar')
      .insert(entryCarsToInsert)

    if (carsError) {
      console.error('Error creating entry cars:', carsError)
      // Clean up the entry if cars failed
      await supabase.from('RunListEntry').delete().eq('id', entry.id)
      return NextResponse.json(
        { error: 'Failed to add cars to entry', details: carsError.message },
        { status: 500 }
      )
    }

    // Fetch the created entry cars to return in response
    const { data: createdCars } = await supabase
      .from('RunListEntryCar')
      .select(`
        id,
        carId,
        buildId,
        car:Car(id, name, slug, manufacturer, year),
        build:CarBuild(id, name, description, isPublic)
      `)
      .eq('runListEntryId', entry.id)

    // Attach cars to entry
    ;(entry as any).cars = createdCars || []

    // Update run list updatedAt
    await supabase
      .from('RunList')
      .update({ updatedAt: now })
      .eq('id', runListId)

    // Log the edit
    await supabase.from('RunListEdit').insert({
      id: crypto.randomUUID(),
      runListId,
      userId: userData.id,
      action: 'ADD_ENTRY',
      details: JSON.stringify({ entryId: entry.id, trackId, cars, order: nextOrder }),
      createdAt: now
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/run-lists/[id]/entries - Reorder or update entries
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runListId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entryId, newOrder, notes, buildId, lobbySettingsId } = body

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
      .eq('id', runListId)
      .single()

    if (!runList || runList.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()
    const updates: any = { updatedAt: now }

    if (newOrder !== undefined) updates.order = newOrder
    if (notes !== undefined) updates.notes = notes || null
    if (buildId !== undefined) updates.buildId = buildId || null
    if (lobbySettingsId !== undefined) updates.lobbySettingsId = lobbySettingsId || null

    // Update entry
    const { data: entry, error } = await supabase
      .from('RunListEntry')
      .update(updates)
      .eq('id', entryId)
      .eq('runListId', runListId)
      .select(`
        id,
        order,
        notes,
        createdAt,
        updatedAt,
        track:Track(id, name, slug, location, length, category),
        car:Car(id, name, slug, manufacturer, year),
        build:CarBuild(id, name, description, isPublic),
        lobbySettings:LobbySettings(*)
      `)
      .single()

    if (error) {
      console.error('Error updating entry:', error)
      return NextResponse.json(
        { error: 'Failed to update entry', details: error.message },
        { status: 500 }
      )
    }

    // Update run list updatedAt
    await supabase
      .from('RunList')
      .update({ updatedAt: now })
      .eq('id', runListId)

    // Log the edit
    await supabase.from('RunListEdit').insert({
      id: crypto.randomUUID(),
      runListId,
      userId: userData.id,
      action: 'UPDATE_ENTRY',
      details: JSON.stringify({ entryId, updates }),
      createdAt: now
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/run-lists/[id]/entries/[entryId] is handled in a separate file
