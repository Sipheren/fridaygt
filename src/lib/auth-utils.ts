/**
 * Authentication Utility Functions
 *
 * Purpose: Helper functions for authentication and authorization
 * - Type guards for role-based access control (RBAC)
 * - User data fetching with field selection
 * - Session-to-database user lookup
 *
 * **Functions Provided:**
 * - isAdmin(): Type guard to check if user has ADMIN role
 * - getCurrentUser(): Fetch user data from database with field selection
 *
 * **Role-Based Access Control (RBAC):**
 * - PENDING: Awaiting approval (can view admin dashboard)
 * - USER: Full access to approved features
 * - ADMIN: Full access + admin tools
 *
 * **Type Guards:**
 * - isAdmin() is a TypeScript type guard
 * - Narrows session.user type from { role?: string } to { role: 'ADMIN' }
 * - Enables type-safe admin checks throughout the codebase
 *
 * **Database vs Session:**
 * - Session: Stored in next_auth schema (minimal data: id, email, name)
 * - Database: Stored in public.User schema (full data: role, gamertag, etc.)
 * - getCurrentUser() bridges the gap by fetching from User table
 *
 * **Common Usage Patterns:**
 * ```tsx
 * // Type guard for admin-only routes
 * if (isAdmin(session)) {
 *   // TypeScript knows session.user.role is 'ADMIN'
 *   session.user.role // 'ADMIN' (not string | undefined)
 * }
 *
 * // Fetch user ID for ownership checks
 * const userData = await getCurrentUser(session)
 * if (userData?.id === resource.userId) {
 *   // User owns this resource
 * }
 *
 * // Fetch specific fields for optimization
 * const userData = await getCurrentUser(session, ['id', 'role', 'gamertag'])
 * ```
 *
 * **Security Notes:**
 * - isAdmin() checks session data (set by auth.ts session callback)
 * - getCurrentUser() uses service role client (bypasses RLS)
 * - Always verify ownership before allowing resource modifications
 *
 * **Debugging Tips:**
 * - isAdmin() returning false: Check session.user.role is set in auth.ts
 * - getCurrentUser() returning null: Check session.user.email matches database
 * - Type narrowing not working: Verify isAdmin() is used as type guard (if statement)
 * - Role not updating: Sign out and sign in again (session stale)
 *
 * **Related Files:**
 * - @/lib/auth.ts: Session callback sets user.role
 * - @/lib/supabase/service-role.ts: Database client for user fetching
 * - src/types/database.ts: DbUser type definition
 */

import type { Session } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { DbUser } from '@/types/database'

/**
 * Type guard to check if user has admin role
 *
 * This function serves two purposes:
 * 1. Runtime check: Returns true if session.user.role === 'ADMIN'
 * 2. Type guard: Narrows TypeScript type from Session to Session & { user: { role: 'ADMIN' } }
 *
 * **Type Guard Behavior:**
 * - Before: session.user.role is string | undefined
 * - After (inside if block): session.user.role is 'ADMIN'
 * - Enables type-safe access to admin-only properties
 *
 * **Usage Example:**
 * ```tsx
 * // Type narrowing
 * if (isAdmin(session)) {
 *   // TypeScript knows session.user.role is 'ADMIN'
 *   console.log(session.user.role) // 'ADMIN' (not string | undefined)
 * }
 *
 * // Admin-only route protection
 * export async function GET() {
 *   const session = await auth()
 *   if (!isAdmin(session)) {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 *   }
 *   // Admin code here...
 * }
 * ```
 *
 * @param session - NextAuth session object
 * @returns true if user has ADMIN role, false otherwise
 *
 * @example
 * ```tsx
 * const session = await auth()
 *
 * if (isAdmin(session)) {
 *   // session.user.role is 'ADMIN' (TypeScript knows this)
 *   return <AdminDashboard />
 * }
 *
 * // session.user.role is string | undefined (original type)
 * return <UserDashboard />
 * ```
 */
export function isAdmin(session: Session | null): session is Session & {
  user: { email: string; role: 'ADMIN'; name?: string | null; image?: string | null }
} {
  return !!(session?.user && (session.user as { role?: string }).role === 'ADMIN')
}

/**
 * Get the current user from the database based on their session
 *
 * Fetches user data from the User table using session email as lookup key.
 * Supports field selection for optimization (only fetch what you need).
 *
 * **Why Service Role Client?**
 * - Bypasses Row Level Security (RLS)
 * - Can fetch user data even if RLS policies would block it
 * - Safe here because we're filtering by session.user.email
 * - User can only fetch their own data (email from verified session)
 *
 * **Generic Type Parameter:**
 * - T extends keyof DbUser: Field name from DbUser type
 * - Default: 'id' (only fetch ID if no fields specified)
 * - Return type: Pick<DbUser, T> (object with only requested fields)
 *
 * **Usage Examples:**
 * ```tsx
 * // Fetch only user ID (default)
 * const userData = await getCurrentUser(session)
 * // userData: { id: string } | null
 *
 * // Fetch multiple fields
 * const userData = await getCurrentUser(session, ['id', 'role', 'gamertag'])
 * // userData: { id: string; role: string; gamertag: string | null } | null
 *
 * // Fetch all fields (type-safe)
 * const userData = await getCurrentUser(session, [
 *   'id', 'email', 'name', 'gamertag', 'role', 'createdAt', 'updatedAt'
 * ])
 * // userData: Pick<DbUser, 'id' | 'email' | ...> | null
 * ```
 *
 * **Field Selection Benefits:**
 * - Performance: Only fetch requested columns from database
 * - Type Safety: TypeScript knows which fields are available
 * - Explicit: Clear what data is being used
 * - Privacy: Don't fetch sensitive data unless needed
 *
 * @param session - NextAuth session object
 * @param selectFields - Array of field names to select (default: ['id'])
 * @returns User data with selected fields, or null if not found
 *
 * @example
 * ```tsx
 * // Fetch user ID for ownership check
 * const userData = await getCurrentUser(session)
 * if (userData?.id === resource.userId) {
 *   // User owns this resource
 * }
 *
 * // Fetch role and gamertag for display
 * const userData = await getCurrentUser(session, ['role', 'gamertag'])
 * console.log(`Welcome ${userData.gamertag} (${userData.role})`)
 * ```
 */
export async function getCurrentUser<T extends keyof DbUser = 'id'>(
  session: Session | null,
  selectFields: T[] = ['id'] as T[]
): Promise<Pick<DbUser, T> | null> {
  // ============================================================
  // SESSION VALIDATION
  // ============================================================
  // Check if session exists and has email
  // Session must be verified by NextAuth before accessing user data
  //
  // Debugging Tips:
  // - null returned: Check session.user.email is set
  // - Session undefined: User not authenticated, call auth() first
  // - Email mismatch: Verify session.user.email matches User table
  // ============================================================

  if (!session?.user?.email) {
    return null
  }

  // ============================================================
  // DATABASE QUERY WITH FIELD SELECTION
  // ============================================================
  // Fetch user data from User table using session email
  // Service role client bypasses RLS (safe because filtering by session email)
  // Field selection optimization: Only fetch requested columns
  //
  // Why Service Role Client?
  // - Bypasses RLS policies that might block user access
  // - Safe here because filtering by session.user.email (verified email)
  // - User can only fetch their own data (email from authenticated session)
  //
  // Field Selection:
  // - selectFields joined with comma: "id,role,gamertag"
  // - Generic type ensures return type matches requested fields
  // - TypeScript knows exactly which fields are available
  //
  // Debugging Tips:
  // - null returned: Check User table has record with matching email
  // - Field not found: Verify field name exists in DbUser type
  // - Type error: Ensure selectFields array matches DbUser keys
  // ============================================================

  const supabase = createServiceRoleClient()
  const fields = selectFields.join(',')

  const { data } = await supabase
    .from('User')
    .select<string, Pick<DbUser, T>>(fields)
    .eq('email', session.user.email)
    .single()

  return data
}
