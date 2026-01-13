import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function mapAuthSystem() {
  console.log('='.repeat(80))
  console.log('FRIDAYGT AUTHENTICATION SYSTEM MAP')
  console.log('='.repeat(80))

  // 1. Check what tables exist in public schema
  console.log('\n📋 TABLES IN PUBLIC SCHEMA:')
  console.log('-'.repeat(80))

  const { data: publicTables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .not('table_name', 'like', 'pg_%')
    .not('table_name', 'like', '_supabase_%')
    .in('table_name', ['User', 'Account', 'Session', 'VerificationToken'])
    .order('table_name')

  if (publicTables && publicTables.length > 0) {
    publicTables.forEach(t => console.log(`   ✅ ${t.table_name}`))
  } else {
    console.log('   ❌ No auth tables found')
  }

  // 2. Check what tables exist in next_auth schema
  console.log('\n📋 TABLES IN NEXT_AUTH SCHEMA:')
  console.log('-'.repeat(80))

  const { data: nextAuthTables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'next_auth')
    .not('table_name', 'like', 'pg_%')
    .order('table_name')

  if (nextAuthTables && nextAuthTables.length > 0) {
    nextAuthTables.forEach(t => console.log(`   ✅ ${t.table_name}`))
  } else {
    console.log('   ❌ No tables found')
  }

  // 3. Check records in public.User table
  console.log('\n📊 RECORDS IN PUBLIC.USER:')
  console.log('-'.repeat(80))

  const { data: publicUsers, error: publicUserError } = await supabase
    .from('User')
    .select('id, email, name, gamertag, role, createdAt')
    .order('createdAt')

  if (publicUserError) {
    console.log(`   ❌ Error: ${publicUserError.message}`)
  } else if (publicUsers && publicUsers.length > 0) {
    publicUsers.forEach(u => {
      console.log(`   📧 ${u.email}`)
      console.log(`      ID: ${u.id}`)
      console.log(`      Name: ${u.name || 'none'}`)
      console.log(`      Gamertag: ${u.gamertag || 'none'}`)
      console.log(`      Role: ${u.role}`)
      console.log(`      Created: ${u.createdAt}`)
      console.log('')
    })
  } else {
    console.log('   ❌ No users found')
  }

  // 4. Check records in next_auth.users table
  console.log('\n📊 RECORDS IN NEXT_AUTH.USERS:')
  console.log('-'.repeat(80))

  const { data: nextAuthUsers, error: nextAuthUserError } = await supabase
    .schema('next_auth')
    .from('users')
    .select('id, email, name, emailVerified')
    .order('id')

  if (nextAuthUserError) {
    console.log(`   ❌ Error: ${nextAuthUserError.message}`)
  } else if (nextAuthUsers && nextAuthUsers.length > 0) {
    nextAuthUsers.forEach(u => {
      console.log(`   📧 ${u.email}`)
      console.log(`      ID: ${u.id}`)
      console.log(`      Name: ${u.name || 'none'}`)
      console.log(`      Email Verified: ${u.emailVerified || 'no'}`)
      console.log('')
    })
  } else {
    console.log('   ❌ No users found')
  }

  // 5. Check records in next_auth.accounts table
  console.log('\n📊 RECORDS IN NEXT_AUTH.ACCOUNTS:')
  console.log('-'.repeat(80))

  const { data: accounts, error: accountsError } = await supabase
    .schema('next_auth')
    .from('accounts')
    .select('id, userId, provider, providerAccountId')
    .order('userId')

  if (accountsError) {
    console.log(`   ❌ Error: ${accountsError.message}`)
  } else if (accounts && accounts.length > 0) {
    accounts.forEach(a => {
      console.log(`   📝 Account ID: ${a.id}`)
      console.log(`      User ID: ${a.userId}`)
      console.log(`      Provider: ${a.provider}`)
      console.log(`      Provider Account ID: ${a.providerAccountId}`)
      console.log('')
    })
  } else {
    console.log('   ❌ No accounts found')
  }

  // 6. Check records in next_auth.sessions table
  console.log('\n📊 RECORDS IN NEXT_AUTH.SESSIONS:')
  console.log('-'.repeat(80))

  const { data: sessions, error: sessionsError } = await supabase
    .schema('next_auth')
    .from('sessions')
    .select('id, userId, sessionToken, expires')
    .order('expires', { ascending: false })
    .limit(5)

  if (sessionsError) {
    console.log(`   ❌ Error: ${sessionsError.message}`)
  } else if (sessions && sessions.length > 0) {
    sessions.forEach(s => {
      console.log(`   🔑 Session ID: ${s.id}`)
      console.log(`      User ID: ${s.userId}`)
      console.log(`      Token: ${s.sessionToken?.substring(0, 20)}...`)
      console.log(`      Expires: ${s.expires}`)
      console.log('')
    })
  } else {
    console.log('   ❌ No sessions found')
  }

  // 7. Cross-reference: Check if IDs match between schemas
  console.log('\n🔗 ID CROSS-REFERENCE (PUBLIC.USER ↔ NEXT_AUTH.USERS):')
  console.log('-'.repeat(80))

  if (publicUsers && nextAuthUsers) {
    const publicIds = new Set(publicUsers.map(u => u.id))
    const nextAuthIds = new Set(nextAuthUsers.map(u => u.id))

    const inBoth = [...publicIds].filter(id => nextAuthIds.has(id))
    const onlyInPublic = [...publicIds].filter(id => !nextAuthIds.has(id))
    const onlyInNextAuth = [...nextAuthIds].filter(id => !publicIds.has(id))

    console.log(`   ✅ Users in BOTH schemas: ${inBoth.length}`)
    inBoth.forEach(id => {
      const publicUser = publicUsers.find(u => u.id === id)
      const nextAuthUser = nextAuthUsers.find(u => u.id === id)
      console.log(`      ${id}: ${publicUser?.email} ↔ ${nextAuthUser?.email}`)
    })

    console.log(`\n   ⚠️  Users ONLY in public.User: ${onlyInPublic.length}`)
    onlyInPublic.forEach(id => {
      const publicUser = publicUsers.find(u => u.id === id)
      console.log(`      ${id}: ${publicUser?.email}`)
    })

    console.log(`\n   ⚠️  Users ONLY in next_auth.users: ${onlyInNextAuth.length}`)
    onlyInNextAuth.forEach(id => {
      const nextAuthUser = nextAuthUsers.find(u => u.id === id)
      console.log(`      ${id}: ${nextAuthUser?.email}`)
    })
  }

  // 8. Explain the current auth flow
  console.log('\n🔄 CURRENT AUTHENTICATION FLOW:')
  console.log('-'.repeat(80))
  console.log('   1. User enters email on /auth/signin page')
  console.log('   2. NextAuth sends magic link via email (Resend provider)')
  console.log('   3. User clicks magic link → redirects to /api/auth/callback/resend')
  console.log('   4. NextAuth SupabaseAdapter:')
  console.log('      - Creates record in next_auth.users')
  console.log('      - Creates record in next_auth.accounts')
  console.log('      - Creates record in next_auth.sessions')
  console.log('   5. Session callback in /src/lib/auth.ts:')
  console.log('      - Receives user object from NextAuth (from next_auth.users)')
  console.log('      - Queries public.User table for custom fields (role, gamertag)')
  console.log('   6. IF public.User record exists:')
  console.log('      - Session gets role and gamertag')
  console.log('      - User proceeds to app')
  console.log('   7. IF public.User record DOES NOT exist:')
  console.log('      - Session gets role=USER (default)')
  console.log('      - Session gamertag=undefined')
  console.log('      - Middleware redirects to /auth/complete-profile')
  console.log('   8. User submits gamertag → PATCH /api/user/profile')
  console.log('      - Tries to UPDATE public.User')
  console.log('      - FAILS because record doesn\'t exist!')

  console.log('\n❗ THE PROBLEM:')
  console.log('-'.repeat(80))
  console.log('   next_auth schema (managed by NextAuth adapter):')
  console.log('   - ✅ Creates users, accounts, sessions tables')
  console.log('   - ✅ Creates records when users sign in')
  console.log('')
  console.log('   public schema (managed by application):')
  console.log('   - ✅ Has User table with custom fields (role, gamertag)')
  console.log('   - ❌ NO automatic record creation')
  console.log('   - ❌ NO sync between schemas')
  console.log('')
  console.log('   Result: User exists in next_auth but not in public.User!')
  console.log('   This causes the PATCH /api/user/profile to fail with "0 rows".')

  console.log('\n💡 WHAT WAS INTENDED (APPROVAL SYSTEM):')
  console.log('-'.repeat(80))
  console.log('   The original design likely intended:')
  console.log('   1. User signs up → creates record in next_auth.users')
  console.log('   2. Admin gets notification')
  console.log('   3. Admin approves → creates record in public.User with role=USER')
  console.log('   4. User can then log in and set gamertag')
  console.log('')
  console.log('   OR:')
  console.log('   1. User signs up → creates pending record in public.User')
  console.log('   2. Admin approves → updates role from PENDING to USER')
  console.log('   3. User can then complete their profile')

  console.log('\n')
}

mapAuthSystem().catch(console.error)
