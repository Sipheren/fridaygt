/**
 * Import Tracks from CSV to Database
 *
 * This script imports track/circuit data from the GT7 combined CSV file into the Supabase database.
 * It reads track information including course name, country, category (circuit/dirt/city), and length,
 * then generates URL-friendly slugs for routing.
 *
 * Usage:
 *   npm run import:tracks
 *   OR
 *   npx tsx scripts/import-tracks-combined.ts
 *
 * Prerequisites:
 *   - Supabase project must be set up and accessible
 *   - Environment variables must be set:
 *     * NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *     * SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 *   - GT7 tracks CSV file must exist at: gt7data/gt7_courses_combined.csv
 *   - Track table must exist in database (see migrations)
 *
 * Data Flow:
 *   1. Read CSV file from gt7data/gt7_courses_combined.csv
 *   2. Parse CSV data using custom CSV parser
 *   3. Delete all existing tracks to avoid duplicate slug conflicts
 *   4. Process tracks in batches of 50:
 *      - Extract course name, country, category, length
 *      - Normalize category to match TrackCategory enum
 *      - Keep full course name (including layout variant) as track name
 *      - Generate slug from full name
 *   5. Insert batch into Track table
 *   6. Report progress and final statistics
 *
 * Error Handling:
 *   - Validates environment variables on startup
 *   - Gracefully handles CSV parsing errors
 *   - Logs batch import errors without stopping entire process
 *   - Reports final count of successful imports vs errors
 *
 * Category Normalization:
 *   The script maps CSV category values to database enum values:
 *   - "circuit" -> CIRCUIT (racing circuits)
 *   - "original" -> CIRCUIT (fictional circuits in GT7)
 *   - "city" -> CITY_COURSE (street circuits)
 *   - "dirt" -> DIRT (dirt/snow courses)
 *   - "snow_dirt" -> DIRT (snow/dirt mixed)
 *   - "snow" -> DIRT (snow courses)
 *
 * Track Naming:
 *   - Uses full course name including layout variant (e.g., "Tokyo Expressway - East Exit")
 *   - This avoids duplicate name constraint violations
 *   - Layout field is set to null since it's part of the name
 *   - Each course variant becomes a separate track record
 *
 * Slug Generation:
 *   - Converts to lowercase
 *   - Removes special characters (keeps alphanumeric, spaces, hyphens)
 *   - Replaces spaces with hyphens
 *   - Collapses multiple hyphens into single hyphen
 *   - Truncates to 200 characters maximum
 *
 * Length Parsing:
 *   - Extracted from CSV as float (in kilometers)
 *   - Null if missing or invalid
 *   - Used for track length display in UI
 *
 * Batch Processing:
 *   - Processes tracks in batches of 50 to avoid overwhelming the database
 *   - Shows progress after each batch (e.g., "Imported 50/200 tracks...")
 *   - Tracks both successful imports and errors
 *
 * Important Notes:
 *   - DELETES ALL EXISTING TRACKS before import (fresh start approach)
 *   - Uses service role key to bypass RLS policies
 *   - CSV format: Course Name,Country,Category,Length columns
 *   - Location field maps to Country from CSV
 *
 * Dependencies:
 *   - fs: File system access for reading CSV
 *   - path: Path manipulation for file locations
 *   - @supabase/supabase-js: Supabase client for database operations
 *   - crypto: UUID generation for primary keys
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Configuration
// ============================================================================

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================================
// CSV Parser
// ============================================================================

/**
 * Simple CSV parser that handles quoted values
 * Parses CSV content into an array of objects
 *
 * @param content - Raw CSV content as string
 * @returns Array of objects with headers as keys
 */
function parseCSV(content: string): Record<string, string>[] {
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

    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    return obj
  })
}

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generate a URL-friendly slug from track name
 * Converts to lowercase, removes special chars, replaces spaces with hyphens
 *
 * @param name - Full track/course name
 * @returns URL-friendly slug (e.g., "tokyo-expressway-east-exit")
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .substring(0, 200)
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Main function to import tracks from CSV to database
 * Coordinates the entire import process
 */
async function importTracks() {
  const csvPath = path.join(process.cwd(), 'gt7data', 'gt7_courses_combined.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  const records = parseCSV(csvContent)

  console.log(`Found ${records.length} tracks in CSV`)

  // WARNING: This deletes all existing tracks before import
  // Ensures clean slate and avoids duplicate slug conflicts
  console.log('Deleting existing tracks...')
  const { error: deleteError } = await supabase.from('Track').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) {
    console.error('Error deleting existing tracks:', deleteError)
  } else {
    console.log('✓ Deleted existing tracks')
  }

  // Process tracks in batches to avoid overwhelming database
  const batchSize = 50
  let imported = 0
  let errors = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    const tracks = batch.map((record: Record<string, string>) => {
      // Extract track data from CSV
      const fullCourseName = record['Course Name'] || 'Unknown Track'
      const country = record.Country || 'Unknown'
      const categoryRaw = record.Category || 'circuit'
      const length = record.Length ? parseFloat(record.Length) : null

      // Normalize category to match TrackCategory enum
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

  // Display final import statistics
  console.log(`\n✓ Import complete:`)
  console.log(`  - Imported: ${imported} tracks`)
  console.log(`  - Errors: ${errors}`)
}

// ============================================================================
// Script Entry Point
// ============================================================================

// Execute the import process
importTracks()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
