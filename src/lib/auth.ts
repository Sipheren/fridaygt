import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { SupabaseAdapter } from "@auth/supabase-adapter"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "database", // Use database sessions instead of JWT
  },
  providers: [
    Resend({
      from: process.env.EMAIL_FROM!,
      apiKey: process.env.RESEND_API_KEY!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user }) {
      // Check if this is the default admin email and promote to ADMIN
      if (user.email === process.env.DEFAULT_ADMIN_EMAIL) {
        // Will be handled by session callback
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id

        // Fetch full user data from database (adapter doesn't include all fields)
        const { createClient } = await import("@supabase/supabase-js")
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: dbUser } = await supabase
          .from('User')
          .select('role, gamertag')
          .eq('id', user.id)
          .single()

        session.user.role = dbUser?.role || 'PENDING'
        session.user.gamertag = dbUser?.gamertag || undefined

        // Auto-promote default admin
        if (session.user.email === process.env.DEFAULT_ADMIN_EMAIL && session.user.role !== 'ADMIN') {
          await supabase
            .from('User')
            .update({ role: 'ADMIN', updatedAt: new Date().toISOString() })
            .eq('email', session.user.email)

          session.user.role = 'ADMIN'
        }
      }
      return session
    },
  },
})

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}
