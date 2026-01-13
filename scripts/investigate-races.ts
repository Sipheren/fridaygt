// Investigate Race data to understand issues
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function investigateRaces() {
  console.log('='.repeat(80))
  console.log('RACE DATA INVESTIGATION')
  console.log('='.repeat(80))

  // Get all races
  const { data: races, error } = await supabase
    .from('Race')
    .select('*')
  .order('createdAt', { ascending: false })

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log(`\nTotal races: ${races?.length || 0}\n`)

  // For each race, get details
  for (const race of races || []) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`RACE ID: ${race.id}`)
    console.log(`Name: ${race.name || 'None'}`)
    console.log(`Description: ${race.description || 'None'}`)
    console.log(`Track ID: ${race.trackId}`)
    console.log(`Created By: ${race.createdById}`)
    console.log(`Created At: ${race.createdAt}`)

    // Get track
    const { data: track } = await supabase
      .from('Track')
      .select('name, slug, location')
      .eq('id', race.trackId)
      .single()

    console.log(`Track: ${track?.name || 'NOT FOUND'}`)

    // Get race cars
    const { data: raceCars } = await supabase
      .from('RaceCar')
      .select(`
        id,
        carId,
        buildId,
        car:Car(id, name, slug, manufacturer)
      `)
      .eq('raceId', race.id)

    console.log(`Race Cars: ${raceCars?.length || 0}`)
    raceCars?.forEach((rc: any) => {
      console.log(`  - ${rc.car?.manufacturer} ${rc.car?.name} (buildId: ${rc.buildId || 'None'})`)
    })

    // Get run list entries
    const { data: runListEntries } = await supabase
      .from('RunListEntry')
      .select(`
        id,
        runListId,
        runList:RunList(id, name, isPublic)
      `)
      .eq('raceId', race.id)

    console.log(`Used in Run Lists: ${runListEntries?.length || 0}`)
    runListEntries?.forEach((entry: any) => {
      console.log(`  - ${entry.runList?.name || 'Unknown'} (${entry.runList?.isPublic ? 'Public' : 'Private'})`)
    })

    console.log(`Active: ${(runListEntries?.length || 0) > 0 ? 'YES' : 'NO'}`)
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('SUMMARY')
  console.log('='.repeat(80))

  const activeRaces = races?.filter(r => {
    // Check if used in any run lists
    return true // We'll calculate this properly below
  }) || []

  // Actually count active races
  const { data: runListEntries } = await supabase
    .from('RunListEntry')
    .select('raceId')

  const activeRaceIds = new Set(runListEntries?.map(e => e.raceId) || [])
  const activeCount = races?.filter(r => activeRaceIds.has(r.id)).length || 0
  const inactiveCount = (races?.length || 0) - activeCount

  console.log(`Active races (used in run lists): ${activeCount}`)
  console.log(`Inactive races (not used): ${inactiveCount}`)
  console.log(`\n${'='.repeat(80)}\n`)
}

investigateRaces()
  .then(() => {
    console.log('Investigation complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Investigation failed:', error)
    process.exit(1)
  })
