# Dropdown Standardization Plan

**Date**: 2026-01-25
**Status**: Planning
**Priority**: Medium

## Overview

Standardize all dropdown selectors across FridayGT to provide consistent look, feel, and functionality with searchable, grouped dropdowns.

---

## User Requirements

1. **Component Choice**: Enhanced SearchableComboBox with visible search input
2. **Car Display Format**: `{manufacturer} {year} {name}` (manufacturer in group header, year+name in item)
3. **Track Grouping**: By location (e.g., "Australia", "Belgium", "Germany")
4. **Scope**: All dropdowns across every page on the site

---

## Current State

### Dropdown Inventory

| File | Dropdown Type | Purpose | Current Implementation | Items |
|------|---------------|---------|------------------------|-------|
| `QuickBuildModal.tsx` | Car Select | Select car for quick build | Custom div grouping | 552 |
| `builds/new/page.tsx` | Car Select | Select car for new build | Plain Select | 552 |
| `races/new/page.tsx` | Track Select | Select track for race | Custom div grouping | 118 |
| `races/[id]/edit/page.tsx` | Track Select | Edit track | Custom div grouping | 118 |
| `LapTimeForm.tsx` | Track ComboBox | Select track for lap time | SearchableComboBox | 118 |
| `LapTimeForm.tsx` | Conditions Select | Select conditions | Plain Select | ~5 |
| `BuildUpgradesTab.tsx` | Category Select | Filter parts by category | Plain Select | 5 |
| `races/new/page.tsx` | Weather Select | Select weather | Plain Select | 2 |
| `races/[id]/edit/page.tsx` | Weather Select | Select weather | Plain Select | 2 |

### Issues Identified

1. **Inconsistent grouping**: Mix of custom `<div>` wrappers, no proper `SelectGroup`
2. **No search**: Most dropdowns lack search capability
3. **Broken patterns**: Custom divs break Radix UI patterns
4. **Inconsistent display formats**: Different car/track label formats
5. **Poor UX for large lists**: Scrolling through 552 cars is painful

---

## Proposed Solution

### New Component: `GroupedSearchableSelect`

**Location**: `src/components/ui/grouped-searchable-select.tsx`

**Features**:
- Visible search input at top of dropdown
- Grouped display with visual group headers
- Fuzzy search (matches anywhere in text)
- Keyboard navigation (arrows, home/end, page up/down, enter, escape)
- Sticky group headers (stay visible while scrolling)
- Consistent shadcn/ui styling
- Loading state support
- Accessibility (ARIA labels, screen reader support)

**API**:
```typescript
interface GroupedSearchableSelectProps<T> {
  data: T[]                    // Array of items to display
  groupBy: (item: T) => string // Function to extract group key
  labelBy: (item: T) => string // Function to extract display label
  searchBy?: (item: T) => string[] // Optional: additional search terms
  value: string                // Currently selected value
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  groupLabelClassName?: string // Optional custom group styling
  disabled?: boolean
  className?: string
}
```

### Display Format Standards

#### Cars: Group by Manufacturer
```
ABARTH (group header - sticky)
├─ 1952 1500 Biposto Bertone B.A.T 1
├─ 2009 Abarth 500
└─ 1970 Abarth 595 SS

ALFA ROMEO (group header - sticky)
├─ 2016 4C
├─ 4C Gr.3
└─ 2008 8C Competizione

BMW (group header - sticky)
├─ 2018 M2 Competition
├─ 1989 M3
└─ M4 Gr.4
...
```

**Label format**: `{year} {carName}` (manufacturer shown in group header only)
**Search searches**: manufacturer + year + car name

#### Tracks: Group by Location
```
Australia (group header - sticky)
├─ Mount Panorama Motor Racing Circuit
└─ Bathurst

Belgium (group header - sticky)
├─ Circuit de Spa-Francorchamps
└─ Spa 24h Layout

Germany (group header - sticky)
├─ Nürburgring GP
├─ Nürburgring Nordschleife
└─ Nürburgring 24h
...
```

**Label format**: `{trackName}` (location shown in group header, layout in label if different)
**Search searches**: location + track name + layout

---

## Implementation Plan

### Phase 1: Foundation

#### 1.1 Create New Component
**File**: `src/components/ui/grouped-searchable-select.tsx`

**Tasks**:
- [ ] Extend SearchableComboBox with grouping support
- [ ] Add group header rendering
- [ ] Implement sticky group headers
- [ ] Add keyboard navigation for groups (Page Up/Down jumps between groups)
- [ ] Test with 552 cars (performance check)
- [ ] Test with 118 tracks
- [ ] Accessibility audit (ARIA labels, screen reader)

#### 1.2 Create Helper Functions
**File**: `src/lib/grouping.ts`

**Tasks**:
- [ ] `groupCarsByManufacturer(cars: Car[]): Record<string, Car[]>`
- [ ] `groupTracksByLocation(tracks: Track[]): Record<string, Track[]>`
- [ ] `getCarLabel(car: Car): string` → returns "{year} {name}"
- [ ] `getTrackLabel(track: Track): string` → returns "{name} {- layout}"
- [ ] `getCarSearchTerms(car: Car): string[]` → [manufacturer, year, name]
- [ ] `getTrackSearchTerms(track: Track): string[]` → [location, name, layout]

### Phase 2: Migration - Critical Paths

#### 2.1 Car Selection Dropdowns

**File**: `src/components/builds/QuickBuildModal.tsx`
- **Current**: Custom div-based grouping
- **Change**: Replace with `GroupedSearchableSelect`
- **Impact**:
  - ✅ Fixes: Broken div-based grouping
  - ✅ Adds: Search capability
  - ✅ Improves: Performance with large lists
  - ⚠️ Change: Visual look changes (more modern)
  - ⚠️ Change: Different icon (ChevronsUpDown vs ChevronDown)

**File**: `src/app/builds/new/page.tsx`
- **Current**: Plain Select, no grouping
- **Change**: Replace with `GroupedSearchableSelect`
- **Impact**:
  - ✅ Adds: Grouping by manufacturer
  - ✅ Adds: Search capability
  - ✅ Improves: Easier to find cars
  - ⚠️ Change: Visual look changes

#### 2.2 Track Selection Dropdowns

**File**: `src/app/races/new/page.tsx`
- **Current**: Custom div-based grouping by category
- **Change**: Replace with `GroupedSearchableSelect` with location grouping
- **Impact**:
  - ✅ Fixes: Broken div-based grouping
  - ✅ Adds: Search capability
  - ✅ Improves: Location-based grouping more intuitive than category
  - ⚠️ Change: Different grouping (location vs category)
  - ⚠️ Change: Visual look changes

**File**: `src/app/races/[id]/edit/page.tsx`
- **Current**: Custom div-based grouping by category
- **Change**: Replace with `GroupedSearchableSelect` with location grouping
- **Impact**: Same as races/new/page.tsx

**File**: `src/components/lap-times/LapTimeForm.tsx`
- **Current**: `SearchableComboBox` (no grouping)
- **Change**: Replace with `GroupedSearchableSelect`
- **Impact**:
  - ✅ Adds: Location-based grouping
  - ✅ Keeps: Search functionality (already had it)
  - ⚠️ Change: Different component, but similar UX

### Phase 3: Secondary Dropdowns

#### 3.1 Small Lists (Keep Standard Select)

These have few items and don't need search/grouping:

**File**: `src/components/lap-times/LapTimeForm.tsx` - Conditions
- Items: Dry, Wet, Mixed (3 items)
- **Decision**: Keep standard Select (too small for search)

**File**: `src/app/races/new/page.tsx` - Weather
- Items: Dry, Wet (2 items)
- **Decision**: Keep standard Select (too small for search)

**File**: `src/app/races/[id]/edit/page.tsx` - Weather
- Items: Dry, Wet (2 items)
- **Decision**: Keep standard Select (too small for search)

**File**: `src/components/builds/BuildUpgradesTab.tsx` - Category Filter
- Items: 5 categories
- **Decision**: Keep standard Select (small enough)

---

## What's Required to Replace Each Dropdown

### For Each Dropdown Migration:

1. **Import new component**:
   ```typescript
   import { GroupedSearchableSelect } from '@/components/ui/grouped-searchable-select'
   import { groupCarsByManufacturer, getCarLabel, getCarSearchTerms } from '@/lib/grouping'
   ```

2. **Replace Select component**:
   ```typescript
   // OLD:
   <Select value={carId} onValueChange={setCarId}>
     <SelectTrigger>
       <SelectValue placeholder="Select a car" />
     </SelectTrigger>
     <SelectContent>
       {cars.map(car => (
         <SelectItem key={car.id} value={car.id}>
           {car.manufacturer} {car.name}
         </SelectItem>
       ))}
     </SelectContent>
   </Select>

   // NEW:
   <GroupedSearchableSelect
     data={cars}
     groupBy={(car) => car.manufacturer}
     labelBy={(car) => getCarLabel(car)}
     searchBy={(car) => getCarSearchTerms(car)}
     value={carId}
     onValueChange={setCarId}
     placeholder="Select a car"
     searchPlaceholder="Search cars..."
   />
   ```

3. **Update data fetching** (if needed):
   - Ensure data is loaded before rendering
   - Add loading states
   - Handle empty states

4. **Test thoroughly**:
   - Search works for all fields
   - Groups display correctly
   - Keyboard navigation
   - Mobile responsive
   - Value passes correctly to parent

---

## Effects and Impact Analysis

### Visual Changes

#### Before (Current Select):
```
┌─────────────────────────────────┐
│ Select a car              ▼     │
└─────────────────────────────────┘
```

#### After (GroupedSearchableSelect):
```
┌─────────────────────────────────┐
│ Select a car            ▲ ▼     │
└─────────────────────────────────┘
```

**Differences**:
- Different icon (ChevronsUpDown indicates searchable)
- Click opens larger dropdown with search bar
- Group headers visible
- Check icon for selected item

### Functional Changes

#### New Capabilities:
1. **Search**: Can type "BMW M3" to find all BMW M3s
2. **Grouping**: Cars organized by manufacturer, tracks by location
3. **Keyboard**: Better navigation (arrows, home/end, page up/down)
4. **Fuzzy matching**: "por 911" finds "Porsche 911"

#### Behavioral Changes:
1. **Opens on click**: Same as before
2. **Closes on selection**: Same as before
3. **Escape closes**: Same as before
4. **Click outside closes**: Same as before

#### Performance Changes:
- **Initial render**: Slightly slower (component complexity)
- **Search**: Fast (uses React.useMemo for filtering)
- **Scrolling**: Same (virtual scrolling from Command component)
- **Large lists**: Better (Command component optimized for 100+ items)

### Breaking Changes

#### For Users:
- **Visual change**: Dropdowns look different (more modern)
- **Icon change**: ChevronsUpDown instead of ChevronDown
- **Grouping change**: Tracks grouped by location (not category)

#### For Developers:
- **Different API**: Need to use `GroupedSearchableSelect` instead of `Select`
- **Helper functions**: Need to import grouping functions
- **Type safety**: Better TypeScript support

---

## Rollout Strategy

### Option A: Big Bang (All at Once)
- Migrate all dropdowns in one PR
- **Pros**: Consistent UX immediately
- **Cons**: Large PR, harder to review, higher risk

### Option B: Incremental (Recommended)
- Phase 1: Create component (no user-facing changes)
- Phase 2: Migrate one page at a time
- Phase 3: Test thoroughly between migrations
- **Pros**: Smaller PRs, easier to review, easier to rollback
- **Cons**: Inconsistent UX during rollout

### Option C: Feature Flag
- Add feature flag to toggle between old/new dropdowns
- **Pros**: Can rollback instantly
- **Cons**: More complex code, need to maintain both during transition

**Recommendation**: Option B (Incremental)

---

## Testing Checklist

For each migrated dropdown:

### Functionality
- [ ] Dropdown opens on click
- [ ] Search works (can type any part of name)
- [ ] Group headers display correctly
- [ ] Group headers stick while scrolling
- [ ] Selected item shows check icon
- [ ] Dropdown closes on selection
- [ ] Dropdown closes on escape
- [ ] Dropdown closes on click outside
- [ ] Value passes to parent correctly
- [ ] Disabled state works
- [ ] Loading state displays (if applicable)

### Keyboard Navigation
- [ ] Arrow up/down moves selection
- [ ] Home/End jumps to first/last item
- [ ] Page Up/Down jumps between groups
- [ ] Enter selects item
- [ ] Escape closes dropdown
- [ ] Typing jumps to matching item (native behavior)

### Mobile
- [ ] Touch targets ≥44px
- [ ] Opens on tap
- [ ] Search works on mobile keyboard
- [ ] Can scroll through long lists
- [ ] Dropdown fits on screen (responsive)

### Accessibility
- [ ] ARIA labels present
- [ ] Screen reader announces groups
- [ ] Focus management correct
- [ ] Color contrast sufficient
- [ ] Keyboard-only navigation works

### Performance
- [ ] Opens quickly (<100ms)
- [ ] Search is responsive (no lag)
- [ ] Scrolling is smooth (60fps)
- [ ] No memory leaks

---

## Risk Assessment

### Low Risk
- **Component is new**: Doesn't affect existing code until migration
- **Incremental rollout**: Can migrate one dropdown at a time
- **Easy rollback**: Can revert individual files if needed

### Medium Risk
- **Visual change**: Users may notice different look
- **Grouping change**: Tracks grouped differently (location vs category)
- **Component complexity**: More code means more potential bugs

### Mitigation
- Thorough testing before each migration
- Keep old component during transition
- Document changes clearly
- Monitor for bugs after deployment

---

## Timeline Estimate

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 1: Foundation | Create component + helpers | 3-4 hours |
| Phase 2: Critical Paths | Migrate car/track dropdowns (4 files) | 2-3 hours |
| Phase 3: Testing | Test all migrations | 1-2 hours |
| Phase 4: Polish | Fix bugs, adjust styling | 1-2 hours |
| **Total** | | **7-11 hours** |

---

## Open Questions

1. **Presets/Favorites**: Should we add ability to pin favorite cars/tracks to top?
2. **Recent items**: Should recently selected items appear at top?
3. **Multi-select**: Do we need multi-select version for any dropdowns?
4. **Create new**: Should "Create new car/track" option appear in dropdown?
5. **Avatar/Images**: Should car/track images show in dropdown items?

---

## Dependencies

### Required Packages (already installed)
- `@radix-ui/react-dialog`
- `cmdk` (Command component)
- `lucide-react` (icons)
- Existing shadcn/ui components

### No New Dependencies Required

---

## Success Criteria

✅ All car/track dropdowns use `GroupedSearchableSelect`
✅ Search works across all relevant fields
✅ Grouping is intuitive (cars by brand, tracks by location)
✅ Consistent styling across all pages
✅ Keyboard navigation works perfectly
✅ Mobile experience is excellent
✅ Accessibility standards met
✅ Performance is acceptable (<100ms open, smooth scrolling)

---

## Next Steps

1. ✅ Plan approved by user
2. ⏳ Create `GroupedSearchableSelect` component
3. ⏳ Create helper functions in `src/lib/grouping.ts`
4. ⏳ Migrate first dropdown (QuickBuildModal)
5. ⏳ Test thoroughly
6. ⏳ Migrate remaining dropdowns incrementally
7. ⏳ Final testing and polish

---

**Status**: Waiting for user approval to proceed with Phase 1.
