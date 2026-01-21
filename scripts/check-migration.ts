import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

require('dotenv').config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMigration() {
  console.log('Checking migration status...\n')

  // Check CarBuildUpgrade
  const { data: upgrades, error: upgradeError } = await supabase
    .from('CarBuildUpgrade')
    .select('id, buildId, category, part, partId')
    .limit(10)

  if (upgradeError) {
    console.error('Error fetching CarBuildUpgrade:', upgradeError)
  } else {
    console.log('CarBuildUpgrade records:')
    console.log('Total:', upgrades?.length || 0)
    upgrades?.forEach(u => {
      const hasPartId = u.partId ? '✓' : '✗'
      console.log(`  [${hasPartId}] ${u.buildId?.slice(0, 8)}... | ${u.category} | ${u.part} | partId: ${u.partId?.slice(0, 8) || 'NULL'}...`)
    })
  }

  console.log('')

  // Check CarBuildSetting
  const { data: settings, error: settingError } = await supabase
    .from('CarBuildSetting')
    .select('id, buildId, category, setting, settingId')
    .limit(10)

  if (settingError) {
    console.error('Error fetching CarBuildSetting:', settingError)
  } else {
    console.log('CarBuildSetting records:')
    console.log('Total:', settings?.length || 0)
    settings?.forEach(s => {
      const hasSettingId = s.settingId ? '✓' : '✗'
      console.log(`  [${hasSettingId}] ${s.buildId?.slice(0, 8)}... | ${s.category} | ${s.setting} | settingId: ${s.settingId?.slice(0, 8) || 'NULL'}...`)
    })
  }

  console.log('\nCounts:')
  const { count: totalUpgrades } = await supabase
    .from('CarBuildUpgrade')
    .select('*', { count: 'exact', head: true })

  const { count: withPartId } = await supabase
    .from('CarBuildUpgrade')
    .select('*', { count: 'exact', head: true })
    .not('partId', 'is', null)

  const { count: totalSettings } = await supabase
    .from('CarBuildSetting')
    .select('*', { count: 'exact', head: true })

  const { count: withSettingId } = await supabase
    .from('CarBuildSetting')
    .select('*', { count: 'exact', head: true })
    .not('settingId', 'is', null)

  console.log(`  CarBuildUpgrade: ${totalUpgrades || 0} total, ${withPartId || 0} with partId`)
  console.log(`  CarBuildSetting: ${totalSettings || 0} total, ${withSettingId || 0} with settingId`)
}

checkMigration().catch(console.error)
