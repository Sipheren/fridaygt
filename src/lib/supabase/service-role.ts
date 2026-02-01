import { createClient } from '@supabase/supabase-js'

/**
 * ⚠️ CRITICAL: Service Role Client
 *
 * This client bypasses Row Level Security (RLS) and has FULL database access.
 * It can read, write, and delete ANY data in the database.
 *
 * === REQUIREMENTS BEFORE USE ===
 *
 * 1. User MUST be authenticated via getServerSession() FIRST
 * 2. User MUST be authorized via getCurrentUser() to get role/data
 * 3. All queries MUST include ownership checks (userId === currentUser.id)
 * 4. Admin endpoints MUST verify isAdmin(currentUser) before use
 *
 * === CORRECT USAGE PATTERN ===
 *
 * ```typescript
 * // 1. Authenticate FIRST
 * const session = await getServerSession(authOptions)
 * if (!session?.user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 *
 * // 2. Get user data with role
 * const currentUser = await getCurrentUser(session)
 * if (!currentUser) {
 *   return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
 * }
 *
 * // 3. Check authorization for admin operations
 * if (!isAdmin(currentUser)) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 *
 * // 4. NOW use service role client (safe because user is authenticated)
 * const supabase = createServiceRoleClient()
 *
 * // 5. Always include ownership filter
 * const { data } = await supabase
 *   .from('CarBuild')
 *   .select('*')
 *   .eq('userId', currentUser.id)  // ← CRITICAL: ownership check
 *   .single()
 * ```
 *
 * === NEVER ===
 *
 * - NEVER use this client without authentication first
 * - NEVER use in client-side code (browser, React components)
 * - NEVER return raw service role client to frontend
 * - EVER skip ownership checks on user data
 *
 * @see docs/API_SECURITY.md for complete security guidelines
 */
export function createServiceRoleClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
