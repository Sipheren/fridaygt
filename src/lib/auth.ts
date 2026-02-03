/**
 * NextAuth Configuration
 *
 * This file configures authentication for FridayGT using:
 * - NextAuth.js v5 with email magic links (Resend provider)
 * - Supabase adapter for database session storage
 * - Custom session callback for role-based access control
 *
 * Debugging Tips:
 * - Session callback runs on every request with a valid session
 * - Role is fetched from User table (not in next_auth schema)
 * - Admin notifications sent via atomic update (prevents duplicates)
 * - DEFAULT_ADMIN_EMAIL is auto-promoted to ADMIN role
 * - PENDING users trigger admin email notifications (once per user)
 */

import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { Resend as ResendClient } from "resend"
import { getFullUrl } from "@/lib/utils"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "database", // Use database sessions instead of JWT
    maxAge: 7 * 24 * 60 * 60, // 7 days - sessions expire after 7 days
  },
  providers: [
    Resend({
      from: process.env.EMAIL_FROM!,
      apiKey: process.env.RESEND_API_KEY!,
      maxAge: 15 * 60, // 15 minutes - magic links expire after 15 minutes
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

        // Notify admins about pending users who haven't been notified yet
        if (session.user.role === 'PENDING') {
          // Atomic update: only mark as notified if currently false
          // This prevents race conditions where multiple callbacks send duplicate emails
          const { data: updatedUser } = await supabase
            .from('User')
            .update({ adminNotified: true })
            .eq('id', user.id)
            .is('adminNotified', false)
            .select('adminNotified')
            .single()

          // Only send email if we actually updated the row (meaning it was false before)
          if (updatedUser?.adminNotified === true) {
            // Log notification (email masked in production)
            console.log(`Sending admin notification for new pending user: ${session.user.id}`)

            try {
              // Fetch all admin emails
              const { data: admins } = await supabase
                .from('User')
                .select('email')
                .eq('role', 'ADMIN')

              if (admins && admins.length > 0) {
                const resend = new ResendClient(process.env.RESEND_API_KEY)

                // Send notification to all admins
                await Promise.allSettled(
                  admins.map(admin =>
                    resend.emails.send({
                      from: process.env.EMAIL_FROM!,
                      to: admin.email,
                      subject: 'New User Awaiting Approval - FridayGT',
                      html: `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <style>
                              body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
                              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                              .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e7eb; }
                              .content { padding: 30px 0; }
                              .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
                              .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
                            </style>
                          </head>
                          <body>
                            <div class="container">
                              <div class="header">
                                <img src="${getFullUrl('/logo-fgt.png')}" alt="FridayGT" style="height: 50px;">
                              </div>
                              <div class="content">
                                <h1>New User Registration</h1>
                                <p>A new user has signed up and is awaiting approval:</p>
                                <p style="background: #f3f4f6; padding: 15px; border-radius: 6px;">
                                  <strong>Email:</strong> ${session.user.email}<br>
                                  <strong>Name:</strong> ${session.user.name || 'Not provided'}<br>
                                  <strong>Date:</strong> ${new Date().toLocaleDateString()}
                                </p>
                                <p style="text-align: center; margin: 30px 0;">
                                  <a href="${getFullUrl('/admin/users')}" class="button">Review & Approve</a>
                                </p>
                              </div>
                              <div class="footer">
                                <p>You're receiving this email because you're an admin on FridayGT.</p>
                              </div>
                            </div>
                          </body>
                        </html>
                      `,
                    })
                  )
                )

                console.log(`Admin notification sent for new user: ${session.user.id}`)
              } else {
                console.log('No admins found to notify')
              }
            } catch (error) {
              console.error('Failed to send admin notification:', error)
              // Don't fail the auth flow if email fails
            }
          } else {
            console.log(`Skipping admin notification - already notified (adminNotified=true)`)
          }
        } else {
          console.log(`Skipping admin notification - role=${session.user.role}`)
        }

        // Auto-promote default admin email (bootstrapping first admin)
        // SECURITY: Only auto-promotes if email matches DEFAULT_ADMIN_EMAIL exactly
        // This is safe because the env var is controlled by the server admin
        // Once an admin exists, they can promote other users via the admin API
        if (session.user.email === process.env.DEFAULT_ADMIN_EMAIL && session.user.role !== 'ADMIN') {
          console.log(`Auto-promoting DEFAULT_ADMIN_EMAIL to ADMIN: ${session.user.id}`)

          const { error: updateError } = await supabase
            .from('User')
            .update({ role: 'ADMIN', updatedAt: new Date().toISOString() })
            .eq('email', session.user.email)

          if (!updateError) {
            session.user.role = 'ADMIN'
            console.log(`Successfully promoted ${session.user.id} to ADMIN`)
          } else {
            console.error('Failed to promote default admin:', updateError)
          }
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
