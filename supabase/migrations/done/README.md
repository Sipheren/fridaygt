# Gear Migration Guide

## Overview
Migrating from row-based gear storage in `CarBuildSetting` to column-based storage in `CarBuild`.

## Why?
- Current approach stores custom gears as rows with `settingId=NULL`
- This causes INNER JOIN issues when fetching builds
- New approach: Fixed columns for gears 1-20 + final drive
- Simpler queries, no JOIN problems, all gears work the same

## Migration Steps

### Step 1: Add Columns
**File:** `01_add_gear_columns.sql`
**Action:** Run in Supabase SQL Editor
**What it does:** Adds 21 columns to `CarBuild` table (finalDrive + gear1-20)
**Verify:** Check that columns appear in the table schema

### Step 2: Migrate Data
**File:** `02_migrate_gear_data.sql`
**Action:** Run in Supabase SQL Editor (AFTER step 1 completes)
**What it does:** Copies existing gear data from `CarBuildSetting` to new `CarBuild` columns
**Verify:** Run the SELECT query at the end - should show your builds with gear values

### Step 3: Verification
Before proceeding to step 3:
1. Check your Supra build in the database
2. Verify that gear1, gear2, etc. columns have values
3. Test the application to ensure gears display correctly
4. **DO NOT PROCEED until you confirm data migrated successfully**

### Step 4: Cleanup
**File:** `03_cleanup_gear_settings.sql`
**Action:** Run in Supabase SQL Editor (AFTER verification)
**What it does:** Removes old gear rows from `CarBuildSetting` table
**Note:** The DELETE is commented out by default - uncomment after verification

### Emergency Rollback
**File:** `04_rollback_drop_gear_columns.sql`
**Action:** Run only if migration fails and needs to be reverted
**Warning:** Will DELETE all migrated gear data from CarBuild

## Post-Migration Code Changes (Not in SQL files)

After successful migration, the following code changes are needed:

1. **Update `src/types/database.ts`**
   - Add gear fields to `DbCarBuild` type

2. **Update `src/app/api/builds/[id]/route.ts`**
   - Remove gear transformation logic
   - Gears now part of build object

3. **Update `src/app/builds/[id]/edit/page.tsx`**
   - Store gears as `{ gear1: "2.500", gear2: "2.000", ..., finalDrive: "3.500" }`
   - Remove custom: prefix logic

4. **Update `src/components/builds/BuildTuningTab.tsx`**
   - Show gears 1-6 by default
   - Allow adding gears 7-20
   - All use same ratio input pattern

5. **Update `src/lib/validation.ts`**
   - Add gear fields to UpdateBuildSchema
   - Remove gears from settings validation

## SQL Execution Order

```
1. 01_add_gear_columns.sql         ← Run first
2. 02_migrate_gear_data.sql        ← Run second
3. [Verify in application]         ← Verify before proceeding!
4. 03_cleanup_gear_settings.sql    ← Run last (uncomment DELETE)
```

## Safety Notes

- All migrations include SELECT queries to verify results
- Cleanup script has DELETE commented by default
- Rollback script available if needed
- CarBuildSetting still exists for non-gear settings
