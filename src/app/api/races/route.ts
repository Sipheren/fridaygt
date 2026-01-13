import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

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
          isActive: runLists.length > 0,
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
