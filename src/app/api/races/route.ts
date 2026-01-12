import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/races - List all races
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const supabase = createServiceRoleClient()

    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    const carId = searchParams.get('carId')

    let query = supabase
      .from('Race')
      .select(`
        id,
        name,
        description,
        createdat,
        updatedat,
        track:Track(id, name, slug, location, length, category, layout),
        createdby:User(id, name, email),
        raceCars:RaceCar(
          id,
          carId,
          buildId,
          car:Car(id, name, slug, manufacturer, year, category),
          build:CarBuild(id, name, description, isPublic)
        )
      `)
      .order('createdat', { ascending: false })

    // Filter by track if specified
    if (trackId) {
      query = query.eq('trackid', trackId)
    }

    const { data: races, error } = await query

    if (error) {
      console.error('Error fetching races:', error)
      return NextResponse.json(
        { error: 'Failed to fetch races', details: error.message },
        { status: 500 }
      )
    }

    // Filter by car in memory (since it's a nested relation)
    let filteredRaces = races || []
    if (carId) {
      filteredRaces = filteredRaces.filter((race: any) =>
        race.raceCars?.some((rc: any) => rc.carId === carId)
      )
    }

    return NextResponse.json({ races: filteredRaces })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/races - Create a new race
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { trackId, name, description, cars } = body

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

    // Verify all builds exist (if provided)
    const buildsToCheck = cars.filter((c: any) => c.buildId).map((c: any) => c.buildId)
    if (buildsToCheck.length > 0) {
      const { data: buildsData } = await supabase
        .from('CarBuild')
        .select('id')
        .in('id', buildsToCheck)

      if (!buildsData || buildsData.length !== buildsToCheck.length) {
        return NextResponse.json({ error: 'One or more builds not found' }, { status: 404 })
      }
    }

    const now = new Date().toISOString()

    // Create race
    const { data: race, error: raceError } = await supabase
      .from('Race')
      .insert({
        id: crypto.randomUUID(),
        trackid: trackId,
        name: name || null,
        description: description || null,
        createdbyid: userData.id,
        createdat: now,
        updatedat: now,
      })
      .select(`
        id,
        name,
        description,
        createdat,
        updatedat,
        track:Track(id, name, slug, location, length, category, layout),
        createdby:User(id, name, email)
      `)
      .single()

    if (raceError) {
      console.error('Error creating race:', raceError)
      return NextResponse.json(
        { error: 'Failed to create race', details: raceError.message },
        { status: 500 }
      )
    }

    // Create RaceCar entries
    const raceCarsToInsert = cars.map((c: any) => ({
      id: crypto.randomUUID(),
      raceid: race.id,
      carid: c.carId,
      buildid: c.buildId || null,
      createdat: now,
      updatedat: now,
    }))

    const { error: carsError } = await supabase
      .from('RaceCar')
      .insert(raceCarsToInsert)

    if (carsError) {
      console.error('Error creating race cars:', carsError)
      // Clean up the race if cars failed
      await supabase.from('Race').delete().eq('id', race.id)
      return NextResponse.json(
        { error: 'Failed to add cars to race', details: carsError.message },
        { status: 500 }
      )
    }

    // Fetch the created race cars to return in response
    const { data: createdCars } = await supabase
      .from('RaceCar')
      .select(`
        id,
        carId,
        buildId,
        car:Car(id, name, slug, manufacturer, year, category),
        build:CarBuild(id, name, description, isPublic)
      `)
      .eq('raceid', race.id)

    // Attach cars to race
    ;(race as any).raceCars = createdCars || []

    return NextResponse.json({ race }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
