import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/run-lists/active - Get the active run list for the current user
export async function GET(request: NextRequest) {
  try {
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

    // Fetch active run list for this user
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
          createdAt,
          updatedAt,
          track:Track(id, name, slug, layout, location, length, category),
          lobbySettings:LobbySettings(*)
        )
      `)
      .eq('createdById', userData.id)
      .eq('isActive', true)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active run list:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active run list' },
        { status: 500 }
      )
    }

    // Fetch cars for each entry from RunListEntryCar
    if (runList?.entries) {
      const entryIds = runList.entries.map((e: any) => e.id)
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
      runList.entries = runList.entries.map((entry: any) => {
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

    return NextResponse.json({ runList })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
