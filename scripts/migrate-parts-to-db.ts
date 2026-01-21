#!/usr/bin/env node
/**
 * Migrate Parts and Tuning Settings from CSV to Database
 * Run this after creating the new tables with the SQL migration
 *
 * Prerequisites:
 * 1. Run the SQL migration: supabase/migrations/20260121_add_parts_and_settings_tables.sql
 * 2. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// CSV paths
const PARTS_CSV_PATH = path.join(process.cwd(), 'gt7data', 'gt7_parts_shop.csv')
const TUNING_CSV_PATH = path.join(process.cwd(), 'gt7data', 'gt7_tuning_settings.csv')

// ============================================================================
// CSV Parser
// ============================================================================

interface CSVRow {
  [key: string]: string
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false

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

const PART_CATEGORY_ORDER = ['Sports', 'Club Sports', 'Semi-Racing', 'Racing', 'Extreme']

async function migrateParts(): Promise<void> {
  console.log('🔧 Migrating Parts Shop data...')

  const csvContent = fs.readFileSync(PARTS_CSV_PATH, 'utf-8')
  const rows = parseCSV(csvContent) as unknown as PartRow[]

  console.log(`   Found ${rows.length} parts in CSV`)

  // Group by category
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

  // Use defined order first
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

    // Insert parts for this category
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

async function migrateTuningSettings(): Promise<void> {
  console.log('⚙️  Migrating Tuning Settings data...')

  const csvContent = fs.readFileSync(TUNING_CSV_PATH, 'utf-8')
  const rows = parseCSV(csvContent) as unknown as TuningRow[]

  console.log(`   Found ${rows.length} settings in CSV`)

  // Group by section
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

  // Use defined order first
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

    // Insert settings for this section
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

async function migrateExistingBuildUpgrades(): Promise<void> {
  console.log('🔄 Migrating existing CarBuildUpgrade records...')

  // Get all CarBuildUpgrade records
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

  // Get all parts with their categories for lookup
  const { data: parts, error: partsError } = await supabase
    .from('Part')
    .select('id, name, categoryId')
    .eq('isActive', true)

  if (partsError) {
    console.error('   ❌ Error fetching Parts:', partsError)
    return
  }

  // Get all categories for lookup
  const { data: categories, error: categoriesError } = await supabase
    .from('PartCategory')
    .select('id, name')

  if (categoriesError) {
    console.error('   ❌ Error fetching PartCategories:', categoriesError)
    return
  }

  // Build lookup map: categoryName + partName -> partId
  const partLookup = new Map<string, string>()
  for (const part of parts || []) {
    const category = categories?.find(c => c.id === part.categoryId)
    if (category) {
      const key = `${category.name}:${part.name}`
      partLookup.set(key, part.id)
    }
  }

  // Migrate each upgrade
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

async function migrateExistingBuildSettings(): Promise<void> {
  console.log('🔄 Migrating existing CarBuildSetting records...')

  // Get all CarBuildSetting records
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

  // Get all tuning settings with their sections for lookup
  const { data: tuningSettings, error: tuningSettingsError } = await supabase
    .from('TuningSetting')
    .select('id, name, sectionId')
    .eq('isActive', true)

  if (tuningSettingsError) {
    console.error('   ❌ Error fetching TuningSettings:', tuningSettingsError)
    return
  }

  // Get all sections for lookup
  const { data: sections, error: sectionsError } = await supabase
    .from('TuningSection')
    .select('id, name')

  if (sectionsError) {
    console.error('   ❌ Error fetching TuningSections:', sectionsError)
    return
  }

  // Build lookup map: sectionName + settingName -> settingId
  const settingLookup = new Map<string, string>()
  for (const setting of tuningSettings || []) {
    const section = sections?.find(s => s.id === setting.sectionId)
    if (section) {
      const key = `${section.name}:${setting.name}`
      settingLookup.set(key, setting.id)
    }
  }

  // Migrate each setting
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
// Verify Migration
// ============================================================================

async function verifyMigration(): Promise<void> {
  console.log('\n📊 Verifying migration...')

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

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
