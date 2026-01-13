# Current Situation & Next Steps

**Date:** 2026-01-13
**Status:** Approval System Complete ✅ | Auth Pages Fixed ✅ | Race Selection Complete ✅ | Build Fixed ✅ | Database Audit Complete ✅ | All Tables camelCase ✅

---

## ✅ Recently Completed (2026-01-13)

### User Approval System
**Status:** ✅ COMPLETE

New user registration now requires admin approval:
1. User signs up → Account created with `role='PENDING'`
2. Admins receive email notification
3. Admin approves → User receives approval email
4. User completes profile (sets gamertag)
5. User can access the app

**Key Features:**
- Database trigger auto-creates `public.User` records when `next_auth.users` is created
- Pending users see "Account Pending Approval" page with clear instructions
- Admins receive styled HTML emails with approve/reject links
- Users receive styled approval emails with "Complete Your Profile" button
- Full cascade deletion (sessions → accounts → users → public.User)

**Files:**
- `src/app/auth/pending/page.tsx` - Pending approval page
- `src/app/admin/users/page.tsx` - Improved UX with loading states, dialogs, success/error messages
- `src/lib/auth.ts` - Admin notification system
- `src/proxy.ts` - Redirect logic for PENDING users
- `supabase/migrations/20260113_update_trigger_for_pending.sql` - Trigger for PENDING role

### Auth Pages UI/UX
**Status:** ✅ COMPLETE

All auth pages now have consistent styling:
- FridayGT logo on all pages (signin, verify-request, error, pending, complete-profile)
- shadcn/ui components for consistent look and feel
- Improved positioning (higher on page)
- Clear messaging and error handling

### Race Selection Feature
**Status:** ✅ COMPLETE

Can now select existing races when adding to run lists:
- Mode toggle: Create New Race vs Select Existing Race
- Race dropdown with search
- Race preview cards with track, cars, lobby settings
- API handles both modes

---

## Database Audit Results (2026-01-13)

**✅ ALL TABLES USE CORRECT CAMELCASE**

No database migrations needed! All columns are already using correct camelCase naming:
- Race: ✅ `id, trackId, name, description, createdById, createdAt, updatedAt`
- RaceCar: ✅ `id, raceId, carId, buildId, createdAt, updatedAt`
- RunListEntry: ✅ `id, runListId, trackId, carId, buildId, raceId, order, notes, createdAt, updatedAt`
- RunList: ✅ `id, name, description, isPublic, createdById, createdAt, updatedAt, isActive, isLive`
- RunListEntryCar: ✅ `id, runListEntryId, carId, buildId, createdAt, updatedAt`
- Track: ✅ `id, name, slug, location, length, category, createdAt, updatedAt`
- Car: ✅ `id, name, slug, manufacturer, year, category, createdAt, updatedAt`
- User: ✅ `id, email, emailVerified, name, role, createdAt, updatedAt`

**How to Audit Database (DO THIS FIRST IN FUTURE):**

IMPORTANT: Use this method to verify database structure before making any changes:
```bash
npx tsx scripts/check-column-casing.ts
```

**Why this method:**
- ✅ Works without Docker
- ✅ Directly queries actual database structure
- ✅ Fast and reliable
- ✅ Shows actual column names returned by Supabase

**When to use it:**
- Before assuming database has casing issues
- When investigating column name errors
- Before writing migration scripts
- After making schema changes to verify

---

## Current Problem

**Code uses lowercase column names, but database is already camelCase**

**Recent Commit (cb22998c9):**
- Changed API routes to use **lowercase** column names: `carid`, `buildid`, `raceid`, `trackid`, `createdbyid`, `ispublic`
- Added transformations to convert responses to **camelCase** for frontend: `carId`, `buildId`, `raceId`, etc.

**Reality:** Database was already camelCase, so the lowercase workarounds are unnecessary

**Solution:** Remove lowercase column references and use camelCase throughout

---

## Next Steps

### Step 1: Fix API Routes (ME)
Update `/api/races` and `/api/races/[id]` to use camelCase column names:
- Remove lowercase queries (`.eq('id', race.trackid)` → `.eq('id', race.trackId)`)
- Remove transformation code
- Use camelCase throughout

### Step 2: Update Database Schema Documentation (ME)
Update `docs/DATABASE-SCHEMA.md` to reflect correct state

### Step 3: Test (ME)
Test that:
- Races listing page loads correctly
- Race detail pages load correctly
- Run list entries link to races correctly
- Navigation works end-to-end

---

## Expected Database State

**All tables should use camelCase consistently:**

### Core Tables
- `User`: userId, email, name, role, createdAt, updatedAt
- `Track`: trackId, name, slug, location, category, createdAt, updatedAt
- `Car`: carId, name, slug, manufacturer, year, category, createdAt, updatedAt
- `CarBuild`: buildId, carId, name, description, isPublic, createdAt, updatedAt
- `LapTime`: lapTimeId, userId, trackId, carId, buildId, timeMs, sessionType, createdAt, updatedAt

### Run List Tables
- `RunList`: runListId, name, isPublic, createdById, createdAt, updatedAt
- `RunListEntry`: entryId, runListId, raceId, trackId, order, notes, createdAt, updatedAt
- `RunListEntryCar`: entryCarId, entryId, carId, buildId, createdAt, updatedAt
- `RunSession`: sessionId, runListId, currentEntryOrder, createdAt, updatedAt
- `SessionAttendance`: attendanceId, sessionId, userId, joinedAt, leftAt

### Race Tables (PRIORITY)
- `Race`: raceId, trackId, name, description, createdById, isActive, createdAt, updatedAt
- `RaceCar`: raceCarId, raceId, carId, buildId, createdAt, updatedAt

---

## Current Code vs Database Mismatch

**Code is using (in `/api/races` routes):**
```typescript
// Database queries using lowercase
.eq('id', race.trackid)
.eq('raceid', race.id)
.carid, buildid, raceid, createdbyid, ispublic

// Then transforming to camelCase for frontend
carId: rc.carid
buildId: rc.buildid
```

**This is a workaround** - the proper solution is either:
1. Fix database to use camelCase (preferred), OR
2. Keep database lowercase and remove transformations

---

## Questions for You

1. **Did you run the previous column casing migration?** (fix-remaining-column-casing.sql)
2. **Are Race/RaceCar tables using camelCase or lowercase in the database?**
3. **Any other tables you suspect might have lowercase columns?**

---

## Next Action

**Run the audit script and paste the full output:**
```bash
scripts/audit-all-tables.sql
```

Once I have the audit results, I can generate the correct migration script to fix any remaining issues.
