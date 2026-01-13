# Column Audit Results - 2026-01-13

## Summary

**Good News**: Most columns are already camelCase! The previous partial migration DID work.

**Bad News**: 4 columns across 2 tables still need fixing.

## Columns That Need Fixing

### 1. Race Table (1 column)
| Current | Should Be | Status |
|---------|-----------|--------|
| `trackid` | `trackId` | ❌ LOWERCASE |

### 2. RaceCar Table (2 columns)
| Current | Should Be | Status |
|---------|-----------|--------|
| `createdat` | `createdAt` | ❌ LOWERCASE |
| `updatedat` | `updatedAt` | ❌ LOWERCASE |

### 3. RunListEntry Table (1 column)
| Current | Should Be | Status |
|---------|-----------|--------|
| `raceid` | `raceId` | ❌ LOWERCASE |

## What's Already Correct ✅

- `Race.id`, `Race.name`, `Race.description`, `Race.createdById`, `Race.createdAt`, `Race.updatedAt`
- `RaceCar.id`, `RaceCar.raceId`, `RaceCar.carId`, `RaceCar.buildId`
- `RunListEntry.runListId`, `RunListEntry.trackId`, `RunListEntry.carId`, `RunListEntry.buildId`
- All timestamp columns in other tables (`createdAt`, `updatedAt`)
- All boolean flags (`isPublic`, `isActive`, `isLive`)

## Single-word lowercase columns (these are OK)

These are single words in lowercase, which is standard and correct:
- `id`, `name`, `slug`, `notes`, `year`, `weight`, `pp`
- `manufacturer`, `category`, `country`
- `location`, `length`, `corners`, `layout`
- `email`, `image`, `role`, `gamertag`
- `description`, `order`

These DON'T need to change.

## Migration Needed

Only 4 RENAME operations across 3 tables:

```sql
-- Fix Race table
ALTER TABLE "Race" RENAME COLUMN "trackid" TO "trackId";

-- Fix RaceCar table
ALTER TABLE "RaceCar" RENAME COLUMN "createdat" TO "createdAt";
ALTER TABLE "RaceCar" RENAME COLUMN "updatedat" TO "updatedAt";

-- Fix RunListEntry table
ALTER TABLE "RunListEntry" RENAME COLUMN "raceid" TO "raceId";
```

This is much simpler than expected! The previous migration did most of the work, but missed these 4 columns.
