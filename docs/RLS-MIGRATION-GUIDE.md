# RLS Migration Guide

## What You Need to Do

Run these two SQL migrations in your Supabase Dashboard SQL Editor **in this order**:

### Step 1: Add Gamertag Column
**File**: `/migrations/add-gamertag-to-user.sql`

This adds:
- `gamertag` column to User table (publicly visible username)
- Unique constraint (no duplicate gamertags)
- Sets existing users' gamertags to their email prefix as placeholder

**Important**: After running this, you should update your own gamertag from the placeholder:
```sql
UPDATE "User"
SET "gamertag" = 'YourDesiredGamertag'
WHERE email = 'david@sipheren.com';
```

### Step 2: Enable RLS
**File**: `/migrations/enable-rls.sql`

This enables Row Level Security on all tables with policies for:

## Security Model

### Public Data (anyone can view, even unauthenticated):
- ✅ All lap times (for leaderboards)
- ✅ Public run lists
- ✅ Public builds
- ✅ User gamertags (for leaderboard display)
- ✅ Tracks and cars (GT7 data)
- ✅ Session attendance (race night tracking)

### Authenticated User Data (visible to logged-in users):
- ✅ User real names (shown on authenticated pages)
- ✅ Private run lists (creator only)
- ✅ Private builds (creator only)

### Protected Data (never public):
- 🔒 Email addresses (owner + admins only)
- 🔒 Auth tokens/sessions (owner only)
- 🔒 Account data (owner only)

### User Permissions:
- ✅ Users can create: lap times, builds, run lists, sessions
- ✅ Users can update/delete: their own data only
- ✅ Users cannot modify: GT7 data (tracks, cars), other users' data
- ✅ Users cannot change: their own role (admin only)

## What Changes After Migration

### API Behavior:
- **No code changes needed** - RLS is enforced at the database level
- Supabase client queries will automatically respect policies
- Anonymous users can still view public data (leaderboards work)
- Server-side queries with service role key bypass RLS (admin operations)

### Database Access:
- Direct database access (e.g., from external tools) will now respect RLS
- Your Supabase anon key is now safe to use in client-side code
- Prevents data leaks even if API endpoints have bugs

### User Experience:
- Leaderboards show **gamertags** publicly
- Logged-in users see **real names** + gamertags
- Private builds/lists are truly private
- No functional changes to existing features

## Additional Code Updates Needed

After running migrations, I need to update the codebase to:

1. **Profile Completion Flow**:
   - Create `/auth/complete-profile` page to collect gamertag on first login
   - Add middleware check to redirect users without gamertags
   - Create API route to update user profile

2. **UI Updates** (show gamertag publicly, name only to authenticated):
   - Leaderboard displays
   - Lap time cards
   - Build/run list creator displays
   - Session attendance lists

3. **TypeScript Types**:
   - Update NextAuth types to include `gamertag` field
   - Update User interface definitions

Should I proceed with creating these code updates after you run the migrations?

## Testing After Migration

1. **Test public access** (not logged in):
   - Visit `/tracks` - should work
   - Visit `/cars` - should work
   - Visit `/lap-times` - should show leaderboards
   - Visit `/builds?public=true` - should show public builds

2. **Test authenticated access** (logged in):
   - Create a lap time - should work
   - Create a build - should work
   - View your private builds - should work
   - Try to edit another user's build - should fail

3. **Test data protection**:
   - Check browser network tab - email should not appear in responses
   - Try direct Supabase queries - should respect RLS

## Rollback (if needed)

If something breaks, you can disable RLS temporarily:

```sql
-- EMERGENCY ROLLBACK - Disable RLS on all tables
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "LapTime" DISABLE ROW LEVEL SECURITY;
-- etc for all tables
```

But this should only be temporary while you debug!
