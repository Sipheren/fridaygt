import type { Session } from 'next-auth'

// Type guard to check if user has admin role
export function isAdmin(session: Session | null): session is Session & {
  user: { email: string; role: 'ADMIN'; name?: string | null; image?: string | null }
} {
  return !!(session?.user && (session.user as { role?: string }).role === 'ADMIN')
}
