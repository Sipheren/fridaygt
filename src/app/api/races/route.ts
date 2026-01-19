import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/races - List all races with run list associations
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Fetch all races
    const { data: races, error: racesError } = await supabase
      .from('Race')
      .select('*')
      .order('createdAt', { ascending: false })

    if (racesError) {
      console.error('Error fetching races:', racesError)
      return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
    }

    console.log('Fetched races:', races?.length)

    // Fetch related data for each race separately
    const enrichedRaces = await Promise.all(
      (races || []).map(async (race: any) => {
        // Get track info
        const { data: track } = await supabase
          .from('Track')
          .select('*')
          .eq('id', race.trackId)
          .single()

        // Get race cars with car info
        const { data: raceCars } = await supabase
          .from('RaceCar')
          .select(`
            id,
            carId,
            buildId,
            car:Car(id, name, slug, manufacturer)
          `)
          .eq('raceId', race.id)

        // Get run lists using this race
        const { data: runListEntries } = await supabase
          .from('RunListEntry')
          .select(`
            runListId,
            runList:RunList(id, name, isPublic)
          `)
          .eq('raceId', race.id)

        // Deduplicate run lists
        const runListMap = new Map<string, any>()
        runListEntries?.forEach((entry: any) => {
          if (entry.runList && !runListMap.has(entry.runList.id)) {
            runListMap.set(entry.runList.id, entry.runList)
          }
        })
        const runLists = Array.from(runListMap.values())

        return {
          ...race,
          track,
          RaceCar: raceCars || [],
          runLists,
          runListCount: runLists.length
        }
      })
    )

    // Sort: Active first, then by display name
    const sortedRaces = enrichedRaces.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1
      }
      return getDisplayName(a).localeCompare(getDisplayName(b))
    })

    return NextResponse.json({ races: sortedRaces })
  } catch (error) {
    console.error('Error fetching races:', error)
    return NextResponse.json(
      { error: 'Failed to fetch races' },
      { status: 500 }
    )
  }
}

// Helper function to generate display name for races without custom names
function getDisplayName(race: any): string {
  if (race.name) {
    return race.name
  }

  const trackName = race.track?.name || 'Unknown Track'
  const firstCar = race.RaceCar?.[0]?.car
  const carName = firstCar ? `${firstCar.manufacturer} ${firstCar.name}` : 'Unknown Car'

  return `${trackName} + ${carName}`
}

// POST /api/races - Create a new race with builds
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { trackId, buildIds, name, description, laps, weather, isActive } = body

    // Validation
    if (!trackId) {
      return NextResponse.json({ error: 'trackId is required' }, { status: 400 })
    }

    if (!buildIds || !Array.isArray(buildIds) || buildIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one buildId is required' },
        { status: 400 }
      )
    }

    if (weather && !['dry', 'wet'].includes(weather)) {
      return NextResponse.json(
        { error: 'weather must be either "dry" or "wet"' },
        { status: 400 }
      )
    }

    if (laps !== undefined && (typeof laps !== 'number' || laps < 1)) {
      return NextResponse.json(
        { error: 'laps must be a positive number' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify track exists
    const { data: track, error: trackError } = await supabase
      .from('Track')
      .select('id')
      .eq('id', trackId)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Verify all builds exist and get their car IDs
    const { data: builds, error: buildsError } = await supabase
      .from('CarBuild')
      .select('id, carId, car:Car(id, name, slug, manufacturer)')
      .in('id', buildIds)

    if (buildsError) {
      console.error('Error fetching builds:', buildsError)
      return NextResponse.json(
        { error: 'Failed to verify builds' },
        { status: 500 }
      )
    }

    if (!builds || builds.length !== buildIds.length) {
      return NextResponse.json(
        { error: 'One or more builds not found' },
        { status: 404 }
      )
    }

    // Generate race ID
    const raceId = crypto.randomUUID()

    // Create race
    const { data: race, error: raceError } = await supabase
      .from('Race')
      .insert({
        id: raceId,
        trackId,
        name: name || null,
        description: description || null,
        createdById: session.user.id,
        laps: laps || null,
        weather: weather || null,
        isActive: isActive || false,
      })
      .select()
      .single()

    if (raceError) {
      console.error('Error creating race:', raceError)
      return NextResponse.json({ error: 'Failed to create race' }, { status: 500 })
    }

    // Create RaceCar entries for each build
    const raceCarEntries = builds.map((build: any) => ({
      id: crypto.randomUUID(),
      raceId,
      carId: build.carId,
      buildId: build.id,
    }))

    const { error: raceCarError } = await supabase
      .from('RaceCar')
      .insert(raceCarEntries)

    if (raceCarError) {
      console.error('Error creating race cars:', raceCarError)
      // Rollback race creation
      await supabase.from('Race').delete().eq('id', raceId)
      return NextResponse.json(
        { error: 'Failed to add builds to race' },
        { status: 500 }
      )
    }

    // Fetch complete race data for response
    const { data: completeRace } = await supabase
      .from('Race')
      .select(`
        *,
        track:Track(*)
      `)
      .eq('id', raceId)
      .single()

    const { data: raceCars } = await supabase
      .from('RaceCar')
      .select(`
        *,
        car:Car(*),
        build:CarBuild(*)
      `)
      .eq('raceId', raceId)

    return NextResponse.json({
      ...completeRace,
      RaceCar: raceCars || [],
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating race:', error)
    return NextResponse.json(
      { error: 'Failed to create race' },
      { status: 500 }
    )
  }
}
