/**
 * NextAuth.js API Route Handler
 *
 * GET /api/auth/[...nextauth] - NextAuth GET requests
 * POST /api/auth/[...nextauth] - NextAuth POST requests
 *
 * Purpose: Export NextAuth.js handlers for authentication
 * - This file acts as a bridge between Next.js App Router and NextAuth.js
 * - Exports GET and POST handlers for all NextAuth operations
 * - NextAuth handles multiple authentication flows through these handlers
 *
 * **What This File Does:**
 * - Imports auth configuration from @/lib/auth
 * - Exports handlers object containing GET and POST functions
 * - NextAuth.js uses dynamic route [...nextauth] to catch all auth endpoints
 *
 * **Authentication Flows Handled:**
 * - Sign in: /api/auth/signin - Login page and form submission
 * - Sign out: /api/auth/signout - Logout and session cleanup
 * - Callback: /api/auth/callback - OAuth provider redirects
 * - Session: /api/auth/session - Get current session data
 * - CSRF: /api/auth/csrf - CSRF token for form protection
 * - Providers: /api/auth/providers - List available auth providers
 *
 * **Why This File Structure?**
 * - NextAuth.js requires a catch-all route at /api/auth/[...nextauth]
 * - The [...nextauth] syntax catches all subroutes under /api/auth/*
 * - Exporting handlers from lib/auth.ts keeps auth logic centralized
 * - Next.js App Router requires explicit export of GET and POST
 *
 * **Auth Configuration:**
 * - Main configuration located in @/lib/auth.ts
 * - Providers configured: Email (passwordless)
 * - Database adapter: Supabase (next_auth schema)
 * - Session strategy: JWT (database sessions optional)
 *
 * **How It Works:**
 * 1. NextAuth receives request at /api/auth/* route
 * 2. Request is routed to this file via [...nextauth] catch-all
 * 3. Handlers process request based on path (signin, signout, callback, etc.)
 * 4. NextAuth manages session, database, and OAuth interactions
 * 5. Response returned to client (session data, redirect, error, etc.)
 *
 * **Security:**
 * - CSRF protection enabled by default
 * - JWT tokens signed with secret (NEXTAUTH_SECRET)
 * - Session cookies: httpOnly, secure, sameSite=lax
 * - OAuth state parameter prevents CSRF attacks
 *
 * **Debugging Tips:**
 * - Auth not working: Check NEXTAUTH_URL and NEXTAUTH_SECRET are set
 * - Database errors: Verify next_auth schema tables exist (users, accounts, sessions)
 * - Email not sending: Check SMTP settings in lib/auth.ts
 * - Session issues: Clear cookies and test signin flow again
 * - OAuth errors: Check provider credentials and callback URLs
 *
 * **Common NextAuth Endpoints:**
 * - GET /api/auth/signin - Render signin page
 * - POST /api/auth/signin - Submit signin form
 * - GET /api/auth/signout - Render signout page
 * - POST /api/auth/signout - Submit signout form
 * - GET /api/auth/session - Get current session (JSON)
 * - GET /api/auth/providers - List auth providers
 * - GET /api/auth/csrf - Get CSRF token
 * - GET/POST /api/auth/callback/:provider - OAuth callback
 *
 * **File References:**
 * - @/lib/auth.ts: Main auth configuration (providers, adapter, callbacks)
 * - @/lib/auth-utils.ts: Helper functions (isAdmin, getCurrentUser)
 * - next_auth schema: Database tables (users, accounts, sessions)
 */

import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
