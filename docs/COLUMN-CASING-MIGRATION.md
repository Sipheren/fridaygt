# Database Column Casing Migration Plan

**Date:** 2026-01-13
**Status:** Planning

## Problem Statement

The FridayGT database has inconsistent column naming conventions:
- **Legacy tables** use camelCase: `createdAt`, `trackId`, `carId`, `isPublic`
- **New Race tables** use lowercase: `createdat`, `carid`, `buildid`

This inconsistency causes:
- Supabase query errors when joining tables
- Confusing error messages (column doesn't exist hints)
- Code maintenance issues
- Developer confusion

## Root Cause

The Race and RaceCar tables were likely created using:
1. Raw SQL scripts without quoted identifiers
2. A migration tool that defaulted to lowercase
3. Manual table creation without following existing conventions

PostgreSQL's behavior:
- Unquoted identifiers → lowercase (`createdat`)
- Quoted identifiers → case preserved (`"createdAt"` stays camelCase)

## Migration Strategy

### Option A: Rename to CamelCase (RECOMMENDED)

**Why:** Matches existing tables, documented in DATABASE-SCHEMA.md, more readable

#### Tables to Update

**Race table:**
```sql
ALTER TABLE "Race" RENAME COLUMN "createdat" TO "createdAt";
ALTER TABLE "Race" RENAME COLUMN "updatedat" TO "updatedAt";
ALTER TABLE "Race" RENAME COLUMN "createdbyid" TO "createdById";
```

**RaceCar table:**
```sql
ALTER TABLE "RaceCar" RENAME COLUMN "carid" TO "carId";
ALTER TABLE "RaceCar" RENAME COLUMN "buildid" TO "buildId";
ALTER TABLE "RaceCar" RENAME COLUMN "raceid" TO "raceId";
```

#### Additional Tables to Check

Verify these tables for consistency:
```sql
-- Check all timestamp columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('RunSession', 'SessionAttendance', 'RunListEdit', 'LobbySettings')
  AND (column_name LIKE '%at' OR column_name LIKE '%Id')
ORDER BY table_name, column_name;
```

### Option B: Rename All to Lowercase (NOT RECOMMENDED)

**Why not:**
- Requires updating ALL existing tables (20+ tables)
- Much larger risk surface
- camelCase is already documented in DATABASE-SCHEMA.md
- Less readable

## Migration Plan

### Phase 1: Preparation (DEVELOPMENT)

1. **Backup database**
   ```sql
   -- Export full schema and data
   pg_dump -U postgres -d fridaygt > backup_$(date +%Y%m%d).sql
   ```

2. **Verify current state**
   ```sql
   -- Check all Race table columns
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'Race'
   ORDER BY ordinal_position;

   -- Check all RaceCar table columns
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'RaceCar'
   ORDER BY ordinal_position;
   ```

3. **Check for dependencies**
   ```sql
   -- Foreign keys referencing these columns
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND (tc.table_name IN ('Race', 'RaceCar')
          OR ccu.table_name IN ('Race', 'RaceCar'));
   ```

4. **Check RLS policies**
   ```sql
   -- Policies that might reference these columns
   SELECT schemaname, tablename, policyname, cmd, qual
   FROM pg_policies
   WHERE tablename IN ('Race', 'RaceCar');
   ```

### Phase 2: Create Migration Script

Create `supabase/migrations/2026011300001_fix_race_column_casing.sql`:

```sql
-- Fix Race table column casing
ALTER TABLE "Race" RENAME COLUMN "createdat" TO "createdAt";
ALTER TABLE "Race" RENAME COLUMN "updatedat" TO "updatedAt";
ALTER TABLE "Race" RENAME COLUMN "createdbyid" TO "createdById";

-- Fix RaceCar table column casing
ALTER TABLE "RaceCar" RENAME COLUMN "carid" TO "carId";
ALTER TABLE "RaceCar" RENAME COLUMN "buildid" TO "buildId";
ALTER TABLE "RaceCar" RENAME COLUMN "raceid" TO "raceId";

-- Add comments for documentation
COMMENT ON COLUMN "Race"."createdAt" IS 'Timestamp when race was created';
COMMENT ON COLUMN "Race"."updatedAt" IS 'Timestamp when race was last updated';
COMMENT ON COLUMN "Race"."createdById" IS 'ID of user who created the race';
COMMENT ON COLUMN "RaceCar"."carId" IS 'ID of the car';
COMMENT ON COLUMN "RaceCar"."buildId" IS 'ID of the car build (optional)';
COMMENT ON COLUMN "RaceCar"."raceId" IS 'ID of the race';
```

### Phase 3: Test Migration (STAGING)

1. **Apply migration to staging database**
2. **Run test suite**
3. **Manual testing:**
   - Create a race via UI
   - Add race to run list
   - View races page
   - Delete race from run list

4. **Verify no broken queries:**
   ```sql
   -- Test queries from the API
   SELECT * FROM "Race"
   SELECT * FROM "RaceCar"
   SELECT
     "Race".*,
     "Track".*,
     "RaceCar".*
   FROM "Race"
   LEFT JOIN "Track" ON "Race"."trackId" = "Track"."id"
   LEFT JOIN "RaceCar" ON "Race"."id" = "RaceCar"."raceId";
   ```

### Phase 4: Update Application Code

Before deploying to production, update code to use camelCase consistently:

**Files to update:**
1. `/src/app/api/races/route.ts` - Already updated to handle camelCase
2. Any other files referencing Race/RaceCar tables

**No changes needed for:**
- RunListEntry queries (already camelCase)
- RunList queries (already camelCase)
- Track/Car/LapTime queries (already camelCase)

### Phase 5: Deploy to Production

**Deployment Order (CRITICAL):**

1. ✅ **First:** Apply database migration
   - Supabase migrations run automatically on deploy
   - Old columns → new columns

2. ✅ **Second:** Deploy updated application code
   - Code using camelCase will now work
   - Users see no interruption

**Rollback Plan:**
```sql
-- If needed, rollback migration
ALTER TABLE "Race" RENAME COLUMN "createdAt" TO "createdat";
ALTER TABLE "Race" RENAME COLUMN "updatedAt" TO "updatedat";
ALTER TABLE "Race" RENAME COLUMN "createdById" TO "createdbyid";

ALTER TABLE "RaceCar" RENAME COLUMN "carId" TO "carid";
ALTER TABLE "RaceCar" RENAME COLUMN "buildId" TO "buildid";
ALTER TABLE "RaceCar" RENAME COLUMN "raceId" TO "raceid";
```

## Potential Issues & Mitigations

### Issue 1: Foreign Key Constraints
**Risk:** Medium
**Impact:** Foreign keys might reference specific column names

**Mitigation:**
- `ALTER TABLE RENAME COLUMN` automatically updates foreign key references
- PostgreSQL handles this internally
- Verified in Phase 1, Step 3

### Issue 2: RLS Policies
**Risk:** Low
**Impact:** Policies might reference column names directly

**Mitigation:**
- Check all policies in Phase 1, Step 4
- Update if needed (unlikely, policies usually use `*` or table aliases)

### Issue 3: Application Code References
**Risk:** Low
**Impact:** Code using lowercase column names will break

**Mitigation:**
- We've already updated the code to use camelCase
- Current code is already compatible with camelCase
- No additional changes needed

### Issue 4: Third-party Integrations
**Risk:** Very Low
**Impact:** External services querying the database directly

**Mitigation:**
- No known integrations query Race/RaceCar tables directly
- All access goes through API
- API is being updated

### Issue 5: Downtime
**Risk:** Very Low
**Impact:** Users might see errors during migration

**Mitigation:**
- Column rename is instantaneous in PostgreSQL
- Lock duration: milliseconds per column
- Total time: < 1 second
- Deploy during low-traffic period (e.g., 2 AM UTC)

## Verification Checklist

- [ ] Database backup completed
- [ ] Current column names verified
- [ ] Foreign keys checked
- [ ] RLS policies checked
- [ ] Migration script created
- [ ] Tested in development
- [ ] Tested in staging
- [ ] Application code updated
- [ ] Deployment plan reviewed
- [ ] Rollback plan documented
- [ ] Team notified of deployment

## Post-Migration

1. **Update DATABASE-SCHEMA.md** if needed (should already be correct)
2. **Update any API documentation**
3. **Add migration to migration log**
4. **Monitor production for errors**
5. **Remove old code workarounds** if any

## Estimated Timeline

- Preparation: 1 hour
- Testing: 2 hours
- Code review: 1 hour
- Deployment: 15 minutes
- Total: ~4 hours

## Summary

This migration will:
✅ Fix inconsistent column naming
✅ Prevent future Supabase query errors
✅ Improve code maintainability
✅ Align database with documented schema
✅ Require < 1 second of downtime
✅ Have minimal risk with clear rollback plan

**Recommendation: Proceed with migration**
