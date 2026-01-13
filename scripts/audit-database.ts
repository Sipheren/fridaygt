import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function auditDatabase() {
  console.log('='.repeat(80))
  console.log('DATABASE COLUMN AUDIT')
  console.log('='.repeat(80))

  // Get all user-defined tables
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .not('table_name', 'like', 'pg_%')
    .not('table_name', 'like', '_supabase_%')
    .order('table_name')

  if (tablesError) {
    console.error('Error fetching tables:', tablesError)
    process.exit(1)
  }

  console.log(`\nFound ${tables?.length || 0} tables\n`)

  // For each table, get its columns
  for (const table of tables || []) {
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', table.table_name)
      .order('ordinal_position')

    if (columnsError) {
      console.error(`Error fetching columns for ${table.table_name}:`, columnsError)
      continue
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`TABLE: ${table.table_name}`)
    console.log(`${'='.repeat(80)}`)

    const hasLowercase = columns?.some(col =>
      col.column_name.match(/^[a-z]+$/) && !col.column_name.match(/^[A-Z]/)
    )

    if (hasLowercase) {
      console.log(`⚠️  CONTAINS LOWERCASE COLUMNS`)
    } else {
      console.log(`✅ ALL CAMELCASE`)
    }

    console.log(`\nColumns:`)
    columns?.forEach(col => {
      const isLowercase = col.column_name.match(/^[a-z]+$/) && !col.column_name.match(/^[A-Z]/)
      const status = isLowercase ? '❌' : '✅'
      console.log(`  ${status} ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} nullable: ${col.is_nullable}`)
    })
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('SUMMARY')
  console.log('='.repeat(80))

  // Get specific tables of interest
  const tablesOfInterest = ['Race', 'RaceCar', 'RunListEntry', 'RunList', 'RunListEntryCar']

  for (const tableName of tablesOfInterest) {
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)

    const lowercaseColumns = columns?.filter(col =>
      col.column_name.match(/^[a-z]+$/) && !col.column_name.match(/^[A-Z]/)
    )

    if (lowercaseColumns && lowercaseColumns.length > 0) {
      console.log(`\n❌ ${tableName}: ${lowercaseColumns.length} lowercase columns`)
      lowercaseColumns.forEach(col => console.log(`   - ${col.column_name}`))
    } else {
      console.log(`\n✅ ${tableName}: All camelCase`)
    }
  }

  console.log(`\n${'='.repeat(80)}\n`)
}

auditDatabase()
  .then(() => {
    console.log('Audit complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Audit failed:', error)
    process.exit(1)
  })
