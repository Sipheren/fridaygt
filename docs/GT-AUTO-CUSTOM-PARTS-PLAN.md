# GT Auto & Custom Parts Implementation Plan

**Date Created:** 2026-01-29
**Date Completed:** 2026-01-30
**Status:** ✅ COMPLETED

**Implementation Summary:** All tasks completed successfully. See `docs/SESSION-LOG.md` Session #40 for full details.

---

## Overview

Adding two new part categories to the builds parts area:

1. **GT Auto** - Wide body configuration
2. **Custom Parts** - Custom body components with conditional wing options

---

## New Sections

### GT Auto Section (displayOrder: 6)

| Setting | Input Type | Options |
|---------|------------|---------|
| Wide Body Installed | Dropdown | Yes, No |

**Default:** No

---

### Custom Parts Section (displayOrder: 7)

| Setting | Input Type | Options |
|---------|------------|---------|
| Front | Dropdown | Standard, Type A, Type B |
| Side | Dropdown | Standard, Type A, Type B |
| Rear | Dropdown | Standard, Type A, Type B |
| Wing | Dropdown | Standard, None, Type A, Type B, Custom |

**Defaults:** All default to "Standard"

#### Conditional: Wing Custom Options

When Wing = "Custom", display additional settings:

| Setting | Input Type | Options/Range |
|---------|------------|---------------|
| Wing Height | Dropdown | Low, Medium, High |
| Wing Endplate | Number Input | 1-20 |

---

## Database Changes

### New Part Categories

```sql
-- GT Auto Category
INSERT INTO PartCategory (id, name, displayOrder, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  'GT Auto',
  6,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Custom Parts Category
INSERT INTO PartCategory (id, name, displayOrder, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  'Custom Parts',
  7,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

### New Parts - GT Auto

```sql
-- Wide Body Installed
INSERT INTO Part (id, categoryId, name, description, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  -- (GT Auto category ID - retrieve after insert above),
  'Wide Body Installed',
  'Wide body installation status',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

### New Parts - Custom Parts (Base)

```sql
-- Front
INSERT INTO Part (id, categoryId, name, description, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  -- (Custom Parts category ID),
  'Front',
  'Front custom part',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Side
INSERT INTO Part (id, categoryId, name, description, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  -- (Custom Parts category ID),
  'Side',
  'Side custom part',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Rear
INSERT INTO Part (id, categoryId, name, description, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  -- (Custom Parts category ID),
  'Rear',
  'Rear custom part',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Wing
INSERT INTO Part (id, categoryId, name, description, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  -- (Custom Parts category ID),
  'Wing',
  'Wing custom part',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

### New Parts - Custom Parts (Conditional Wing Options)

```sql
-- Wing Height (displayed when Wing = "Custom")
INSERT INTO Part (id, categoryId, name, description, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  -- (Custom Parts category ID),
  'Wing Height',
  'Wing height setting',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Wing Endplate (displayed when Wing = "Custom")
INSERT INTO Part (id, categoryId, name, description, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  -- (Custom Parts category ID),
  'Wing Endplate',
  'Wing endplate setting (1-20)',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

---

## Display Order

Final parts category order:

1. Sports (displayOrder: 1)
2. Club Sports (displayOrder: 2)
3. Semi-Racing (displayOrder: 3)
4. Racing (displayOrder: 4)
5. Extreme (displayOrder: 5)
6. **GT Auto** (displayOrder: 6) ⬅️ NEW
7. **Custom Parts** (displayOrder: 7) ⬅️ NEW

---

## UI/UX Requirements

### Input Components

| Setting | Component | Props/Validation |
|---------|-----------|------------------|
| Wide Body Installed | Select/ComboBox | Options: ["Yes", "No"] |
| Front | Select/ComboBox | Options: ["Standard", "Type A", "Type B"] |
| Side | Select/ComboBox | Options: ["Standard", "Type A", "Type B"] |
| Rear | Select/ComboBox | Options: ["Standard", "Type A", "Type B"] |
| Wing | Select/ComboBox | Options: ["Standard", "None", "Type A", "Type B", "Custom"] |
| Wing Height | Select/ComboBox (conditional) | Options: ["Low", "Medium", "High"] |
| Wing Endplate | Number Input (conditional) | min: 1, max: 20 |

### Conditional Display Logic

```
IF Wing value == "Custom":
  - Show Wing Height dropdown
  - Show Wing Endplate number input
ELSE:
  - Hide Wing Height and Wing Endplate
```

### Default Values

- Wide Body Installed: "No"
- Front: "Standard"
- Side: "Standard"
- Rear: "Standard"
- Wing: "Standard"
- Wing Height: "Medium" (only used when Wing = "Custom")
- Wing Endplate: 1 (only used when Wing = "Custom")

---

## Files Requiring Updates

### Database
- [ ] Create migration file: `supabase/migrations/YYYYMMDD_gt_auto_custom_parts.sql`
- [ ] Insert 2 new PartCategory records
- [ ] Insert 6 new Part records (1 GT Auto + 5 Custom Parts)
- [ ] Test that existing parts remain unchanged

### Backend/API
- [ ] Verify `/api/parts` endpoints work correctly (should auto-include new categories)
- [ ] Verify `/api/parts/categories` returns new categories in correct order
- [ ] Add validation for Wing Endplate (1-20 range) if not handled by frontend

### Frontend - Build Forms
- [ ] `src/components/build-upgrades-tab.tsx`
  - Display GT Auto category
  - Display Custom Parts category
  - Implement conditional display for Wing Height/Endplate
- [ ] `src/app/builds/new/page.tsx`
  - Include new parts in create form
  - Handle conditional Wing options
- [ ] `src/app/builds/[id]/edit/page.tsx`
  - Include new parts in edit form
  - Handle conditional Wing options
  - Load existing values correctly

### Frontend - Build Detail Page
- [ ] `src/app/builds/[id]/page.tsx`
  - Display GT Auto section
  - Display Custom Parts section
  - Conditionally display Wing Height/Endplate when Wing = "Custom"
  - Format display values appropriately

### Types
- [ ] Review `src/types/database.ts` for any type updates needed
- [ ] May need to add conditional type for Wing options

---

## Design System Compliance

- Use standard shadcn/ui Select/ComboBox components
- Full-width dropdowns on mobile (`w-full sm:w-fit` pattern)
- Proper labels using shadcn Label component
- Helper text for conditional fields
- Loading states for parts fetch
- Empty state handling
- Mobile-responsive spacing
- Border and hover states matching existing parts

---

## Testing Checklist

- [ ] New categories appear in correct order (after Extreme)
- [ ] All dropdowns render correctly on mobile and desktop
- [ ] Wing Height/Endplate only appear when Wing = "Custom"
- [ ] Wing Height/Endplate hidden when Wing changed from "Custom"
- [ ] Wing Endplate validation (1-20) works
- [ ] Default values set correctly on new builds
- [ ] Existing values load correctly on edit
- [ ] Build detail page displays all new parts correctly
- [ ] Conditional Wing options display on detail page when applicable
- [ ] No existing parts/categories broken
- [ ] API responses include new parts with correct category associations

---

## Notes

### Data Storage Approach

The Wing Height and Wing Endplate are stored as separate parts in the same Custom Parts category. This maintains consistency with the existing parts system and allows for:

1. Simple storage in `CarBuildUpgrade` table
2. Consistent querying via existing API endpoints
3. Easy filtering by category
4. Future extensibility (more conditional options can be added)

### Alternative Approach (Not Recommended)

Could store Wing options as JSON in a single Wing part value:
```json
{"wing": "Custom", "height": "Low", "endplate": "5"}
```

**Why not recommended:**
- Breaks consistency with existing parts pattern
- Harder to query/filter
- More complex validation logic
- UI complexity in displaying/editing

### Future Enhancements

After initial implementation, consider:
- Adding more Custom Parts options if GT7 adds them
- Visual preview of Wide Body on build detail page
- Part compatibility validation (e.g., some cars may not support Wide Body)

---

## References

- `docs/DATABASE-SCHEMA.md` - Parts and PartCategory schema
- `docs/DESIGN-SYSTEM.md` - UI/UX patterns and component usage
- `docs/PLAN.md` - Project architecture and existing features
