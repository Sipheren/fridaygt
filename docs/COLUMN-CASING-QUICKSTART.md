# Database Column Casing Migration - Quick Start

## What's Been Done ✅

1. **Investigated the issue**
   - Found Race/RaceCar tables use lowercase columns
   - Confirmed all other tables use camelCase
   - RunSession/SessionAttendance verified as camelCase (good!)

2. **Created migration script**
   - `supabase/migrations/fix-race-column-casing.sql`
   - Renames 6 columns across 2 tables
   - Includes rollback instructions

3. **Created verification script**
   - `scripts/verify-column-casing.sql`
   - Run before/after migration
   - Shows column names and test queries

4. **Created documentation**
   - `COLUMN-CASING-ISSUE-EXPLANATION.md` - What and why
   - `COLUMN-CASING-MIGRATION.md` - Detailed migration plan
   - `MIGRATION-TEST-PLAN.md` - Testing procedures

5. **Committed work**
   - Git commit created with all races page work
   - Safe to proceed

## What To Do Next 🚀

### Step 1: Test in Development (5 minutes)

Connect to your Supabase project and run:

```bash
# Connect to your database
psql -h db.xxx.supabase.co -U postgres -d postgres

# Verify current state
\i scripts/verify-column-casing.sql

# Apply migration
\i migrations/fix-race-column-casing.sql

# Verify new state
\i scripts/verify-column-casing.sql
```

**Expected:** Column names change from `createdat` → `createdAt`, etc.

### Step 2: Test Application (5 minutes)

With migration applied, test:

```bash
# Start dev server
npm run dev

# Navigate to:
http://localhost:3000/races
```

**Expected:** Page loads correctly, no errors

### Step 3: Deploy to Production (5 minutes)

1. **Apply migration to production**
   - Via Supabase SQL Editor, OR
   - Via psql: `psql -h ... -f migrations/fix-race-column-casing.sql`

2. **Deploy code** (if needed)
   - Code already uses camelCase
   - Should work immediately after DB migration

3. **Verify**
   ```bash
   curl https://yourdomain.com/api/races
   ```

**Expected:** Valid JSON response with races data

## Important Notes ⚠️

- **Migration takes < 1 second**
- **No data loss**
- **Reversible** (rollback SQL in migration file)
- **No downtime** if DB migrates before code deploy
- **Only affects Race/RaceCar tables**
- **All other tables already correct**

## Files Created

1. `supabase/migrations/fix-race-column-casing.sql` - Run this on your database
2. `scripts/verify-column-casing.sql` - Verification script
3. `COLUMN-CASING-ISSUE-EXPLANATION.md` - Detailed explanation
4. `COLUMN-CASING-MIGRATION.md` - Full migration plan
5. `MIGRATION-TEST-PLAN.md` - Test procedures

## What Changes

**Before:**
```sql
SELECT createdat, updatedat FROM "Race"        -- ❌ Lowercase
SELECT carid, buildid FROM "RaceCar"            -- ❌ Lowercase
```

**After:**
```sql
SELECT createdAt, updatedAt FROM "Race"         -- ✅ CamelCase
SELECT carId, buildId FROM "RaceCar"            -- ✅ CamelCase
```

**Matches:**
```sql
SELECT createdAt, trackId FROM "RunListEntry"   -- ✅ Already camelCase
SELECT carId, buildId FROM "RunListEntryCar"    -- ✅ Already camelCase
```

## Need Help?

See these documents:
- **Quick questions:** `COLUMN-CASING-ISSUE-EXPLANATION.md`
- **Full details:** `COLUMN-CASING-MIGRATION.md`
- **Testing:** `MIGRATION-TEST-PLAN.md`

## Rollback (if needed)

```sql
ALTER TABLE "Race" RENAME COLUMN "createdAt" TO "createdat";
ALTER TABLE "Race" RENAME COLUMN "updatedAt" TO "updatedat";
ALTER TABLE "Race" RENAME COLUMN "createdById" TO "createdbyid";

ALTER TABLE "RaceCar" RENAME COLUMN "carId" TO "carid";
ALTER TABLE "RaceCar" RENAME COLUMN "buildId" TO "buildid";
ALTER TABLE "RaceCar" RENAME COLUMN "raceId" TO "raceid";
```

## Summary

- ✅ Issue identified
- ✅ Solution planned
- ✅ Migration script ready
- ✅ Documentation complete
- ✅ Safe to proceed

**Next action:** Test migration in development, then deploy to production.
