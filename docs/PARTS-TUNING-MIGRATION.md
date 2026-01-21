# Migrate Parts & Tuning Data to Database

## Executive Summary

Migrate from static TypeScript data files (`parts-shop.ts`, `tuning-settings.ts`) to a dynamic database-driven system where parts and tuning settings are stored in database tables, enabling real-time updates, validation, and API-driven access.

**Date**: 2026-01-21
**Status**: ✅ Complete
**Duration**: 1 day (all 4 phases completed)

---

## Current State Analysis

### Parts Shop Data

**Data Location**: `src/data/builds/parts-shop.ts` (static, generated from CSV)
- **Structure**: 5 categories, 72 parts total
- **Format**: `PartShopCategory[]` with name + parts array
- **Generated From**: `gt7data/gt7_parts_shop.csv`
- **Generator**: `scripts/generate-parts-shop.ts`
- **Used By**: `BuildUpgradesTab` component

**Storage in Builds**:
- Table: `CarBuildUpgrade` (buildId, category, part)
- **No separate Parts table**
- **No validation** against master parts list
- Checkbox selection (no values)

### Tuning Settings Data

**Data Location**: `src/data/builds/tuning-settings.ts` (static, manually maintained)
- **Structure**: 16 sections, 62 settings total
- **Format**: `TuningSection[]` with name + settings array
- **Source**: `gt7data/gt7_tuning_settings.csv`
- **No Generator**: Manually maintained
- **Used By**: `BuildTuningTab` component

**Storage in Builds**:
- Table: `CarBuildSetting` (buildId, category, setting, value)
- **No separate Settings table**
- **No validation** against master settings list
- User-entered values stored as strings

---

## Problems with Current Approach

1. **No Validation**: Can save invalid parts/settings to builds
2. **No Foreign Keys**: No referential integrity
3. **Static Data**: Requires rebuild/redeploy to add new parts/settings
4. **No API**: Components must import static files
5. **No Admin Interface**: Can't manage parts/settings via UI
6. **No Versioning**: Can't track changes to parts catalog
7. **No Metadata**: Can't add descriptions, images, or other info

---

## Proposed Database Schema

### New Tables

**PartCategory** (Parts Shop Categories)
```sql
CREATE TABLE "PartCategory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(50) NOT NULL UNIQUE,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

**Part** (Individual Parts)
```sql
CREATE TABLE "Part" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId" UUID NOT NULL REFERENCES "PartCategory"("id"),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("categoryId", "name")
);

CREATE INDEX "Part_categoryId_idx" ON "Part"("categoryId");
CREATE INDEX "Part_name_idx" ON "Part"("name");
```

**TuningSection** (Tuning Setting Sections)
```sql
CREATE TABLE "TuningSection" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(50) NOT NULL UNIQUE,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

**TuningSetting** (Individual Tuning Settings)
```sql
CREATE TABLE "TuningSetting" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sectionId" UUID NOT NULL REFERENCES "TuningSection"("id"),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "defaultValue" VARCHAR(100),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("sectionId", "name")
);

CREATE INDEX "TuningSetting_sectionId_idx" ON "TuningSetting"("sectionId");
CREATE INDEX "TuningSetting_name_idx" ON "TuningSetting"("name");
```

### Update Existing Tables

**CarBuildUpgrade** - Add Foreign Key
```sql
-- Add partId column (nullable for migration, then NOT NULL)
ALTER TABLE "CarBuildUpgrade"
  ADD COLUMN "partId" UUID REFERENCES "Part"("id");

-- Migrate existing data: match by category + name
UPDATE "CarBuildUpgrade" cbu
SET "partId" = p.id
FROM "Part" p
JOIN "PartCategory" pc ON p."categoryId" = pc.id
WHERE cbu.category = pc.name
  AND cbu.part = p.name;

-- Make NOT NULL after migration
ALTER TABLE "CarBuildUpgrade"
  ALTER COLUMN "partId" SET NOT NULL,
  ADD CONSTRAINT "CarBuildUpgrade_partId_fk"
    FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT;
```

**CarBuildSetting** - Add Foreign Key
```sql
-- Add settingId column (nullable for migration, then NOT NULL)
ALTER TABLE "CarBuildSetting"
  ADD COLUMN "settingId" UUID REFERENCES "TuningSetting"("id");

-- Migrate existing data: match by category + name
UPDATE "CarBuildSetting" cbs
SET "settingId" = ts.id
FROM "TuningSetting" ts
JOIN "TuningSection" tsec ON ts."sectionId" = tsec.id
WHERE cbs.category = tsec.name
  AND cbs.setting = ts.name;

-- Make NOT NULL after migration
ALTER TABLE "CarBuildSetting"
  ALTER COLUMN "settingId" SET NOT NULL,
  ADD CONSTRAINT "CarBuildSetting_settingId_fk"
    FOREIGN KEY ("settingId") REFERENCES "TuningSetting"("id") ON DELETE RESTRICT;
```

---

## Implementation Plan

### Phase 1: Database Migration (Day 1)

**Migration File**: `supabase/migrations/20260121_add_parts_and_settings_tables.sql`

**Steps**:
1. Create PartCategory table
2. Create Part table
3. Create TuningSection table
4. Create TuningSetting table
5. Add partId to CarBuildUpgrade (nullable)
6. Add settingId to CarBuildSetting (nullable)
7. Create indexes for performance
8. Enable RLS (Row Level Security)

**Migration Data Script**: `scripts/migrate-parts-to-db.ts`

Import data from CSV files to database:
1. Import PartCategories and Parts from `gt7_parts_shop.csv`
2. Import TuningSections and TuningSettings from `gt7_tuning_settings.csv`
3. Migrate existing CarBuildUpgrade records to use partId
4. Migrate existing CarBuildSetting records to use settingId

### Phase 2: API Endpoints (Day 2)

**Parts API**
- `GET /api/parts` - List all parts with categories
  - Query params: `categoryId?`, `active?`, `includeInactive?`
  - Response: `{ parts: Part[], categories: PartCategory[] }`

- `GET /api/parts/categories` - List all part categories
  - Response: `{ categories: PartCategory[] }`

**Tuning Settings API**
- `GET /api/tuning-settings` - List all settings with sections
  - Query params: `sectionId?`, `active?`, `includeInactive?`
  - Response: `{ settings: TuningSetting[], sections: TuningSection[] }`

- `GET /api/tuning-settings/sections` - List all tuning sections
  - Response: `{ sections: TuningSection[] }`

### Phase 3: Update Components (Day 2-3)

**BuildUpgradesTab Component** (`src/components/builds/BuildUpgradesTab.tsx`)

Current:
```typescript
import { PARTS_SHOP_DATA } from '@/data/builds/parts-shop'
```

After:
```typescript
const [categories, setCategories] = useState<PartCategory[]>([])
const [parts, setParts] = useState<Part[]>([])

useEffect(() => {
  Promise.all([
    fetch('/api/parts/categories').then(r => r.json()),
    fetch('/api/parts').then(r => r.json())
  ]).then(([catsData, partsData]) => {
    setCategories(catsData.categories)
    setParts(partsData.parts)
  })
}, [])

// Group parts by category for display
const partsByCategory = categories.map(cat => ({
  ...cat,
  parts: parts.filter(p => p.categoryId === cat.id)
}))
```

**BuildTuningTab Component** (`src/components/builds/BuildTuningTab.tsx`)

Current:
```typescript
import { TUNING_SECTIONS } from '@/data/builds/tuning-settings'
```

After:
```typescript
const [sections, setSections] = useState<TuningSection[]>([])
const [settings, setSettings] = useState<TuningSetting[]>([])

useEffect(() => {
  Promise.all([
    fetch('/api/tuning-settings/sections').then(r => r.json()),
    fetch('/api/tuning-settings').then(r => r.json())
  ]).then(([secsData, settingsData]) => {
    setSections(secsData.sections)
    setSettings(settingsData.settings)
  })
}, [])

// Group settings by section
const settingsBySection = sections.map(sec => ({
  ...sec,
  settings: settings.filter(s => s.sectionId === sec.id)
}))
```

### Phase 4: Update Build API (Day 3)

**File**: `src/app/api/builds/[id]/route.ts`

**Changes**:
- Use JOIN to fetch Part and TuningSetting details
- Validate that partId and settingId exist
- Return full part/setting details in response

```typescript
// Updated query
const { data: build } = await supabase
  .from('CarBuild')
  .select(`
    *,
    upgrades:CarBuildUpgrade(
      *,
      part:Part(*),
      category:PartCategory(*)
    ),
    settings:CarBuildSetting(
      *,
      setting:TuningSetting(*),
      section:TuningSection(*)
    )
  `)
  .eq('id', id)
  .single()
```

**Validation**:
```typescript
// Validate partId exists
const { data: part } = await supabase
  .from('Part')
  .select('id')
  .eq('id', upgrade.partId)
  .single()

if (!part) {
  return NextResponse.json(
    { error: `Invalid part: ${upgrade.partId}` },
    { status: 400 }
  )
}
```

---

## Critical Files

### Database Migrations
- `supabase/migrations/20260121_add_parts_and_settings_tables.sql` - NEW

### Migration Scripts
- `scripts/migrate-parts-to-db.ts` - NEW

### API Routes (NEW)
- `src/app/api/parts/route.ts`
- `src/app/api/parts/categories/route.ts`
- `src/app/api/tuning-settings/route.ts`
- `src/app/api/tuning-settings/sections/route.ts`

### API Routes (UPDATE)
- `src/app/api/builds/[id]/route.ts` - Add validation

### Components (UPDATE)
- `src/components/builds/BuildUpgradesTab.tsx`
- `src/components/builds/BuildTuningTab.tsx`

---

## Benefits of Migration

1. **Validation**: Can't save invalid parts/settings (foreign key constraints)
2. **Dynamic Updates**: Add parts via database/API without redeploy
3. **Referential Integrity**: Foreign keys ensure data consistency
4. **Admin Interface**: Can manage via UI (future enhancement)
5. **Metadata**: Can add descriptions, images to parts/settings
6. **API Access**: Can use in mobile apps, external tools
7. **Versioning**: Can track changes over time
8. **Performance**: Can cache at database level

---

## Success Metrics

- All parts/settings in database
- Foreign key constraints working
- API response time <100ms
- No data loss during migration
- All existing builds still work
- Builds work exactly as before for users
- Can add new parts without deployment

---

## Risks & Mitigations

**Risk**: Migration breaks existing builds
**Mitigation**: Thorough testing on staging, keep static files as backup

**Risk**: Performance degradation (API calls vs static imports)
**Mitigation**: Implement caching, use React Query, database indexes

**Risk**: Complex migration with foreign keys
**Mitigation**: Use nullable columns first, migrate data, then make NOT NULL

**Risk**: Downtime during migration
**Mitigation**: Run migration during low traffic, test thoroughly first

---

## Rollback Plan

If migration fails:

**Database Rollback**:
```sql
-- Drop new columns
ALTER TABLE "CarBuildUpgrade" DROP COLUMN "partId";
ALTER TABLE "CarBuildSetting" DROP COLUMN "settingId";

-- Drop new tables
DROP TABLE IF EXISTS "Part";
DROP TABLE IF EXISTS "PartCategory";
DROP TABLE IF EXISTS "TuningSetting";
DROP TABLE IF EXISTS "TuningSection";
```

**Code Rollback**:
- Revert component changes (use static imports again)
- Remove API endpoints
- Keep CSV files and generators as fallback

---

## Testing Strategy

### Database Testing
1. Import parts CSV → verify all parts in database
2. Import tuning CSV → verify all settings in database
3. Migrate existing builds → verify partId/settingId populated
4. Test foreign key constraints (try to insert invalid partId)
5. Test cascade behavior (deactivate part → what happens to builds?)

### API Testing
1. GET /api/parts → returns all parts with categories
2. GET /api/parts?categoryId=X → filtered parts
3. GET /api/tuning-settings → returns all settings
4. GET /api/tuning-settings?sectionId=Y → filtered settings

### Component Testing
1. BuildUpgradesTab loads data from API
2. BuildTuningTab loads data from API
3. Create build → parts saved with partId
4. Edit build → parts updated correctly
5. Display build → parts shown from database

### Integration Testing
1. Create new build → select parts → save → verify partId stored
2. Edit build → change parts → save → verify updates
3. Deactivate part → verify not shown in UI
4. Add new part via database → verify appears in UI
