#!/usr/bin/env node
/**
 * Migrate Parts and Tuning Settings from CSV to Database
 *
 * This script performs a complete migration of GT7 parts and tuning settings data
 * from CSV files into the Supabase database. It creates normalized database tables
 * for categories and items, then migrates existing build data to use foreign keys.
 *
 * Usage:
 *   npm run migrate:parts
 *   OR
 *   npx tsx scripts/migrate-parts-to-db.ts
 *
 * Prerequisites:
 *   1. Run the SQL migration: supabase/migrations/20260121_add_parts_and_settings_tables.sql
 *      This creates the PartCategory, Part, TuningSection, and TuningSetting tables
 *   2. Environment variables must be set:
 *     * NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *     * SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 *   3. CSV files must exist:
 *     * gt7data/gt7_parts_shop.csv
 *     * gt7data/gt7_tuning_settings.csv
 *   4. Existing CarBuildUpgrade and CarBuildSetting records may exist for migration
 *
 * Data Flow:
 *   Step 1: Migrate Parts
 *   1. Read gt7data/gt7_parts_shop.csv
 *   2. Parse and group parts by category
 *   3. Insert categories into PartCategory table (ordered)
 *   4. Insert parts into Part table (linked to categories)
 *
 *   Step 2: Migrate Tuning Settings
 *   1. Read gt7data/gt7_tuning_settings.csv
 *   2. Parse and group settings by section
 *   3. Insert sections into TuningSection table (ordered)
 *   4. Insert settings into TuningSetting table (linked to sections)
 *
 *   Step 3: Migrate Existing Build Data
 *   1. Fetch all CarBuildUpgrade records (old format with category/part strings)
 *   2. Lookup part IDs from new Part table
 *   3. Update records with partId foreign key
 *
 *   Step 4: Migrate Existing Settings Data
 *   1. Fetch all CarBuildSetting records (old format with category/setting strings)
 *   2. Lookup setting IDs from new TuningSetting table
 *   3. Update records with settingId foreign key
 *
 *   Step 5: Verification
 *   1. Count records in all tables
 *   2. Report migration statistics
 *   3. Compare migrated vs total records
 *
 * Error Handling:
 *   - Validates environment variables on startup
 *   - Continues migration on individual record errors
 *   - Logs warnings for unmatched parts/settings
 *   - Reports summary of successful vs failed migrations
 *   - Exits with status code 1 on fatal errors
 *
 * Category Ordering:
 *   Parts are ordered by performance level:
 *   1. Sports (entry-level)
 *   2. Club Sports
 *   3. Semi-Racing
 *   4. Racing
 *   5. Extreme (highest performance)
 *
 *   Tuning sections are ordered by menu appearance:
 *   Tyres, Suspension, Differential Gear, Aerodynamics, ECU,
 *   Performance Adjustment, Transmission, Nitrous/Overtake,
 *   Supercharger, Intake & Exhaust, Brakes, Steering, Drivetrain,
 *   Engine Tuning, Bodywork
 *
 * CSV Formats:
 *   Parts CSV (gt7_parts_shop.csv):
 *   - Header: Category,Part
 *   - Example: "Sports,Sports Computer"
 *
 *   Tuning CSV (gt7_tuning_settings.csv):
 *   - Header: Section,Setting
 *   - Example: "Tyres,Tyre Specifications"
 *
 * Database Schema:
 *   PartCategory:
 *   - id: UUID (primary key)
 *   - name: text (category name)
 *   - displayOrder: integer (sort order)
 *
 *   Part:
 *   - id: UUID (primary key)
 *   - categoryId: UUID (foreign key)
 *   - name: text (part name)
 *   - isActive: boolean
 *
 *   TuningSection:
 *   - id: UUID (primary key)
 *   - name: text (section name)
 *   - displayOrder: integer (sort order)
 *
 *   TuningSetting:
 *   - id: UUID (primary key)
 *   - sectionId: UUID (foreign key)
 *   - name: text (setting name)
 *   - isActive: boolean
 *
 * Migration Strategy:
 *   - New categories/sections are inserted with displayOrder
 *   - Parts/settings are linked via foreign keys
 *   - Existing build data is migrated in-place (updated)
 *   - Old string columns remain until finalization SQL
 *   - Lookup maps built for efficient O(1) lookups
 *
 * Important Notes:
 *   - Uses service role key to bypass RLS policies
 *   - Processes records sequentially to avoid rate limits
 *   - Builds lookup maps for efficient data migration
 *   - Reports unmatched records for manual review
 *   - Does NOT delete old columns (done in finalization SQL)
 *   - Can be run multiple times (idempotent for new data)
 *
 * Verification:
 *   After migration, the script verifies:
 *   - PartCategory count
 *   - Part count
 *   - TuningSection count
 *   - TuningSetting count
 *   - CarBuildUpgrade records with partId
 *   - CarBuildSetting records with settingId
 *
 * Next Steps After Migration:
 *   1. Review migration summary
 *   2. Run finalization SQL to:
 *      - Make new columns NOT NULL
 *      - Drop old string columns
 *      - Add foreign key constraints
 *   3. Test application build features
 *   4. Verify build creation and editing
 *
 * Dependencies:
 *   - fs: File system access for reading CSV files
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
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// CSV file paths
const PARTS_CSV_PATH = path.join(process.cwd(), 'gt7data', 'gt7_parts_shop.csv')
const TUNING_CSV_PATH = path.join(process.cwd(), 'gt7data', 'gt7_tuning_settings.csv')

// ============================================================================
// CSV Parser
// ============================================================================

interface CSVRow {
  [key: string]: string
}

/**
 * Parse CSV content with quote handling
 * Handles quoted values and empty rows
 *
 * @param content - Raw CSV content
 * @returns Array of row objects
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    // Parse each character, handling quoted values
    for (const char of lines[i]) {
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

    // Create row object
    const row: CSVRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    // Skip empty rows
    if (Object.values(row).some(v => v.trim() !== '')) {
      rows.push(row)
    }
  }

  return rows
}

// ============================================================================
// Parts Migration
// ============================================================================

interface PartRow {
  Category: string
  Part: string
}

// Predefined category ordering (matches game progression)
const PART_CATEGORY_ORDER = ['Sports', 'Club Sports', 'Semi-Racing', 'Racing', 'Extreme']

/**
 * Migrate parts from CSV to database
 * Creates categories and parts with proper ordering
 */
async function migrateParts(): Promise<void> {
  console.log('🔧 Migrating Parts Shop data...')

  const csvContent = fs.readFileSync(PARTS_CSV_PATH, 'utf-8')
  const rows = parseCSV(csvContent) as unknown as PartRow[]

  console.log(`   Found ${rows.length} parts in CSV`)

  // Group parts by category
  const categoryMap = new Map<string, string[]>()
  for (const row of rows) {
    const category = row.Category?.trim()
    const part = row.Part?.trim()

    if (!category || !part) continue

    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category)!.push(part)
  }

  console.log(`   Found ${categoryMap.size} categories`)

  // Insert categories and parts in order
  let categoriesInserted = 0
  let partsInserted = 0

  // Use defined order first, then append any new categories
  const orderedCategories = PART_CATEGORY_ORDER.filter(c => categoryMap.has(c))
  const remainingCategories = Array.from(categoryMap.keys()).filter(c => !PART_CATEGORY_ORDER.includes(c))
  const allCategories = [...orderedCategories, ...remainingCategories]

  for (const [displayOrder, categoryName] of allCategories.entries()) {
    const parts = categoryMap.get(categoryName)!

    // Insert category
    const { data: category, error: categoryError } = await supabase
      .from('PartCategory')
      .insert({
        name: categoryName,
        displayOrder: displayOrder + 1,
      })
      .select('id')
      .single()

    if (categoryError) {
      console.error(`   ❌ Error inserting category "${categoryName}":`, categoryError)
      continue
    }

    categoriesInserted++
    console.log(`   ✓ Inserted category: ${categoryName}`)

    // Insert all parts for this category
    const partsToInsert = parts.map(partName => ({
      id: crypto.randomUUID(),
      categoryId: category.id,
      name: partName,
      isActive: true,
    }))

    const { error: partsError } = await supabase.from('Part').insert(partsToInsert)

    if (partsError) {
      console.error(`   ❌ Error inserting parts for "${categoryName}":`, partsError)
    } else {
      partsInserted += partsToInsert.length
      console.log(`     Inserted ${partsToInsert.length} parts`)
    }
  }

  console.log(`✓ Parts migration complete: ${categoriesInserted} categories, ${partsInserted} parts`)
}

// ============================================================================
// Tuning Settings Migration
// ============================================================================

interface TuningRow {
  Section: string
  Setting: string
}

// Predefined section ordering (matches in-game menu)
const TUNING_SECTION_ORDER = [
  'Tyres',
  'Suspension',
  'Differential Gear',
  'Aerodynamics',
  'ECU',
  'Performance Adjustment',
  'Transmission',
  'Nitrous/Overtake',
  'Supercharger',
  'Intake & Exhaust',
  'Brakes',
  'Steering',
  'Drivetrain',
  'Engine Tuning',
  'Bodywork',
]

/**
 * Migrate tuning settings from CSV to database
 * Creates sections and settings with proper ordering
 */
async function migrateTuningSettings(): Promise<void> {
  console.log('⚙️  Migrating Tuning Settings data...')

  const csvContent = fs.readFileSync(TUNING_CSV_PATH, 'utf-8')
  const rows = parseCSV(csvContent) as unknown as TuningRow[]

  console.log(`   Found ${rows.length} settings in CSV`)

  // Group settings by section
  const sectionMap = new Map<string, string[]>()
  for (const row of rows) {
    const section = row.Section?.trim()
    const setting = row.Setting?.trim()

    if (!section || !setting) continue

    if (!sectionMap.has(section)) {
      sectionMap.set(section, [])
    }
    sectionMap.get(section)!.push(setting)
  }

  console.log(`   Found ${sectionMap.size} sections`)

  // Insert sections and settings in order
  let sectionsInserted = 0
  let settingsInserted = 0

  // Use defined order first, then append any new sections
  const orderedSections = TUNING_SECTION_ORDER.filter(s => sectionMap.has(s))
  const remainingSections = Array.from(sectionMap.keys()).filter(s => !TUNING_SECTION_ORDER.includes(s))
  const allSections = [...orderedSections, ...remainingSections]

  for (const [displayOrder, sectionName] of allSections.entries()) {
    const settings = sectionMap.get(sectionName)!

    // Insert section
    const { data: section, error: sectionError } = await supabase
      .from('TuningSection')
      .insert({
        name: sectionName,
        displayOrder: displayOrder + 1,
      })
      .select('id')
      .single()

    if (sectionError) {
      console.error(`   ❌ Error inserting section "${sectionName}":`, sectionError)
      continue
    }

    sectionsInserted++
    console.log(`   ✓ Inserted section: ${sectionName}`)

    // Insert all settings for this section
    const settingsToInsert = settings.map(settingName => ({
      id: crypto.randomUUID(),
      sectionId: section.id,
      name: settingName,
      isActive: true,
    }))

    const { error: settingsError } = await supabase.from('TuningSetting').insert(settingsToInsert)

    if (settingsError) {
      console.error(`   ❌ Error inserting settings for "${sectionName}":`, settingsError)
    } else {
      settingsInserted += settingsToInsert.length
      console.log(`     Inserted ${settingsToInsert.length} settings`)
    }
  }

  console.log(`✓ Tuning Settings migration complete: ${sectionsInserted} sections, ${settingsInserted} settings`)
}

// ============================================================================
// Migrate Existing Build Data
// ============================================================================

/**
 * Migrate existing CarBuildUpgrade records to use foreign keys
 * Updates records to reference Part instead of category/part strings
 */
async function migrateExistingBuildUpgrades(): Promise<void> {
  console.log('🔄 Migrating existing CarBuildUpgrade records...')

  // Get all existing upgrade records
  const { data: upgrades, error: fetchError } = await supabase
    .from('CarBuildUpgrade')
    .select('id, category, part')

  if (fetchError) {
    console.error('   ❌ Error fetching CarBuildUpgrade records:', fetchError)
    return
  }

  if (!upgrades || upgrades.length === 0) {
    console.log('   No existing CarBuildUpgrade records to migrate')
    return
  }

  console.log(`   Found ${upgrades.length} records to migrate`)

  // Build lookup map: categoryName:partName -> partId
  const { data: parts, error: partsError } = await supabase
    .from('Part')
    .select('id, name, categoryId')
    .eq('isActive', true)

  if (partsError) {
    console.error('   ❌ Error fetching Parts:', partsError)
    return
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('PartCategory')
    .select('id, name')

  if (categoriesError) {
    console.error('   ❌ Error fetching PartCategories:', categoriesError)
    return
  }

  // Build lookup map for efficient O(1) lookups
  const partLookup = new Map<string, string>()
  for (const part of parts || []) {
    const category = categories?.find(c => c.id === part.categoryId)
    if (category) {
      const key = `${category.name}:${part.name}`
      partLookup.set(key, part.id)
    }
  }

  // Migrate each upgrade record
  let migrated = 0
  let failed = 0

  for (const upgrade of upgrades) {
    const key = `${upgrade.category}:${upgrade.part}`
    const partId = partLookup.get(key)

    if (!partId) {
      console.warn(`   ⚠️  No matching part found for: ${key}`)
      failed++
      continue
    }

    // Update record with new foreign key
    const { error: updateError } = await supabase
      .from('CarBuildUpgrade')
      .update({ partId })
      .eq('id', upgrade.id)

    if (updateError) {
      console.error(`   ❌ Error updating upgrade ${upgrade.id}:`, updateError)
      failed++
    } else {
      migrated++
    }
  }

  console.log(`✓ CarBuildUpgrade migration complete: ${migrated} migrated, ${failed} failed`)
}

/**
 * Migrate existing CarBuildSetting records to use foreign keys
 * Updates records to reference TuningSetting instead of category/setting strings
 */
async function migrateExistingBuildSettings(): Promise<void> {
  console.log('🔄 Migrating existing CarBuildSetting records...')

  // Get all existing setting records
  const { data: settings, error: fetchError } = await supabase
    .from('CarBuildSetting')
    .select('id, category, setting')

  if (fetchError) {
    console.error('   ❌ Error fetching CarBuildSetting records:', fetchError)
    return
  }

  if (!settings || settings.length === 0) {
    console.log('   No existing CarBuildSetting records to migrate')
    return
  }

  console.log(`   Found ${settings.length} records to migrate`)

  // Build lookup map: sectionName:settingName -> settingId
  const { data: tuningSettings, error: tuningSettingsError } = await supabase
    .from('TuningSetting')
    .select('id, name, sectionId')
    .eq('isActive', true)

  if (tuningSettingsError) {
    console.error('   ❌ Error fetching TuningSettings:', tuningSettingsError)
    return
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('TuningSection')
    .select('id, name')

  if (sectionsError) {
    console.error('   ❌ Error fetching TuningSections:', sectionsError)
    return
  }

  // Build lookup map for efficient O(1) lookups
  const settingLookup = new Map<string, string>()
  for (const setting of tuningSettings || []) {
    const section = sections?.find(s => s.id === setting.sectionId)
    if (section) {
      const key = `${section.name}:${setting.name}`
      settingLookup.set(key, setting.id)
    }
  }

  // Migrate each setting record
  let migrated = 0
  let failed = 0

  for (const setting of settings) {
    const key = `${setting.category}:${setting.setting}`
    const settingId = settingLookup.get(key)

    if (!settingId) {
      console.warn(`   ⚠️  No matching setting found for: ${key}`)
      failed++
      continue
    }

    // Update record with new foreign key
    const { error: updateError } = await supabase
      .from('CarBuildSetting')
      .update({ settingId })
      .eq('id', setting.id)

    if (updateError) {
      console.error(`   ❌ Error updating setting ${setting.id}:`, updateError)
      failed++
    } else {
      migrated++
    }
  }

  console.log(`✓ CarBuildSetting migration complete: ${migrated} migrated, ${failed} failed`)
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verify migration success by counting records
 * Displays summary of all migrated data
 */
async function verifyMigration(): Promise<void> {
  console.log('\n📊 Verifying migration...')

  // Count all records
  const { count: partCategoriesCount } = await supabase
    .from('PartCategory')
    .select('*', { count: 'exact', head: true })

  const { count: partsCount } = await supabase
    .from('Part')
    .select('*', { count: 'exact', head: true })

  const { count: tuningSectionsCount } = await supabase
    .from('TuningSection')
    .select('*', { count: 'exact', head: true })

  const { count: tuningSettingsCount } = await supabase
    .from('TuningSetting')
    .select('*', { count: 'exact', head: true })

  const { count: upgradesWithPartId } = await supabase
    .from('CarBuildUpgrade')
    .select('*', { count: 'exact', head: true })
    .not('partId', 'is', null)

  const { count: settingsWithSettingId } = await supabase
    .from('CarBuildSetting')
    .select('*', { count: 'exact', head: true })
    .not('settingId', 'is', null)

  const { count: totalUpgrades } = await supabase
    .from('CarBuildUpgrade')
    .select('*', { count: 'exact', head: true })

  const { count: totalSettings } = await supabase
    .from('CarBuildSetting')
    .select('*', { count: 'exact', head: true })

  // Display migration summary
  console.log('\nMigration Summary:')
  console.log('------------------')
  console.log(`PartCategories:      ${partCategoriesCount || 0}`)
  console.log(`Parts:               ${partsCount || 0}`)
  console.log(`TuningSections:      ${tuningSectionsCount || 0}`)
  console.log(`TuningSettings:      ${tuningSettingsCount || 0}`)
  console.log(`CarBuildUpgrade:     ${upgradesWithPartId || 0} / ${totalUpgrades || 0} migrated`)
  console.log(`CarBuildSetting:     ${settingsWithSettingId || 0} / ${totalSettings || 0} migrated`)
}

// ============================================================================
// Main Migration Flow
// ============================================================================

/**
 * Main function orchestrating the entire migration process
 * Executes steps sequentially with error handling
 */
async function main() {
  console.log('========================================')
  console.log('  Parts & Tuning Migration')
  console.log('========================================\n')

  try {
    // Step 1: Migrate Parts
    await migrateParts()
    console.log('')

    // Step 2: Migrate Tuning Settings
    await migrateTuningSettings()
    console.log('')

    // Step 3: Migrate existing CarBuildUpgrade records
    await migrateExistingBuildUpgrades()
    console.log('')

    // Step 4: Migrate existing CarBuildSetting records
    await migrateExistingBuildSettings()
    console.log('')

    // Step 5: Verify migration
    await verifyMigration()

    console.log('\n✅ Migration complete!')
    console.log('\nNext steps:')
    console.log('1. Review the summary above')
    console.log('2. If everything looks good, run the finalization SQL:')
    console.log('   - See docs/PARTS-TUNING-MIGRATION.md for finalization steps')
    console.log('3. Test the application to ensure builds work correctly')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Execute migration
main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
