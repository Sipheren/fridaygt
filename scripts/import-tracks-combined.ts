import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Simple CSV parser
function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    return obj
  })
}

// Generate a slug from track name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .substring(0, 200)
}

// Parse CSV and import tracks
async function importTracks() {
  const csvPath = path.join(process.cwd(), 'gt7data', 'gt7_courses_combined.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  const records = parseCSV(csvContent)

  console.log(`Found ${records.length} tracks in CSV`)

  // Delete all existing tracks first to avoid duplicate slug conflicts
  console.log('Deleting existing tracks...')
  const { error: deleteError } = await supabase.from('Track').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) {
    console.error('Error deleting existing tracks:', deleteError)
  } else {
    console.log('✓ Deleted existing tracks')
  }

  // Process tracks in batches
  const batchSize = 50
  let imported = 0
  let errors = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    const tracks = batch.map((record: any) => {
      const fullCourseName = record['Course Name'] || 'Unknown Track'
      const country = record.Country || 'Unknown'
      const categoryRaw = record.Category || 'circuit'
      const length = record.Length ? parseFloat(record.Length) : null

      // Normalize category (must match the TrackCategory enum)
      let category = 'CIRCUIT'
      if (categoryRaw === 'circuit') category = 'CIRCUIT'
      else if (categoryRaw === 'original') category = 'CIRCUIT' // Original tracks are circuits
      else if (categoryRaw === 'city') category = 'CITY_COURSE'
      else if (categoryRaw === 'dirt' || categoryRaw === 'snow_dirt' || categoryRaw === 'snow') category = 'DIRT'

      // Keep the full course name (including layout) as the track name
      // This avoids duplicate name constraint violations
      const name = fullCourseName

      // Generate slug from full name
      const slug = generateSlug(name)

      return {
        id: crypto.randomUUID(),
        name,
        slug,
        location: country,
        category,
        layout: null, // Layout is part of the name now
        length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

    try {
      const { error } = await supabase.from('Track').insert(tracks)

      if (error) {
        console.error(`Batch import error:`, error)
        errors += tracks.length
      } else {
        imported += tracks.length
        console.log(`Imported ${imported}/${records.length} tracks...`)
      }
    } catch (err) {
      console.error(`Batch import error:`, err)
      errors += tracks.length
    }
  }

  console.log(`\n✓ Import complete:`)
  console.log(`  - Imported: ${imported} tracks`)
  console.log(`  - Errors: ${errors}`)
}

// Run import
importTracks()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
