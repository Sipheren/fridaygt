import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTestUser() {
  console.log('='.repeat(80))
  console.log('CHECKING TEST USER STATE')
  console.log('='.repeat(80))

  // Check public.User
  const { data: publicUser, error: publicError } = await supabase
    .from('User')
    .select('*')
    .eq('email', 'test@sipheren.com')
    .single()

  console.log('\n📋 PUBLIC.USER:')
  if (publicError) {
    console.log('   Error:', publicError)
  } else if (publicUser) {
    console.log('   ✅ Found:', JSON.stringify(publicUser, null, 2))
  } else {
    console.log('   ❌ Not found')
  }

  // Check next_auth.users
  const { data: nextAuthUser, error: nextAuthError } = await supabase
    .schema('next_auth')
    .from('users')
    .select('*')
    .eq('email', 'test@sipheren.com')
    .single()

  console.log('\n📋 NEXT_AUTH.USERS:')
  if (nextAuthError) {
    console.log('   Error:', nextAuthError)
  } else if (nextAuthUser) {
    console.log('   ✅ Found:', JSON.stringify(nextAuthUser, null, 2))
  } else {
    console.log('   ❌ Not found')
  }

  // Check sessions
  const { data: sessions, error: sessionsError } = await supabase
    .schema('next_auth')
    .from('sessions')
    .select('*')
    .eq('userId', nextAuthUser?.id || '')

  console.log('\n📋 NEXT_AUTH.SESSIONS:')
  if (sessionsError) {
    console.log('   Error:', sessionsError)
  } else if (sessions && sessions.length > 0) {
    console.log(`   ✅ Found ${sessions.length} session(s)`)
    sessions.forEach(s => {
      console.log(`      - Expires: ${s.expires}`)
    })
  } else {
    console.log('   ❌ No sessions found')
  }

  console.log('\n')
}

checkTestUser().catch(console.error)
