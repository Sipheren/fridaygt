import type { Session } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { DbUser } from '@/types/database'

// Type guard to check if user has admin role
export function isAdmin(session: Session | null): session is Session & {
  user: { email: string; role: 'ADMIN'; name?: string | null; image?: string | null }
} {
  return !!(session?.user && (session.user as { role?: string }).role === 'ADMIN')
}

/**
 * Get the current user from the database based on their session
 * @param session - NextAuth session
 * @param selectFields - Optional fields to select (default: 'id')
 * @returns User data or null if not found
 */
export async function getCurrentUser<T extends keyof DbUser = 'id'>(
  session: Session | null,
  selectFields: T[] = ['id'] as T[]
): Promise<Pick<DbUser, T> | null> {
  if (!session?.user?.email) {
    return null
  }

  const supabase = createServiceRoleClient()
  const fields = selectFields.join(',')

  const { data } = await supabase
    .from('User')
    .select<string, Pick<DbUser, T>>(fields)
    .eq('email', session.user.email)
    .single()

  return data
}
