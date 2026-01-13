# Authentication Fix Plan - Option 2: Auto-Create with PENDING Role

## Goal

Fix the authentication system so new users can:
1. ✅ Sign in with magic link
2. ✅ Automatically have a `public.User` record created
3. ✅ Complete their profile (set gamertag)
4. ✅ Start using the app immediately

**No approval process needed** - users are active immediately upon signing in.

## Problem Summary

- NextAuth creates user in `next_auth.users` when they sign in
- No corresponding record is created in `public.User`
- When user tries to set gamertag, PATCH fails because record doesn't exist

## Solution: Database Trigger

Create a PostgreSQL trigger that automatically creates a `public.User` record whenever a new user is inserted into `next_auth.users`.

## Implementation Steps

### Step 1: Clean Up Test Data

**File**: `/supabase/migrations/20260113_cleanup_test_users.sql`

Remove all test accounts and sessions, keeping only the admin user.

```sql
DELETE FROM "next_auth"."sessions"
WHERE "userId" != '9932e1b2-b495-4a68-a5cb-367730342c68';

DELETE FROM "next_auth"."verification_tokens";

DELETE FROM "next_auth"."accounts"
WHERE "userId" != '9932e1b2-b495-4a68-a5cb-367730342c68';

DELETE FROM "next_auth"."users"
WHERE "id" != '9932e1b2-b495-4a68-a5cb-367730342c68';
```

### Step 2: Create Sync Function

**File**: `/supabase/migrations/20260113_create_user_sync_trigger.sql`

Create a PostgreSQL function that copies new users from `next_auth.users` to `public.User`.

```sql
-- Function to create public.User record when next_auth.users is created
CREATE OR REPLACE FUNCTION public.sync_next_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "public"."User" (
    id,
    email,
    name,
    role,
    gamertag,
    "createdAt",
    "updatedAt"
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.name,
    'USER',           -- Default role
    NULL,             -- Gamertag to be set later
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't overwrite if exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Create Trigger

Add the trigger to fire after INSERT on `next_auth.users`.

```sql
-- Create trigger
DROP TRIGGER IF EXISTS on_next_auth_user_created ON "next_auth"."users";

CREATE TRIGGER on_next_auth_user_created
AFTER INSERT ON "next_auth"."users"
FOR EACH ROW
EXECUTE FUNCTION public.sync_next_auth_user();
```

### Step 4: Update User Profile API

**File**: `/src/app/api/user/profile/route.ts`

Change from UPDATE to UPSERT so it works whether record exists or not.

**Current code**:
```typescript
const { data: updatedUser, error } = await supabase
  .from('User')
  .update(updateData)
  .eq('id', session.user.id)
  .select()
  .single()
```

**Updated code**:
```typescript
const { data: updatedUser, error } = await supabase
  .from('User')
  .upsert({
    id: session.user.id,
    ...updateData,
  }, {
    onConflict: 'id',
    ignoreDuplicates: false,
  })
  .select()
  .single()
```

Actually, with the trigger in place, the UPDATE should work fine. But let's make it more robust:

```typescript
// First ensure user exists (create if missing - safety net)
const { error: ensureError } = await supabase
  .from('User')
  .upsert({
    id: session.user.id,
    email: session.user.email,
  }, {
    onConflict: 'id',
    ignoreDuplicates: true,
  })

if (ensureError) {
  console.error('Error ensuring user exists:', ensureError)
  return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
}

// Now update with gamertag
const { data: updatedUser, error } = await supabase
  .from('User')
  .update(updateData)
  .eq('id', session.user.id)
  .select('id, email, name, gamertag, role')
  .single()
```

### Step 5: Remove PENDING Role Logic

**File**: `/src/lib/auth.ts`

Remove the PENDING role logic since all users are now active.

**Current code**:
```typescript
session.user.role = dbUser?.role || 'PENDING'
```

**Updated code**:
```typescript
session.user.role = dbUser?.role || 'USER'
```

### Step 6: Update Middleware Redirect

**File**: `/src/proxy.ts`

The middleware should redirect users to complete-profile if they don't have a gamertag.

**Current logic**:
```typescript
// Check if user needs to complete profile
if (session?.user && !isAuthPage && !(session.user as any).gamertag) {
  const url = req.nextUrl.clone()
  url.pathname = '/auth/complete-profile'
  return NextResponse.redirect(url)
}
```

This logic is correct - keep it as is. Users will be redirected to set their gamertag.

### Step 7: Test the Flow

**Test Case: New User Sign Up**

1. Go to `/auth/signin`
2. Enter new email address
3. Click email link
4. **Trigger fires** → Creates `public.User` record with:
   - `id` (from next_auth.users)
   - `email` (from next_auth.users)
   - `role` = 'USER'
   - `gamertag` = NULL
5. Session callback queries `public.User` ✅ Found!
6. Middleware sees `gamertag = NULL`
7. Redirects to `/auth/complete-profile`
8. User enters gamertag
9. PATCH `/api/user/profile` updates the record ✅
10. User redirected to home page ✅

**Test Case: Existing Admin User**

1. Admin signs in
2. Trigger fires → tries to create record, ON CONFLICT does nothing ✅
3. Session callback queries `public.User` ✅ Found existing record
4. Has gamertag, no redirect needed
5. Goes to home page ✅

## Migration Order

1. **20260113_cleanup_test_users.sql** - Remove test data
2. **20260113_create_user_sync_trigger.sql** - Create sync function and trigger
3. Update `/src/app/api/user/profile/route.ts` - Add safety upsert
4. Update `/src/lib/auth.ts` - Change PENDING to USER
5. Test with new user sign up

## Benefits of This Approach

✅ **Automatic sync** - Database trigger handles it, no app code changes needed
✅ **No race conditions** - Trigger fires immediately on INSERT
✅ **Reliable** - Works even if app code has bugs
✅ **Simple** - Single trigger, minimal code changes
✅ **Backward compatible** - Existing admin user unaffected
✅ **No approval needed** - Users can start using app immediately

## Alternative Approaches Considered

### Option 1: Approval System (Rejected)
- More complex
- Requires admin UI
- Blocks new users from using app
- Not what you want right now

### Option 3: App-Level Sync (Rejected)
- Create user in application code after sign-in
- Requires auth callback changes
- More moving parts
- Trigger is simpler and more reliable

### Option 4: Merge Tables (Rejected)
- Would require changing NextAuth adapter source code
- Adapter is hardcoded to `next_auth` schema
- Too invasive, breaks on adapter updates

## Files to Modify

1. `/supabase/migrations/20260113_cleanup_test_users.sql` - CREATE
2. `/supabase/migrations/20260113_create_user_sync_trigger.sql` - CREATE
3. `/src/app/api/user/profile/route.ts` - MODIFY (add safety upsert)
4. `/src/lib/auth.ts` - MODIFY (change PENDING to USER)

## Testing Checklist

- [ ] Run cleanup migration
- [ ] Run trigger migration
- [ ] Sign in as admin user - should still work
- [ ] Sign out
- [ ] Sign in with new email (e.g., newtest@example.com)
- [ ] Verify `next_auth.users` has new user
- [ ] Verify `public.User` has new user with role=USER, gamertag=NULL
- [ ] Verify redirect to `/auth/complete-profile`
- [ ] Submit gamertag
- [ ] Verify `public.User` updated with gamertag
- [ ] Verify redirect to home page
- [ ] Verify user can access the app

## Rollback Plan

If something goes wrong:

```sql
-- Remove the trigger
DROP TRIGGER IF EXISTS on_next_auth_user_created ON "next_auth"."users";

-- Remove the function
DROP FUNCTION IF EXISTS public.sync_next_auth_user();
```

Then manually create any missing `public.User` records:

```sql
-- Find users in next_auth that don't exist in public
INSERT INTO "public"."User" (id, email, name, role, "createdAt", "updatedAt")
SELECT
  u.id,
  u.email,
  u.name,
  'USER',
  NOW(),
  NOW()
FROM "next_auth"."users" u
LEFT JOIN "public"."User" pu ON u.id = pu.id
WHERE pu.id IS NULL;
```
