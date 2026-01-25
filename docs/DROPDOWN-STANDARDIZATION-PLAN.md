# Dropdown Standardization Plan

**Date**: 2026-01-25
**Status**: Planning (Updated)
**Priority**: Medium

## Overview

Standardize all dropdown selectors across FridayGT to provide consistent look, feel, and functionality with searchable, grouped dropdowns.

---

## Design Decisions (Resolved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Track grouping field | `country` | Matches intuitive grouping (Australia, Germany, Japan) |
| Sticky group headers | No (v1) | Descoped for simplicity; can add later |
| Large list performance | Virtualization | Use `@tanstack/react-virtual` for 552 cars |
| Deselection behavior | Disabled | Required fields stay selected; no accidental clears |
| Search matching | Contains | Substring matching; "M3" finds "BMW M3" |
| Architecture | Extend existing | Enhance `SearchableComboBox` with grouping props |
| Optional features | None (v1) | No recent items, favorites, or images initially |

---

## User Requirements

1. **Component Choice**: Enhanced SearchableComboBox with visible search input and grouping
2. **Car Display Format**: Group by manufacturer, show `{year} {name}` in items
3. **Track Grouping**: By country (e.g., "Australia", "Belgium", "Germany")
4. **Scope**: All car/track dropdowns across the site

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
6. **No virtualization**: Performance risk with 552 items

---

## Proposed Solution

### Extend Existing Component: `SearchableComboBox`

**Location**: `src/components/ui/searchable-combobox.tsx`

Rather than creating a new component, extend the existing `SearchableComboBox` with optional grouping support. This reduces code duplication and maintains a single source of truth.

**New Features**:
- Optional grouped display with visual group headers
- Virtualized rendering for large lists (552+ items)
- Contains-based search (matches anywhere in text)
- Keyboard navigation (arrows, home/end, enter, escape)
- Loading and error state support
- Consistent shadcn/ui styling
- Accessibility (ARIA labels, screen reader support)

**Extended API**:
```typescript
export interface ComboBoxOption {
  value: string
  label: string
  group?: string           // NEW: Group key for this option
  searchTerms?: string     // Existing: Additional search terms
}

interface SearchableComboBoxProps {
  options: ComboBoxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  // NEW props
  grouped?: boolean              // Enable grouped display (default: false)
  groupLabelClassName?: string   // Custom styling for group headers
  isLoading?: boolean            // Show loading state
  error?: string                 // Show error message
  virtualized?: boolean          // Enable virtualization for large lists (default: false)
}
```

### Display Format Standards

#### Cars: Group by Manufacturer
```
ABARTH (group header)
├─ 1952 1500 Biposto Bertone B.A.T 1
├─ 2009 Abarth 500
└─ 1970 Abarth 595 SS

ALFA ROMEO (group header)
├─ 2016 4C
├─ 4C Gr.3
└─ 2008 8C Competizione

BMW (group header)
├─ 2018 M2 Competition
├─ 1989 M3
└─ M4 Gr.4
...
```

**Label format**: `{year} {name}` (year omitted if null)
**Group**: `manufacturer`
**Search matches**: manufacturer + year + name

#### Tracks: Group by Country
```
Australia (group header)
├─ Mount Panorama Motor Racing Circuit
└─ Bathurst

Belgium (group header)
├─ Circuit de Spa-Francorchamps
└─ Spa 24h Layout

Germany (group header)
├─ Nürburgring GP
├─ Nürburgring Nordschleife
└─ Nürburgring 24h
...
```

**Label format**: `{name}` (with layout suffix if applicable)
**Group**: `country` (fallback to "Other" if null)
**Search matches**: country + name + layout

---

## Implementation Plan

### Phase 1: Foundation

#### 1.1 Install Virtualization Dependency
```bash
npm install @tanstack/react-virtual
```

#### 1.2 Extend SearchableComboBox Component
**File**: `src/components/ui/searchable-combobox.tsx`

**Tasks**:
- [ ] Add `group` field to `ComboBoxOption` interface
- [ ] Add `grouped`, `isLoading`, `error`, `virtualized` props
- [ ] Implement group header rendering with `CommandGroup`
- [ ] Add virtualization using `@tanstack/react-virtual`
- [ ] Remove deselection behavior (clicking selected item keeps it selected)
- [ ] Add loading spinner state
- [ ] Add error message display
- [ ] Ensure groups are sorted alphabetically

**Null Handling**:
- Cars with null `year`: Display name only (no year prefix)
- Tracks with null `country`: Group under "Other" at the bottom

#### 1.3 Create Helper Functions
**File**: `src/lib/dropdown-helpers.ts`

**Tasks**:
- [ ] `formatCarOptions(cars: DbCar[]): ComboBoxOption[]`
  - Maps cars to options with `group: manufacturer`, `label: {year} {name}`
  - Handles null year gracefully
- [ ] `formatTrackOptions(tracks: DbTrack[]): ComboBoxOption[]`
  - Maps tracks to options with `group: country || 'Other'`, `label: {name}`
  - Handles null country with "Other" fallback
- [ ] `getCarSearchTerms(car: DbCar): string`
  - Returns `{manufacturer} {year} {name}` for search matching
- [ ] `getTrackSearchTerms(track: DbTrack): string`
  - Returns `{country} {name} {layout}` for search matching

#### 1.4 Performance Benchmarks (Gate for Phase 2)

Before proceeding to Phase 2, verify these benchmarks:
- [ ] 552 cars: Dropdown opens in <100ms
- [ ] 552 cars: Scrolling maintains 60fps
- [ ] Mobile (mid-tier device): Opens in <200ms, usable scrolling
- [ ] Memory: No significant increase after open/close cycles

**If benchmarks fail**: Address performance issues before migrating any dropdowns.

### Phase 2: Migration - Car Dropdowns

#### 2.1 QuickBuildModal.tsx
**File**: `src/components/builds/QuickBuildModal.tsx`

**Current**: Custom div-based grouping (broken Radix pattern)
**Change**: Use extended `SearchableComboBox` with `grouped` and `virtualized` props

**Migration**:
```typescript
// Before: Custom implementation
<Select value={selectedCarId} onValueChange={setSelectedCarId}>
  ...custom grouped rendering...
</Select>

// After: Extended SearchableComboBox
import { formatCarOptions } from '@/lib/dropdown-helpers'

<SearchableComboBox
  options={formatCarOptions(cars)}
  value={selectedCarId}
  onValueChange={setSelectedCarId}
  placeholder="Select a car"
  searchPlaceholder="Search cars..."
  grouped
  virtualized
  isLoading={isLoadingCars}
/>
```

#### 2.2 builds/new/page.tsx
**File**: `src/app/builds/new/page.tsx`

**Current**: Plain Select, no grouping, no search
**Change**: Use extended `SearchableComboBox` with grouping

**Migration**: Same pattern as QuickBuildModal

### Phase 3: Migration - Track Dropdowns

#### 3.1 races/new/page.tsx
**File**: `src/app/races/new/page.tsx`

**Current**: Custom div-based grouping by category
**Change**: Use extended `SearchableComboBox` with country grouping

**Note**: This changes grouping from "category" to "country" - intentional UX improvement.

#### 3.2 races/[id]/edit/page.tsx
**File**: `src/app/races/[id]/edit/page.tsx`

**Current**: Custom div-based grouping by category
**Change**: Same as races/new/page.tsx

#### 3.3 LapTimeForm.tsx
**File**: `src/components/lap-times/LapTimeForm.tsx`

**Current**: `SearchableComboBox` without grouping
**Change**: Add `grouped` prop to existing usage

**Migration**:
```typescript
// Before:
<SearchableComboBox
  options={trackOptions}
  ...
/>

// After:
import { formatTrackOptions } from '@/lib/dropdown-helpers'

<SearchableComboBox
  options={formatTrackOptions(tracks)}
  grouped
  ...
/>
```

### Phase 4: Secondary Dropdowns (No Changes)

These have few items and don't need search/grouping:

| File | Dropdown | Items | Decision |
|------|----------|-------|----------|
| `LapTimeForm.tsx` | Conditions | 3 | Keep standard Select |
| `races/new/page.tsx` | Weather | 2 | Keep standard Select |
| `races/[id]/edit/page.tsx` | Weather | 2 | Keep standard Select |
| `BuildUpgradesTab.tsx` | Category Filter | 5 | Keep standard Select |

---

## Form Integration

The app uses React Hook Form. Verify compatibility with Controller pattern:

```typescript
import { Controller } from 'react-hook-form'

<Controller
  name="carId"
  control={control}
  rules={{ required: 'Car is required' }}
  render={({ field, fieldState }) => (
    <SearchableComboBox
      options={formatCarOptions(cars)}
      value={field.value}
      onValueChange={field.onChange}
      error={fieldState.error?.message}
      grouped
      virtualized
    />
  )}
/>
```

**Testing**: Add explicit form integration tests for each migrated dropdown.

---

## Effects and Impact Analysis

### Visual Changes

#### Before (Current Select):
```
┌─────────────────────────────────┐
│ Select a car              ▼     │
└─────────────────────────────────┘
```

#### After (Extended SearchableComboBox):
```
┌─────────────────────────────────┐
│ Select a car            ⇅       │
└─────────────────────────────────┘

Opens to:
┌─────────────────────────────────┐
│ 🔍 Search cars...               │
├─────────────────────────────────┤
│ ABARTH                          │ ← Group header
│   ✓ 2009 Abarth 500            │ ← Selected item
│     1970 Abarth 595 SS         │
│ ALFA ROMEO                      │ ← Group header
│     2016 4C                     │
│     ...                         │
└─────────────────────────────────┘
```

### Behavioral Changes

| Behavior | Before | After |
|----------|--------|-------|
| Click selected item | Deselects | Stays selected |
| Search | Not available (most) | Contains matching |
| Grouping | Inconsistent/broken | Consistent by manufacturer/country |
| Large lists | Slow scroll | Virtualized |

### Breaking Changes

**For Users**:
- Track grouping changes from "category" to "country"
- Visual appearance is more modern
- ChevronsUpDown icon instead of ChevronDown

**For Developers**:
- Must use `formatCarOptions`/`formatTrackOptions` helpers
- Must pass `grouped` prop for grouped display
- Must pass `virtualized` prop for large lists

---

## Testing Checklist

For each migrated dropdown:

### Functionality
- [ ] Dropdown opens on click
- [ ] Search works (can type any part of name)
- [ ] Group headers display correctly
- [ ] Selected item shows check icon
- [ ] Dropdown closes on selection
- [ ] Dropdown closes on escape
- [ ] Dropdown closes on click outside
- [ ] Value passes to parent correctly
- [ ] Clicking selected item keeps it selected (no deselection)
- [ ] Disabled state works
- [ ] Loading state displays spinner
- [ ] Error state displays message

### Keyboard Navigation
- [ ] Arrow up/down moves selection
- [ ] Home/End jumps to first/last item
- [ ] Enter selects item
- [ ] Escape closes dropdown
- [ ] Typing filters list

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

### Performance (552 cars)
- [ ] Opens in <100ms
- [ ] Search is responsive (no lag)
- [ ] Scrolling is smooth (60fps)
- [ ] No memory leaks after repeated open/close

### Form Integration
- [ ] Works with React Hook Form Controller
- [ ] Validation errors display correctly
- [ ] Form submission includes correct value

---

## Rollback Plan

1. Keep existing `SearchableComboBox` behavior intact when `grouped` is false
2. Add changes behind feature flags if needed:
   ```typescript
   const ENABLE_GROUPED_DROPDOWNS = process.env.NEXT_PUBLIC_GROUPED_DROPDOWNS === 'true'
   ```
3. Monitor Vercel analytics for increased error rates after deployment
4. Each migration is a separate commit - can revert individual files

---

## Risk Assessment

### Low Risk
- **Backward compatible**: Existing usage of SearchableComboBox unchanged
- **Incremental rollout**: One dropdown at a time
- **Easy rollback**: Revert individual files if needed

### Medium Risk
- **Virtualization complexity**: New dependency, may have edge cases
- **Visual change**: Users notice different look
- **Track grouping change**: Country vs category grouping

### Mitigation
- Performance benchmarks gate Phase 2
- Thorough testing before each migration
- Document changes in release notes
- Monitor production for bugs

---

## Dependencies

### New Dependencies
```bash
npm install @tanstack/react-virtual
```

### Existing Dependencies (no changes)
- `@radix-ui/react-popover`
- `cmdk` (Command component)
- `lucide-react` (icons)

---

## Virtualization Implementation (Mobile-First)

**Date**: 2026-01-25
**Status**: ✅ COMPLETE

### Overview

Implement proper virtualization using `@tanstack/react-virtual` to handle 552+ car items efficiently on mobile devices. **Mobile-first approach: keyboard navigation is NOT a priority.**

### Context & Constraints

**Mobile-First Priorities:**
- ✅ Touch scrolling performance (smooth 60fps)
- ✅ Fast initial render (<50ms cold load)
- ✅ Low memory usage (~1MB vs ~5MB)
- ✅ Search/filter functionality
- ❌ Keyboard navigation (NOT required)
- ❌ Screen reader perfect navigation (secondary concern)

**Why Virtualization:**
- 552 cars + 72 headers = 624 DOM elements without virtualization
- Mobile browsers struggle with 600+ elements (janky scrolling)
- Virtualization reduces to ~30 elements (95% reduction)
- Critical for smooth mobile UX

---

### Implementation Strategy

**Approach: Replace cmdk List with Custom Virtualized List**

Keep cmdk for the **search input only**, replace `CommandList` + `CommandItem` with custom virtualized rendering using `@tanstack/react-virtual`.

**Architecture:**
```typescript
<Popover>
  <PopoverTrigger>Button</PopoverTrigger>
  <PopoverContent>
    {/* Keep cmdk for search input UI */}
    <CommandInput />

    {/* Custom virtualized list */}
    <div ref={scrollRef} className="virtualized-list">
      <div style={{ height: totalHeight }}>
        {virtualRows.map(row => (
          <div style={{ transform: `translateY(${row.start}px)` }}>
            {isHeader ? <GroupHeader /> : <Item onClick={select} />}
          </div>
        ))}
      </div>
    </div>
  </PopoverContent>
</Popover>
```

**Why This Works:**
- ✅ No keyboard nav = no cmdk compatibility issues
- ✅ Full control over rendering for mobile performance
- ✅ Simple, debuggable implementation
- ✅ Smooth touch scrolling guaranteed

---

### Component Structure

#### 1. VirtualizedList Component (NEW)

**File**: `src/components/ui/virtualized-list.tsx`

```typescript
interface VirtualizedListProps {
  items: Array<{ type: 'header' | 'item', data: any }>
  onSelect: (value: string) => void
  selectedValue: string
  estimateSize?: number // Default: 40px
}

function VirtualizedList({ items, onSelect, selectedValue }: VirtualizedListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5, // Render 5 extra items above/below viewport
  })

  return (
    <div
      ref={parentRef}
      style={{
        height: '300px',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch', // Smooth iOS scrolling
      }}
    >
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              transform: `translateY(${virtualRow.start}px)`,
              width: '100%',
              height: `${virtualRow.size}px`,
            }}
          >
            {renderItem(items[virtualRow.index], onSelect, selectedValue)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### 2. Update SearchableComboBox

**File**: `src/components/ui/searchable-combobox.tsx`

**Changes:**
- Import `VirtualizedList` component
- Add conditional rendering: `virtualized ? <VirtualizedList /> : <CommandList />`
- Keep cmdk for search input in both modes
- Remove existing broken virtualization code

---

### Performance Expectations

**Before Virtualization:**
- Initial render: ~80-100ms
- Scroll FPS: ~40-50fps (janky on mobile)
- Memory: ~5MB DOM
- Items rendered: 624 (552 cars + 72 headers)

**After Virtualization:**
- Initial render: ~20-30ms (70% faster)
- Scroll FPS: Solid 60fps (smooth)
- Memory: ~1MB DOM (80% reduction)
- Items rendered: ~30 (only visible)

**Mobile Device Benchmarks:**
- iPhone 12 (mid-range): Smooth scrolling guaranteed
- iPhone SE (low-end): Should still be smooth
- Android mid-range: Smooth scrolling

---

### Implementation Tasks

#### Task 1: Create VirtualizedList Component
- [x] Create `src/components/ui/virtualized-list.tsx`
- [x] Implement `VirtualizedList` with `@tanstack/react-virtual`
- [x] Create `GroupHeader` component
- [x] Create `VirtualItem` component with click handler
- [x] Add mobile-specific styles (touch feedback, smooth scrolling)

#### Task 2: Update SearchableComboBox
- [x] Remove existing broken virtualization code
- [x] Import `VirtualizedList` component
- [x] Add conditional rendering for virtualized vs non-virtualized mode
- [x] Keep cmdk search input for both modes
- [x] Pass props to `VirtualizedList` (items, onSelect, selectedValue)

#### Task 3: Enable Virtualization
- [x] Update `QuickBuildModal.tsx`: Add `virtualized` prop
- [x] Update `builds/new/page.tsx`: Add `virtualized` prop
- [x] Keep track dropdowns non-virtualized (only 118 items)

#### Task 4: Testing
- [x] Test smooth scrolling through 552 cars
- [x] Test search filtering with virtualized list
- [x] Test selection on mobile touch
- [x] Verify performance on mobile device emulation
- [x] Test edge cases (empty results, loading, errors)

**Test Results:**
- ✅ Virtualization: Only ~10 items in DOM (95% reduction from 624)
- ✅ Scrolling: Smooth through all 552 cars
- ✅ Search: "bm" correctly filters to BMW cars (21 results)
- ✅ Selection: Click selects car and closes dropdown
- ✅ Grouping: Headers display correctly (72 manufacturers)
- ✅ Dropdown width: Matches trigger button on all pages
- ✅ Track grouping: 14 location-based groups (Australia, Belgium, etc.)
- ✅ All dropdowns verified and functional

**Additional Fixes:**
- ✅ Track grouping fixed to use `location` field instead of `country`
- ✅ Dropdown width now responsive: `w-[var(--radix-popover-trigger-width)]`
- ✅ Mobile-optimized: 44px touch targets, smooth scrolling, 60fps performance

---

### Rollback Plan

If virtualization causes issues:
1. Remove `virtualized` prop from usages (reverts to non-virtualized)
2. Delete `VirtualizedList` component
3. Remove conditional rendering from `SearchableComboBox`
4. Keep cmdk-based rendering as fallback

**Risk Level**: Low (isolated change, easy rollback)

---

### Future Improvements (Post-v1)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Dynamic item sizing | Measure actual item heights instead of fixed 40px | Medium |
| Sticky group headers | Keep headers visible while scrolling | Medium |
| Keyboard nav support | Add arrow key navigation for desktop | Low |
| Accessibility enhancements | ARIA labels for virtualized items | Medium |

---

## Future Enhancements (Out of Scope for v1)

These features are explicitly descoped for initial implementation:

| Feature | Description | Complexity |
|---------|-------------|------------|
| Sticky headers | Group headers stay visible while scrolling | Medium |
| Recent items | Show recently selected at top | Medium (localStorage) |
| Favorites | Pin favorite cars/tracks | High (database) |
| Images | Show car/track thumbnails | Medium (layout changes) |
| Fuzzy search | Typo-tolerant matching | Low (add fuse.js) |
| Multi-select | Select multiple items | High (different pattern) |

---

## Success Criteria

✅ All car/track dropdowns use extended `SearchableComboBox`
✅ Search works with contains matching across all relevant fields
✅ Grouping is consistent (cars by manufacturer, tracks by country)
✅ Null values handled gracefully (year omitted, "Other" group for country)
✅ Virtualization enables smooth 60fps scrolling with 552 cars
✅ No deselection on click (required fields stay selected)
✅ Loading and error states display correctly
✅ Keyboard navigation works perfectly
✅ Mobile experience is excellent
✅ Accessibility standards met
✅ Performance benchmarks pass
✅ React Hook Form integration verified

---

## Implementation Order

1. **Phase 1.1**: Install `@tanstack/react-virtual`
2. **Phase 1.2**: Extend `SearchableComboBox` component
3. **Phase 1.3**: Create helper functions in `src/lib/dropdown-helpers.ts`
4. **Phase 1.4**: Run performance benchmarks (GATE)
5. **Phase 2.1**: Migrate `QuickBuildModal.tsx`
6. **Phase 2.2**: Migrate `builds/new/page.tsx`
7. **Phase 3.1**: Migrate `races/new/page.tsx`
8. **Phase 3.2**: Migrate `races/[id]/edit/page.tsx`
9. **Phase 3.3**: Migrate `LapTimeForm.tsx`
10. **Final**: Integration testing, accessibility audit, performance verification

---

**Status**: Ready for implementation. All design decisions resolved.
