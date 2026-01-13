import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDeletedUser() {
  const userId = '70256f55-dda2-422e-8329-55b0792eb0e9'

  console.log('Checking user:', userId)
  console.log('=' .repeat(80))

  // Check if user exists in public.User
  const { data: user } = await supabase
    .from('User')
    .select('*')
    .eq('id', userId)
    .single()

  if (user) {
    console.log('✅ User exists in public.User:')
    console.log('   Email:', user.email)
    console.log('   Role:', user.role)
    console.log('   Created:', user.createdAt)
  } else {
    console.log('❌ User NOT in public.User')
  }

  // Check next_auth.users
  const { data: nextAuthUser } = await supabase
    .schema('next_auth')
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (nextAuthUser) {
    console.log('✅ User exists in next_auth.users:')
    console.log('   Email:', nextAuthUser.email)
  } else {
    console.log('❌ User NOT in next_auth.users')
  }

  console.log('\nThis user was deleted, which sent the rejection email.')
}

checkDeletedUser().catch(console.error)
