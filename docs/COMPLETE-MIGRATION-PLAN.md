# Complete Race Entity Migration Plan

**Date:** 2026-01-13
**Status:** PLANNING
**Goal:** Fully migrate from "Combos" to "Races" system

---

## Problem Summary

The application currently has TWO conflicting systems:

### Current State (BROKEN)
1. **"Combos" (OLD)**: `/combos/[carSlug]/[trackSlug]` - Still exists and works
2. **"Races" (NEW)**: `/races/[id]` - Partially implemented, BROKEN due to incomplete database migration

### Evidence from Logs
```
column RaceCar_1.carId does not exist
hint: Perhaps you meant to reference the column "RaceCar_1.carid"

column RunListEntry.raceId does not exist
hint: Perhaps you meant to reference the column "RunListEntry.raceid"

column RunList_1.ispublic does not exist
hint: Perhaps you meant to reference the column "RunList_1.isPublic"

column RunListEntryCar_1.carid does not exist
hint: Perhaps you meant to reference the column "RunListEntryCar_1.carId"
```

**Conclusion**: Database column casing is INCONSISTENT across multiple tables. Some tables use camelCase, some use lowercase, creating query failures.

---

## Migration Strategy: Complete "Races" System

### Target Architecture

```
OLD: /combos/[carSlug]/[trackSlug]
      ↓ (redirect)
NEW: /races/[raceId]

Data Model:
- Race (track + optional name/description)
  - RaceCar (links cars to race, optional build)
    - Car (car details)
    - CarBuild (optional build for this race)
- LapTime (linked to race via track + car)
- RunListEntry (linked to race via raceId)
```

### URL Structure
- **Race Detail**: `/races/[id]` (UUID)
- **Race Listing**: `/races` (all races)
- **Combos**: Redirect to `/races/[id]` (backward compatibility)

---

## Phase 1: Database Audit and Fix

### Step 1.1: Audit ALL Table Columns
**Script**: `scripts/audit-all-column-casing.sql`

**Action Required**: YOU run this in Supabase SQL Editor

**Output Needed**: Copy the full results and paste here so I can generate the correct migration script.

### Step 1.2: Generate Migration Script
**Depends on**: Audit results from Step 1.1

**Will Create**: `supabase/migrations/fix-all-column-casing.sql`

**Will Include**:
- All `ALTER TABLE RENAME COLUMN` statements for EVERY table with issues
- Foreign key constraint recreation if needed
- Index recreation if needed

### Step 1.3: Run Migration
**Action Required**: YOU run the generated migration in Supabase SQL Editor

**Verification**: Re-run audit script to confirm all columns are now camelCase

---

## Phase 2: API Code Updates

### Step 2.1: Update All API Routes
**Files to Update**:
1. `/src/app/api/races/[id]/route.ts` - Already partially done ✅
2. `/src/app/api/races/route.ts` - Uses workaround, needs fixing
3. `/src/app/api/run-lists/[id]/entries/route.ts` - Creates races
4. Any other API routes referencing Race/RaceCar/RunListEntry

**Changes**:
- Ensure all column references use camelCase
- Update Supabase queries to use correct column names
- Test all endpoints

### Step 2.2: Update Combo API (Legacy)
**Files**:
1. `/src/app/api/combos/[carSlug]/[trackSlug]/route.ts`

**Changes**:
- Make it a thin wrapper that queries Race entity
- Return same data structure for backward compatibility
- Add redirect header pointing to `/races/[id]`

---

## Phase 3: Frontend Updates

### Step 3.1: Update Race Detail Page
**File**: `/src/app/races/[id]/page.tsx`

**Changes**:
- Already updated TypeScript interface ✅
- Ensure all data access uses camelCase
- Add redirect from old combo URLs

### Step 3.2: Update Races Listing Page
**File**: `/src/app/races/page.tsx`

**Current Status**: Works but uses workaround API

**Changes**:
- Switch to proper Race/RaceCar queries after Phase 1
- Display race metadata (name, description)
- Show all cars in race

### Step 3.3: Update Combo Pages (Legacy)
**File**: `/src/app/combos/[carSlug]/[trackSlug]/page.tsx`

**Changes**:
- Add client-side redirect to `/races/[id]`
- Find race ID by querying Race entity for track+car combination
- Show "Moving to new location..." message

### Step 3.4: Update Run List Detail Page
**File**: `/src/app/run-lists/[id]/page.tsx`

**Current**: Line 709 links to `/races/${entry.raceid}`

**Changes**:
- Already correct ✅
- Ensure raceid is populated correctly

---

## Phase 4: Data Migration

### Step 4.1: Create Race Entities from Existing Data
**Script**: `supabase/migrations/create-races-from-combos.sql`

**Purpose**:
- For each unique (trackId, carId, buildId) combination in LapTime
- Create a Race entity if it doesn't exist
- Link to appropriate RaceCar entries

**Action Required**: YOU run this script

### Step 4.2: Link RunListEntries to Races
**Script**: `supabase/migrations/link-runlist-entries-to-races.sql`

**Purpose**:
- Update all RunListEntry records to set raceId
- Match by trackId + car combinations
- Handle entries with multiple cars

**Action Required**: YOU run this script

### Step 4.3: Verify Data Integrity
**Script**: `scripts/verify-race-migration.sql`

**Checks**:
- All RunListEntries have raceId set
- All Races have at least one RaceCar
- No orphaned RaceCar entries
- Lap times accessible via Race entity

**Action Required**: YOU run this script

---

## Phase 5: URL Redirects

### Step 5.1: Add Combo → Race Redirects
**File**: `/src/app/combos/[carSlug]/[trackSlug]/page.tsx`

**Implementation**:
```typescript
// On mount, query for race by track+car
// Redirect to /races/[raceId]
```

### Step 5.2: Update Navigation Links
**Files**:
- `/src/components/header.tsx` - Already has "Races" link ✅
- Any hardcoded `/combos/...` links in codebase

**Changes**:
- Update all links to use `/races/[id]`
- Keep combo links as redirects for backward compatibility

---

## Phase 6: Cleanup

### Step 6.1: Remove Workaround Code
**File**: `/src/app/api/races/route.ts`

**Remove**:
- Comment: "// Groups by track + car combination to create pseudo-races"
- Workaround logic that queries RunListEntry directly

**Replace with**:
- Direct query: `SELECT * FROM Race` with joins to RaceCar

### Step 6.2: Update Documentation
**Files**:
- `docs/DATABASE-SCHEMA.md` - Already updated ✅
- `docs/IMPLEMENTATION-PLAN.md` - Already updated ✅
- `docs/SESSION-LOG.md` - Add this session

**Changes**:
- Mark Race entity as COMPLETE
- Document migration from Combos to Races
- Update all references

### Step 6.3: Remove Deprecated Routes (Optional)
**Can Defer**: Keep combo routes as redirects for SEO/backward compatibility

**If Removing**:
- Delete `/src/app/combos/` directory
- Delete `/src/app/api/combos/` directory
- Add 404 handlers for old URLs

---

## Execution Order

1. ✅ **YOU**: Run `scripts/audit-all-column-casing.sql`
2. ⏳ **ME**: Generate migration script from audit results
3. ⏳ **YOU**: Run column casing migration
4. ⏳ **ME**: Update all API routes
5. ⏳ **ME**: Update all frontend pages
6. ⏳ **ME**: Create data migration scripts
7. ⏳ **YOU**: Run data migration scripts
8. ⏳ **ME**: Add redirects and cleanup
9. ⏳ **YOU**: Test everything
10. ⏳ **ME**: Update documentation and commit

---

## Current Status

### Completed ✅
- Races listing page created
- Race detail page created (but broken due to column casing)
- Navigation links added
- Race/RaceCar tables created
- Initial column casing migration script written
- Some API routes partially updated

### Broken ❌
- Column casing inconsistent across multiple tables
- Database migration incomplete or not run
- `/api/races` endpoint uses workaround instead of proper queries
- Combo pages still exist but Races don't fully work
- Race detail page fails to load

### Next Step
**YOU need to run the audit script** so I can see the ACTUAL current state of the database and generate the correct migration script.

---

## Questions?

1. **Should I preserve all existing combo URLs?**
   - Yes, use redirects for backward compatibility

2. **What about lap times linked to combos?**
   - They're linked by trackId+carId, so they'll automatically work with Race entities

3. **Will this break existing run lists?**
   - No, we'll migrate RunListEntry.raceId to point to new Race entities

4. **How long will this take?**
   - Depends on how many tables have casing issues
   - Probably 1-2 hours of focused work

---

**READY TO START? Run the audit script and paste the results!**
