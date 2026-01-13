// Cleanup orphaned races (not used in any run lists)
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanupOrphanedRaces() {
  console.log('='.repeat(80))
  console.log('CLEANING UP ORPHANED RACES')
  console.log('='.repeat(80))

  // Get all races
  const { data: races, error: racesError } = await supabase
    .from('Race')
    .select('id, createdAt')
  .order('createdAt', { ascending: false })

  if (racesError) {
    console.error('Error fetching races:', racesError)
    process.exit(1)
  }

  console.log(`\nTotal races: ${races?.length || 0}\n`)

  // Get all run list entries that use races
  const { data: runListEntries, error: entriesError } = await supabase
    .from('RunListEntry')
    .select('raceId')

  if (entriesError) {
    console.error('Error fetching run list entries:', entriesError)
    process.exit(1)
  }

  const usedRaceIds = new Set(runListEntries?.map(e => e.raceId) || [])
  console.log(`Races used in run lists: ${usedRaceIds.size}\n`)

  // Find orphaned races
  const orphanedRaces = races?.filter(r => !usedRaceIds.has(r.id)) || []

  console.log(`Orphaned races to delete: ${orphanedRaces.length}\n`)

  if (orphanedRaces.length === 0) {
    console.log('No orphaned races found. Nothing to clean up.')
    process.exit(0)
  }

  // Show what will be deleted
  console.log('Races to be deleted:')
  for (const race of orphanedRaces) {
    console.log(`  - ${race.id} (created: ${race.createdAt})`)
  }

  // Delete orphaned races
  console.log('\nDeleting orphaned races...')
  const { error: deleteError } = await supabase
    .from('Race')
    .delete()
    .in('id', orphanedRaces.map(r => r.id))

  if (deleteError) {
    console.error('\n❌ Error deleting races:', deleteError)
    process.exit(1)
  }

  console.log('\n✅ Successfully deleted orphaned races!')
  console.log(`\n${'='.repeat(80)}\n`)
}

cleanupOrphanedRaces()
  .then(() => {
    console.log('Cleanup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })
