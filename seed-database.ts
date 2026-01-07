import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import tracksData from './seed-data/tracks.json'
import carsData from './seed-data/cars.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function createSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function seedTracks() {
  console.log('Seeding tracks...')

  for (const trackGroup of tracksData as any[]) {
    const baseName = trackGroup.name

    // For each layout, create a track entry
    for (const layoutName of trackGroup.layouts) {
      const trackName = layoutName === 'Full Course' ? baseName : `${baseName} - ${layoutName}`
      const { error } = await supabase
        .from('Track')
        .insert({
          id: crypto.randomUUID(),
          name: trackName,
          slug: createSlug(trackName),
          location: trackGroup.location,
          category: trackGroup.category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

      if (error) {
        console.error(`Error inserting track ${trackName}:`, error)
        continue
      }

      console.log(`✓ Inserted track: ${trackName}`)
    }
  }

  console.log('\n✓ Tracks seeded successfully!\n')
}

async function seedCars() {
  console.log('Seeding cars...')

  for (const car of carsData as any[]) {
    const { error } = await supabase
      .from('Car')
      .insert({
        id: crypto.randomUUID(),
        name: car.name,
        slug: createSlug(car.name),
        manufacturer: car.manufacturer,
        year: car.year,
        category: car.category,
        driveType: car.driveType,
        country: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

    if (error) {
      console.error(`Error inserting car ${car.name}:`, error)
      continue
    }

    console.log(`✓ Inserted car: ${car.name}`)
  }

  console.log('\n✓ Cars seeded successfully!\n')
}

async function main() {
  console.log('Starting database seed...\n')

  try {
    await seedTracks()
    await seedCars()

    console.log('🎉 Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

main()
