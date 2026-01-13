// Simple script to check database column casing
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTables() {
  const tables = ['Race', 'RaceCar', 'RunListEntry', 'RunList', 'RunListEntryCar', 'Track', 'Car', 'User']

  console.log('Checking database column casing...\n')

  for (const tableName of tables) {
    // Use a simple query to get column names
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`)
      continue
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      // Find columns that are all lowercase AND contain an ID reference (like carid, trackid)
      const problematic = columns.filter(c => {
        const isAllLower = c === c.toLowerCase()
        const looksLikeIdRef = c.match(/^[a-z]+id$/) || c.match(/^[a-z]+at$/) || c.match(/^[a-z]+byid$/)
        return isAllLower && looksLikeIdRef
      })

      console.log(`\n${tableName}:`)
      console.log('  Columns:', columns.join(', '))

      if (problematic.length > 0) {
        console.log(`  ❌ NEEDS FIXING: ${problematic.join(', ')}`)
      } else {
        console.log(`  ✅ Correct casing`)
      }
    }
  }
}

checkTables().catch(console.error)
