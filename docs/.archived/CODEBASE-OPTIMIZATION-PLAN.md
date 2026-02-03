# Plan: Codebase Optimization and Cleanup

## Overview
Comprehensive cleanup and optimization of the codebase to remove unused code, fix inconsistencies, improve type safety, and consolidate duplicate patterns.

---

## Phase 1: Remove Unused Code (Quick Wins)

### 1.1 Remove Unused Components
**High Confidence - Safe to Delete:**

| File | Reason |
|------|--------|
| `src/components/lap-times/CarLapTimes.tsx` | No imports found anywhere (type definition exists but component unused) |
| `src/components/lap-times/TrackLapTimes.tsx` | No imports found anywhere (type definition exists but component unused) |
| `src/components/builds/TrackBuilds.tsx` | No imports found anywhere (has type definitions but component unused) |
| `src/components/ui/loading-skeletons.tsx` | No imports found anywhere |

**NOTE: `EmptyState.tsx` is actively used via `@/components/layout` barrel export - DO NOT DELETE**

### 1.2 Remove Unused API Routes
**Requires Verification:**

| File | Reason | Action |
|------|--------|--------|
| `src/app/api/admin/pending-users/route.ts` | No client calls found | Check if admin UI uses this |
| `src/app/api/admin/pending-users/[id]/approve/route.ts` | No client calls found | Check if admin UI uses this |
| `src/app/api/admin/pending-users/[id]/reject/route.ts` | No client calls found | Check if admin UI uses this |
| `src/app/api/cron/cleanup-tokens/route.ts` | No internal calls | Verify external cron usage |

---

## Phase 2: Fix Database Schema Inconsistencies (High Priority)

### 2.1 Fix Build Clone Route Field Names
**File:** `src/app/api/builds/[id]/clone/route.ts`

**Issue:** Uses `category` and `setting` fields that don't match schema (should be `categoryId`, `sectionId`)

**Changes:**
```typescript
// Line 182-185: Already partially fixed, verify complete fix
categoryId: upgrade.categoryId,  // Fixed
sectionId: setting.sectionId,    // Fixed
```

### 2.2 Fix Builds Route Type Mismatches
**File:** `src/app/api/builds/[id]/route.ts`

**Issue:** Uses legacy field names that don't match `DbCarBuildSetting` interface

**Changes Needed:**
- Replace `category` with `sectionId` throughout
- Replace `settingId` references to match actual schema

### 2.3 Fix Parts API Display Order
**File:** `src/app/api/parts/route.ts`

**Issue:** Accesses `category.displayOrder` but schema has `category.order`

**Changes:**
```typescript
// Line 186: Change displayOrder to order
section: category.order || category.name
```

### 2.4 Fix RaceMember Field Naming
**File:** `src/types/database.ts`

**Issue:** `DbRaceMember` uses snake_case (inconsistent with rest of schema)

**Changes:**
- Convert snake_case fields to camelCase
- Update all references in API routes

---

## Phase 3: Consolidate Duplicate Code

### Unify TuningSetting Interface
**Files Affected:**
- `src/components/builds/GradientSliderInput.tsx:64`
- `src/components/builds/SliderDualInput.tsx:85`
- `src/components/builds/BallastSliderInput.tsx:79`
- `src/components/builds/BuildTuningTab.tsx:109`

**Action:** Remove local `TuningSetting` interfaces and use `DbTuningSetting` from `src/types/database.ts`

---

## Phase 4: Improve Type Safety

### Remove `any` Types
**Status:** Already resolved - no `any` types remaining in auth.ts or other core files.

**Note:** TrackBuilds.tsx contains `any` types (lines 175, 213, 214) but this file is being deleted.

---

## Phase 5: Fix TypeScript Build Errors

### Current Build Errors (Blocking Production Builds)

**File:** `src/app/api/builds/[id]/route.ts:163`
```
Type error: Property 'sectionId' is missing in type
```

**Root Cause:** Database schema migration incomplete - code uses old field names

**Fix:** Update all references from legacy field names to current schema:
- `category` -> `sectionId`
- `categoryId` -> already correct in some places

---

## Execution Order

### Phase A - Critical (Blocks Build)
1. Fix TypeScript errors in `src/app/api/builds/[id]/route.ts`
2. Verify `npm run build` passes

### Phase B - Remove Unused Code
1. Delete unused components (5 files)
2. Delete unused API routes (3 files)
3. Remove legacy build format support

### Phase C - Fix Schema Inconsistencies
1. Fix Parts API displayOrder -> order
2. Fix RaceMember snake_case -> camelCase
3. Remove `any` types and add proper types

---

## Files to Modify

### Critical (Must Fix)
| File | Lines | Change |
|------|-------|--------|
| `src/app/api/builds/[id]/route.ts` | 163+ | Fix field name mismatches |
| `src/app/api/parts/route.ts` | 186 | Fix displayOrder -> order |
| `src/types/database.ts` | 184-193 | Fix RaceMember snake_case |

### Remove
| File | Action |
|------|--------|
| `src/components/lap-times/CarLapTimes.tsx` | Delete |
| `src/components/lap-times/TrackLapTimes.tsx` | Delete |
| `src/components/builds/TrackBuilds.tsx` | Delete |
| `src/components/ui/loading-skeletons.tsx` | Delete |
| `src/app/api/admin/pending-users/route.ts` | Delete |
| `src/app/api/admin/pending-users/[id]/approve/route.ts` | Delete |
| `src/app/api/admin/pending-users/[id]/reject/route.ts` | Delete |

**NOTE: Do NOT delete `EmptyState.tsx` - it is actively used** |

### Remove Legacy Code
| File | Change |
|------|--------|
| `src/app/api/builds/[id]/route.ts` | Remove "legacy columns" compatibility code |
| `src/app/api/builds/[id]/clone/route.ts` | Remove "NOT preserving FK" comments/legacy handling |

### Consolidate
| File | Change |
|------|--------|
| `src/components/builds/GradientSliderInput.tsx` | Remove local TuningSetting, use DbTuningSetting |
| `src/components/builds/SliderDualInput.tsx` | Remove local TuningSetting, use DbTuningSetting |
| `src/components/builds/BallastSliderInput.tsx` | Remove local TuningSetting, use DbTuningSetting |
| `src/components/builds/BuildTuningTab.tsx` | Remove local TuningSetting, use DbTuningSetting |

**Note:** `src/lib/auth.ts` no longer has `any` types - already resolved. |

---

## Verification Steps

1. **After Phase A:** Run `npm run build` - should pass
2. **After Phase B:** Run `npm run build` - still passing
3. **After each change:** Test affected pages in browser
4. **Final:** Run full test suite if available

---

## User Decisions (Confirmed)

1. **Admin pending-users endpoints:** REMOVE - Confirmed unused (admin UI uses generic `/api/admin/users/[id]` instead)
2. **TrackBuilds component:** REMOVE - Not needed
3. **Legacy format support:** REMOVE - Migration complete, no longer needed
4. **Execution scope:** Phase A+B+C (Fix build errors -> Remove unused -> Consolidate code)
5. **Performance optimizations:** SKIP - Current performance is acceptable
