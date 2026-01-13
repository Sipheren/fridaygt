import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// GET /api/races - List all races with run list associations
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Fetch all races with their cars and track
    const { data: races, error: racesError } = await supabase
      .from('Race')
      .select(`
        id,
        name,
        description,
        createdAt,
        updatedAt,
        track:Track(id, name, slug, location, category),
        RaceCar(
          id,
          carId,
          buildId,
          car:Car(id, name, slug, manufacturer)
        )
      `)
      .order('createdAt', { ascending: false })

    if (racesError) {
      console.error('Error fetching races:', racesError)
      return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
    }

    console.log('Fetched races:', races?.length)

    // Fetch all run list entries that reference these races
    const { data: runListEntries } = await supabase
      .from('RunListEntry')
      .select(`
        raceId,
        runList:RunList(id, name, isPublic)
      `)
      .not('raceId', 'is', null)

    // Group run lists by raceId
    const raceToLists = new Map<string, any[]>()
    runListEntries?.forEach((entry: any) => {
      if (!raceToLists.has(entry.raceId)) {
        raceToLists.set(entry.raceId, [])
      }
      if (entry.runList && !raceToLists.get(entry.raceId).find((rl: any) => rl.id === entry.runList.id)) {
        raceToLists.get(entry.raceId).push({
          id: entry.runList.id,
          name: entry.runList.name,
          isPublic: entry.runList.isPublic
        })
      }
    })

    // Attach run lists to races and determine active status
    const enrichedRaces = (races || []).map((race: any) => {
      const runLists = raceToLists.get(race.id) || []
      return {
        ...race,
        isActive: runLists.length > 0,
        runLists,
        runListCount: runLists.length
      }
    })

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
