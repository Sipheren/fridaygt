# Authentication System State - 2026-01-13

## Current Architecture

The authentication system uses **two separate schemas**:

### 1. `next_auth` Schema (Managed by NextAuth)
- **Tables**: `users`, `accounts`, `sessions`, `verification_tokens`
- **Managed by**: NextAuth SupabaseAdapter
- **Purpose**: Handles standard authentication (magic links, sessions)
- **Fields**: Standard auth fields only (id, email, emailVerified, name)

### 2. `public` Schema (Managed by Application)
- **Tables**: `User` (custom fields: role, gamertag, etc.)
- **Managed by**: Application logic
- **Purpose**: Stores user data for the application
- **Referenced by**: Race, Session, LapTime, Build, RunList tables

## Current State (2026-01-13)

### `next_auth.users` - 2 records
1. `9932e1b2-b495-4a68-a5cb-367730342c68` - david@sipheren.com ✅
2. `e32bbf0e-642e-4f92-aed7-b74091e7cbdc` - test@sipheren.com (test account)

### `next_auth.accounts` - 0 records
⚠️ No accounts exist (magic link provider doesn't use accounts table)

### `next_auth.sessions` - 3 active sessions
1. User ID: `e32bbf0e-642e-4f92-aed7-b74091e7cbdc` (test@sipheren.com)
2. User ID: `9932e1b2-b495-4a68-a5cb-367730342c68` (david@sipheren.com)
3. User ID: `9932e1b2-b495-4a68-a5cb-367730342c68` (david@sipheren.com)

### `public.User` - 1 record
1. `9932e1b2-b495-4a68-a5cb-367730342c68` - david@sipheren.com
   - Name: David
   - Gamertag: Sipheren007
   - Role: ADMIN
   - Created: 2026-01-07

## The Problem

**User `test@sipheren.com` exists in `next_auth.users` but NOT in `public.User`**

This causes:
1. ✅ User can sign in (magic link works)
2. ✅ Session created in `next_auth.sessions`
3. ❌ Session callback queries `public.User` - NOT FOUND
4. ⚠️ Defaults to `role=USER`, `gamertag=undefined`
5. ⚠️ Redirected to `/auth/complete-profile`
6. ❌ PATCH `/api/user/profile` tries to UPDATE `public.User`
7. ❌ **Error: "The result contains 0 rows"** - Record doesn't exist!

## Root Cause

**No synchronization between the two schemas**

When NextAuth creates a new user in `next_auth.users`, there is:
- ❌ No database trigger to create matching `public.User` record
- ❌ No application code to create matching `public.User` record
- ❌ No error handling to detect missing `public.User` record

## What Was Intended (Approval System)

The two-schema setup suggests an approval workflow was planned:

### Original Design Theory:
1. User signs up → NextAuth creates `next_auth.users` record
2. User can "log in" but has PENDING status
3. Admin gets notification of new user
4. Admin approves user → Creates `public.User` record with role
5. User redirected to complete profile
6. User can now access the app

### What's Missing:
- ❌ Notification system for admins
- ❌ Approval interface for admins
- ❌ Sync mechanism between schemas
- ❌ Handling of PENDING users in the UI

## Files Involved

### Authentication Configuration
- `/src/lib/auth.ts` - NextAuth config with SupabaseAdapter
  - Adapter hardcoded to use `next_auth` schema
  - Session callback queries `public.User` for custom fields

### Database Schema
- `/supabase/migrations/init.sql` - Creates `public.User` table
- NextAuth adapter creates `next_auth.*` tables automatically

### APIs
- `/src/app/api/user/profile/route.ts` - Updates user gamertag
  - Expects record to already exist in `public.User`
  - Fails if record doesn't exist

### Pages
- `/src/app/auth/signin/page.tsx` - Sign in page
- `/src/app/auth/complete-profile/page.tsx` - Gamertag setup
- `/src/proxy.ts` - Middleware that checks for gamertag

## Technical Details

### NextAuth SupabaseAdapter
```typescript
// From: node_modules/@auth/supabase-adapter/src/index.ts
const supabase = createClient<Database, "next_auth">(url, secret, {
  db: { schema: "next_auth" }, // ← Hardcoded!
  ...
})
```

The adapter is **hardcoded** to use the `next_auth` schema with lowercase table names (`users`, `accounts`, `sessions`).

### Session Callback Flow
```typescript
async session({ session, user }) {
  // user object comes from next_auth.users
  session.user.id = user.id

  // Query public.User for custom fields
  const { data: dbUser } = await supabase
    .from('User')
    .select('role, gamertag')
    .eq('id', user.id)
    .single()

  // If not found, uses defaults
  session.user.role = dbUser?.role || 'USER'
  session.user.gamertag = dbUser?.gamertag || undefined
}
```

## Next Steps

See `AUTH-FIX-OPTION2-PLAN.md` for the fix implementation plan.
