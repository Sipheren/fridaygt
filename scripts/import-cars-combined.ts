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

// Generate a slug from car name (with uniqueness handling)
function generateSlug(make: string, model: string, year: number | null): string {
  // Remove make from model if it's duplicated (e.g., "Ford Ford GT")
  let modelName = model
  if (modelName.toLowerCase().startsWith(make.toLowerCase())) {
    modelName = modelName.substring(make.length).trim()
  }

  const makeSlug = make.toLowerCase().replace(/\s+/g, '-')
  const modelSlug = modelName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()

  // Add year if available for uniqueness
  const yearSuffix = year ? `-${year}` : ''

  let slug = `${makeSlug}-${modelSlug}${yearSuffix}`.substring(0, 200)

  // Add random suffix if still too generic
  if (slug.length < 10) {
    slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`
  }

  return slug
}

// Extract year from car name (e.g., "'96" or "2026")
function extractYear(year: string): number | null {
  if (!year || year.trim() === '') return null
  const yearNum = parseInt(year.trim())
  if (isNaN(yearNum)) return null

  // If 2 digits, assume 19xx if >= 50, else 20xx
  if (yearNum < 100) {
    return yearNum >= 50 ? 1900 + yearNum : 2000 + yearNum
  }
  return yearNum
}

// Determine category based on car name
function determineCategory(model: string): string {
  const name = model.toLowerCase()
  if (name.includes('gr.1') || name.includes('gr1')) return 'GR1'
  if (name.includes('gr.2') || name.includes('gr2')) return 'GR2'
  if (name.includes('gr.3') || name.includes('gr3')) return 'GR3'
  if (name.includes('gr.4') || name.includes('gr4')) return 'GR4'
  if (name.includes('gr.b') || name.includes('grb') || name.includes('rally')) return 'RALLY'
  if (name.includes('vision gt') || name.includes('vgt')) return 'VISION_GT'
  if (name.includes('kart')) return 'KART'
  // Default to OTHER for everything else (the schema doesn't have ROAD_CAR or N_CLASS)
  return 'OTHER'
}

// Parse CSV and import cars
async function importCars() {
  const csvPath = path.join(process.cwd(), 'gt7data', 'gt7_cars_combined.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  const records = parseCSV(csvContent)

  console.log(`Found ${records.length} cars in CSV`)

  // Delete all existing cars first to avoid duplicate slug conflicts
  console.log('Deleting existing cars...')
  const { error: deleteError } = await supabase.from('Car').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) {
    console.error('Error deleting existing cars:', deleteError)
  } else {
    console.log('✓ Deleted existing cars')
  }

  // Process cars in batches
  const batchSize = 50
  let imported = 0
  let errors = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    const cars = batch.map((record: any) => {
      const make = record.Make || 'Unknown'
      const model = record.Model || 'Unknown Car'
      const year = extractYear(record.Year)
      const pp = record.PP ? parseFloat(record.PP) : null

      // Generate a unique slug
      const slug = generateSlug(make, model, year)

      return {
        id: crypto.randomUUID(),
        name: model,
        slug,
        manufacturer: make,
        year,
        category: determineCategory(model),
        pp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

    try {
      const { error } = await supabase.from('Car').insert(cars)

      if (error) {
        console.error(`Batch import error:`, error)
        errors += cars.length
      } else {
        imported += cars.length
        console.log(`Imported ${imported}/${records.length} cars...`)
      }
    } catch (err) {
      console.error(`Batch import error:`, err)
      errors += cars.length
    }
  }

  console.log(`\n✓ Import complete:`)
  console.log(`  - Imported: ${imported} cars`)
  console.log(`  - Errors: ${errors}`)
}

// Run import
importCars()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
