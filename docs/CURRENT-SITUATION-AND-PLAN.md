# Current Situation & Next Steps

**Date:** 2026-01-13
**Status:** Auth System Issue Identified ⚠️ | Build Fixed ✅ | Database Audit Complete ✅ | All Tables camelCase ✅

---

## 🚨 Current Issue: Authentication System Broken

**Problem:** New users cannot set gamertag - "The result contains 0 rows" error

**Root Cause:** Two-schema setup with no synchronization
- `next_auth.users` - Managed by NextAuth adapter (2 users)
- `public.User` - Managed by application (1 user only)
- When NextAuth creates user → No corresponding `public.User` record created
- PATCH `/api/user/profile` fails because record doesn't exist

**Solution:** Database trigger to auto-sync schemas (see `docs/AUTH-FIX-OPTION2-PLAN.md`)

**Status:** ⏸️ Awaiting approval to implement fix

**Documentation:**
- `docs/AUTH-SYSTEM-STATE.md` - Full architecture analysis
- `docs/AUTH-FIX-OPTION2-PLAN.md` - Implementation plan
- `docs/SESSION-LOG.md` (2026-01-13 #5) - Investigation details

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
