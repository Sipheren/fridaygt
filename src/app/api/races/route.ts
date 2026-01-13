import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch all run list entries with their relationships
    const { data: entries, error } = await supabase
      .from('RunListEntry')
      .select(`
        id,
        notes,
        createdAt,
        track:Track(id, name, slug, location, category),
        runListId,
        runList:RunList(id, name, isPublic),
        RunListEntryCar(
          carId,
          buildId,
          car:Car(id, name, slug, manufacturer)
        )
      `)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching entries:', error)
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    console.log('Fetched entries:', entries?.length)

    // Group entries by track + car combination to create unique "races"
    const raceMap = new Map<string, any>()

    entries?.forEach((entry: any) => {
      const cars = entry.RunListEntryCar?.map((rlc: any) => ({
        id: `${entry.id}-${rlc.car.id}`,
        carId: rlc.car.id,
        buildId: rlc.buildId,
        car: rlc.car
      })) || []

      // Create a unique key based on track + cars
      const carKey = cars.map((c: any) => c.car.id).sort().join(',')
      const key = `${entry.track.id}-${carKey}`

      if (!raceMap.has(key)) {
        raceMap.set(key, {
          id: key,
          name: null,
          description: null,
          createdAt: entry.createdAt,
          updatedAt: entry.createdAt,
          track: entry.track,
          RaceCar: cars,
          isActive: false,
          runLists: [],
          runListCount: 0
        })
      }

      // Add this run list to the race
      const race = raceMap.get(key)
      if (entry.runList && !race.runLists.find((rl: any) => rl.id === entry.runList.id)) {
        race.runLists.push({
          id: entry.runList.id,
          name: entry.runList.name,
          isPublic: entry.runList.isPublic
        })
      }
      race.isActive = race.runLists.length > 0
      race.runListCount = race.runLists.length
    })

    const allRaces = Array.from(raceMap.values())

    // Sort: Active first, then by display name
    const sortedRaces = allRaces.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1
      }

      const aName = getDisplayName(a)
      const bName = getDisplayName(b)
      return aName.localeCompare(bName)
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
