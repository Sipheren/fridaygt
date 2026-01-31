# Reset & Clear Functionality Plan - Per-Setting Icons

**Date:** 2026-01-31
**Session:** #46
**Version:** 2.16.0 (proposed)
**Status:** Planning Phase

---

## Overview

Add two icon buttons to **each individual setting/input** on build edit pages:
1. **Reset Icon** - Restore this single setting to its original database value
2. **Clear Icon** - Clear this single setting (set to empty)

**Scope:** Every input in both Upgrades & Parts tab and Tuning Settings tab.

---

## Design Concept

### Icon Buttons Per Setting

Each setting row will have two small icon buttons positioned next to the label/input:

```
┌─────────────────────────────────────────────────────┐
│  [Setting Label]          [↺] [✕]                   │
│  [Input Field.........................]             │
└─────────────────────────────────────────────────────┘
```

**Icons:**
- **Reset (↺):** Undo/rotate-left icon - "Restore to original"
- **Clear (✕):** X icon - "Clear this field"

**Behavior:**
- Reset: Only visible if current value ≠ original value
- Clear: Only visible if field has a value
- Icons use opacity transitions (not conditional rendering) to prevent layout shift
- Container always reserves space with min-width
- Hover tooltip: "Reset to original" / "Clear"

---

## Component Design

### Button Styling

```tsx
// Reset Icon Button
<Button
  type="button"
  variant="ghost"
  size="icon"
  className={cn(
    "h-8 w-8 shrink-0",
    "text-muted-foreground hover:text-primary",
    "transition-all duration-150"
  )}
  aria-label="Reset to original value"
  onClick={handleReset}
>
  <RotateCcw className="h-4 w-4" />
</Button>

// Clear Icon Button
<Button
  type="button"
  variant="ghost"
  size="icon"
  className={cn(
    "h-8 w-8 shrink-0",
    "text-muted-foreground hover:text-destructive",
    "transition-all duration-150"
  )}
  aria-label="Clear this field"
  onClick={handleClear}
>
  <X className="h-4 w-4" />
</Button>
```

**Size:** 32px (h-8 w-8) - larger touch targets for better mobile UX
**Icon:** 16px (h-4 w-4) - proportionally sized

### Layout Options

**Option A: Inline with Label**
```tsx
<div className="flex items-center gap-2">
  <Label>Setting Name</Label>
  <ResetButton />
  <ClearButton />
</div>
<Input ... />
```

**Option B: Right-aligned above input (with layout shift prevention)**
```tsx
<div className="flex items-center justify-between">
  <Label>Setting Name</Label>
  {/* Container reserves space (2x 32px buttons + 4px gap = 68px) */}
  <div className="flex gap-1 min-w-[68px] justify-end">
    {/* Use opacity instead of conditional rendering to prevent layout shift */}
    <Button
      className={cn(
        "h-8 w-8 transition-opacity duration-150",
        showReset ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
    <Button
      className={cn(
        "h-8 w-8 transition-opacity duration-150",
        showClear ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <X className="h-4 w-4" />
    </Button>
  </div>
</div>
<Input ... />
```

**Recommended: Option B** - Cleaner, icons don't interfere with label text, no layout shift.

---

## Implementation by Tab

### Upgrades & Parts Tab (`BuildUpgradesTab.tsx`)

#### Checkbox Parts (Sports, Club Sports, etc.)

**Current Layout:**
```tsx
<div className="flex items-center space-x-3 rounded-lg border p-3">
  <Checkbox checked={isChecked} ... />
  <Label>{part.name}</Label>
</div>
```

**New Layout with Icons:**
```tsx
<div className="flex items-center justify-between gap-3 rounded-lg border p-3">
  <div className="flex items-center space-x-3 flex-1">
    <Checkbox checked={isChecked} ... />
    <Label className="flex-1 cursor-pointer">{part.name}</Label>
  </div>
  <div className="flex gap-1 shrink-0">
    {/* Reset - only show if changed from original */}
    {originalValue !== currentValue && (
      <IconButton aria-label="Reset to original" onClick={() => resetPart(part.id)}>
        <RotateCcw className="h-4 w-4" />
      </IconButton>
    )}
    {/* Clear - checkboxes use "uncheck" instead of clear */}
    {isChecked && (
      <IconButton aria-label="Uncheck" onClick={() => clearPart(part.id)}>
        <X className="h-4 w-4" />
      </IconButton>
    )}
  </div>
</div>
```

**Behavior:**
- Reset: Restore to original checked state (from `originalUpgrades`)
- Clear: Uncheck the box

#### Dropdown Parts (GT Auto, Custom Parts)

**Current Layout:**
```tsx
<div className="space-y-2">
  <Label htmlFor={part.id}>{part.name}</Label>
  <Select value={currentValue} ... />
</div>
```

**New Layout with Icons:**
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label htmlFor={part.id}>{part.name}</Label>
    <div className="flex gap-1 shrink-0">
      {/* Reset - only show if changed from original */}
      {originalUpgrades[part.id] !== currentValue && (
        <IconButton aria-label="Reset to original" onClick={() => resetPart(part.id)}>
          <RotateCcw className="h-4 w-4" />
        </IconButton>
      )}
      {/* Clear - only show if has value */}
      {currentValue && (
        <IconButton aria-label="Clear" onClick={() => clearPart(part.id)}>
          <X className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  </div>
  <Select value={currentValue} ... />
</div>
```

---

### Tuning Settings Tab (`BuildTuningTab.tsx`)

#### Standard Inputs (number, decimal, text, select)

**Current Layout:**
```tsx
<div className="space-y-2">
  <Label htmlFor={setting.id}>{setting.name}</Label>
  <Input id={setting.id} value={currentValue} ... />
</div>
```

**New Layout with Icons:**
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label htmlFor={setting.id}>{setting.name}</Label>
    <div className="flex gap-1 shrink-0">
      {/* Reset - only show if changed from original */}
      {originalTuningSettings[setting.id] !== currentValue && (
        <IconButton aria-label="Reset to original" onClick={() => resetSetting(setting.id)}>
          <RotateCcw className="h-4 w-4" />
        </IconButton>
      )}
      {/* Clear - only show if has value */}
      {currentValue && (
        <IconButton aria-label="Clear" onClick={() => clearSetting(setting.id)}>
          <X className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  </div>
  <Input id={setting.id} value={currentValue} ... />
</div>
```

#### Dual Inputs (front:rear)

**Current Layout:**
```tsx
<div className="space-y-2">
  <Label>{setting.name}</Label>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <span className="text-xs">Front</span>
      <Input value={frontValue} ... />
    </div>
    <div>
      <span className="text-xs">Rear</span>
      <Input value={rearValue} ... />
    </div>
  </div>
</div>
```

**New Layout with Icons:**
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>{setting.name}</Label>
    <div className="flex gap-1 shrink-0">
      {/* Reset - only show if changed from original */}
      {originalTuningSettings[setting.id] !== currentValue && (
        <IconButton aria-label="Reset to original" onClick={() => resetSetting(setting.id)}>
          <RotateCcw className="h-4 w-4" />
        </IconButton>
      )}
      {/* Clear - only show if has value */}
      {currentValue && (
        <IconButton aria-label="Clear" onClick={() => clearSetting(setting.id)}>
          <X className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  </div>
  <div className="grid grid-cols-2 gap-4">
    {/* Front/Rear inputs */}
  </div>
</div>
```

#### Specialized Inputs (SliderDualInput, ToeAngleDualInput, etc.)

For specialized components, pass reset/clear as props:

```tsx
// Example: SliderDualInput
interface SliderDualInputProps {
  value: string | null
  onChange: (value: string) => void
  setting: TuningSetting
  originalValue?: string | null  // NEW
  onReset?: () => void  // NEW
  onClear?: () => void  // NEW
}

// Inside component, add icon buttons to header
<div className="flex items-center justify-between">
  <Label>{setting.name}</Label>
  {onReset && onClear && (
    <div className="flex gap-1">
      {originalValue !== value && onReset && (
        <IconButton onClick={onReset}><RotateCcw className="h-4 w-4" /></IconButton>
      )}
      {value && onClear && (
        <IconButton onClick={onClear}><X className="h-4 w-4" /></IconButton>
      )}
    </div>
  )}
</div>
```

#### Gear Ratios

Each gear input gets its own icons:

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>{i === 0 ? 'Final Drive' : `${i}st Gear`}</Label>
    <div className="flex gap-1 shrink-0">
      {/* Reset individual gear */}
      {originalGears[key] !== gears[key] && (
        <IconButton onClick={() => resetGear(key)}>
          <RotateCcw className="h-4 w-4" />
        </IconButton>
      )}
      {/* Clear individual gear */}
      {gears[key] && (
        <IconButton onClick={() => clearGear(key)}>
          <X className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  </div>
  <Input value={gears[key]} ... />
</div>
```

---

## Parent Component Changes

### `src/app/builds/[id]/edit/page.tsx`

**Add Original State:**
```typescript
// Store original values from database for reset functionality
const [originalUpgrades, setOriginalUpgrades] = useState<Record<string, string | boolean>>({})
const [originalTuningSettings, setOriginalTuningSettings] = useState<Record<string, string>>({})
const [originalGears, setOriginalGears] = useState<Record<string, string>>({...})
```

**Populate in fetchBuild():**
```typescript
// After setting current state, create deep copies for original values:
// Using structuredClone() for proper deep cloning (handles undefined correctly)
setOriginalUpgrades(structuredClone(upgradesMap))
setOriginalTuningSettings(structuredClone(settingsMap))
setOriginalGears(structuredClone(gearsMap))
```

**Pass to Tabs:**
```tsx
<BuildUpgradesTab
  selectedUpgrades={selectedUpgrades}
  onUpgradeChange={handleUpgradeChange}
  originalUpgrades={originalUpgrades}  // NEW
/>

<BuildTuningTab
  tuningSettings={tuningSettings}
  onSettingChange={handleTuningSetting}
  gears={gears}
  onGearChange={handleGearChange}
  originalTuningSettings={originalTuningSettings}  // NEW
  originalGears={originalGears}  // NEW
/>
```

---

## Component Props Updates

### BuildUpgradesTab
```typescript
interface BuildUpgradesTabProps {
  selectedUpgrades: Record<string, string | boolean>
  onUpgradeChange: (partId: string, value: string | boolean) => void
  originalUpgrades: Record<string, string | boolean>  // NEW
  onPartReset?: (partId: string) => void  // Optional - can handle internally
  onPartClear?: (partId: string) => void  // Optional - can handle internally
}
```

### BuildTuningTab
```typescript
interface BuildTuningTabProps {
  tuningSettings: Record<string, string>
  onSettingChange: (settingId: string, value: string) => void
  onSettingDelete: (settingId: string) => void
  gears: Record<string, string>
  onGearChange: (gearKey: string, value: string) => void
  onAddGear: () => void
  onRemoveGear: () => void
  visibleGearCount: number
  originalTuningSettings: Record<string, string>  // NEW
  originalGears: Record<string, string>  // NEW
}
```

---

## Reset/Clear Handler Functions

### Internal to Tab Components (Recommended)

**BuildUpgradesTab.tsx:**
```typescript
// Reset single part to original value
const handleResetPart = (partId: string) => {
  const originalValue = originalUpgrades[partId]
  onUpgradeChange(partId, originalValue)
}

// Clear single part
const handleClearPart = (partId: string) => {
  const part = parts.find(p => p.id === partId)
  if (!part) return

  // For dropdown parts, clear to empty string
  // For checkbox parts, clear to false
  const isDropdownCategory = part.category?.name === 'GT Auto' || part.category?.name === 'Custom Parts'
  onUpgradeChange(partId, isDropdownCategory ? '' : false)
}
```

**BuildTuningTab.tsx:**
```typescript
// Reset single setting to original value
const handleResetSetting = (settingId: string) => {
  const originalValue = originalTuningSettings[settingId]
  onSettingChange(settingId, originalValue)
}

// Clear single setting
const handleClearSetting = (settingId: string) => {
  onSettingChange(settingId, '')
}

// Reset single gear
const handleResetGear = (gearKey: string) => {
  const originalValue = originalGears[gearKey]
  onGearChange(gearKey, originalValue)
}

// Clear single gear
const handleClearGear = (gearKey: string) => {
  onGearChange(gearKey, '')
}
```

---

## Icon Imports

```typescript
import { RotateCcw, X } from 'lucide-react'
```

---

## Edge Cases

### Empty Original Values
- If original value is empty string or false:
  - Reset icon only shows when current value ≠ empty
  - Clicking reset clears the field (correct behavior)

### Checkbox Parts
- Clear = uncheck (set to false)
- Reset = restore original checked state

### Conditional Parts (Wing Height/Endplate)
- When Wing is cleared, conditional parts hide automatically
- Icons on conditional parts work the same way

### Gear Count
- Individual gear reset/clear doesn't affect visibleGearCount
- Only "Add Gear" / "Remove Gear" buttons change count

### Dual Inputs (front:rear)
- Reset: Restores original "front:rear" string
- Clear: Sets to empty string, which clears both front and rear

---

## Mobile Responsiveness

### Icon Buttons
- Fixed 32px (h-8 w-8) - optimized for mobile touch targets
- Touch-friendly: comfortable tap target size
- No text overflow issues

### Layout
- Icons above input (in label row) - full width on mobile
- No horizontal scrolling issues
- Reserved space with min-width prevents layout shift

---

## Accessibility

### ARIA Labels
```tsx
<Button
  aria-label={`Reset ${setting.name} to original value`}
  aria-label={`Clear ${setting.name}`}
  ...
>
```

### Keyboard Navigation
- Icons are `<button>` elements - tab navigable
- Logical tab order: Label → Reset → Clear → Input
- Focus visible with default ring styles

### Screen Readers
- Reset: "Reset [setting name] to original value"
- Clear: "Clear [setting name]"
- Icons have accessible labels

---

## Design System Compliance

### Icon Sizes
- **Buttons:** 32px (h-8 w-8) - larger touch targets for mobile UX
- **Icons:** 16px (h-4 w-4) - proportionally scaled
- **Touch Targets:** 32px provides comfortable mobile interaction

### Colors
- **Reset:** `text-muted-foreground` → `text-primary` (hover)
- **Clear:** `text-muted-foreground` → `text-destructive` (hover)
- **Ghost variant:** No background, subtle hover

### Spacing
- `gap-1` between icons (4px)
- Icons right-aligned in header row
- `min-w-[68px]` container reserves space (2x 32px buttons + 4px gap)
- Opacity transitions instead of conditional rendering prevent layout shift

---

## Implementation Order

### Phase 1: Parent Component Setup
**File:** `src/app/builds/[id]/edit/page.tsx`
- Add `originalUpgrades`, `originalTuningSettings`, `originalGears` state
- Populate with deep copies in `fetchBuild()`
- Pass to tab components as props

### Phase 2: BuildUpgradesTab Updates
**File:** `src/components/builds/BuildUpgradesTab.tsx`
- Add `originalUpgrades` prop
- Add reset/clear handlers (internal)
- Update checkbox rendering with icons
- Update dropdown rendering with icons
- Import icons (RotateCcw, X)

### Phase 3: BuildTuningTab Updates
**File:** `src/components/builds/BuildTuningTab.tsx`
- Add `originalTuningSettings`, `originalGears` props
- Add reset/clear handlers (internal)
- Update standard input rendering with icons
- Update dual input rendering with icons
- Update gear input rendering with icons
- Import icons

### Phase 4: Specialized Components (Optional)
**Files:** SliderDualInput, ToeAngleDualInput, GradientSliderInput, BallastSliderInput
- Add optional `originalValue`, `onReset`, `onClear` props
- Add icon buttons to headers
- Update prop interfaces

### Phase 5: Testing
- Test reset on all input types
- Test clear on all input types
- Test conditional display (icons show/hide correctly)
- Test mobile responsiveness
- Test keyboard navigation
- Test edge cases (empty originals, etc.)

### Phase 6: Documentation
- Update SESSION-LOG.md with Session #46
- Update PLAN.md
- Update README.md (version 2.16.0)
- Update package.json (version 2.16.0)

---

## Files to Modify

1. `src/app/builds/[id]/edit/page.tsx`
   - Add original state variables
   - Populate in fetchBuild()
   - Pass to tabs

2. `src/components/builds/BuildUpgradesTab.tsx`
   - Add props, handlers, icons
   - Update checkbox and dropdown rendering

3. `src/components/builds/BuildTuningTab.tsx`
   - Add props, handlers, icons
   - Update all input type renderings

4. `src/components/builds/SliderDualInput.tsx` (Optional)
   - Add reset/clear props and icons

5. `src/components/builds/ToeAngleDualInput.tsx` (Optional)
   - Add reset/clear props and icons

6. `src/components/builds/GradientSliderInput.tsx` (Optional)
   - Add reset/clear props and icons

7. `src/components/builds/BallastSliderInput.tsx` (Optional)
   - Add reset/clear props and icons

8. Documentation files (SESSION-LOG, PLAN, README, package.json)

---

## Testing Checklist

### Reset Functionality
- [ ] Checkbox: Reset restores original checked state
- [ ] Dropdown: Reset restores original dropdown value
- [ ] Number input: Reset restores original number
- [ ] Dual input: Reset restores original "front:rear" value
- [ ] Gear: Reset restores original gear value
- [ ] Reset icon only shows when current ≠ original

### Clear Functionality
- [ ] Checkbox: Clear unchecks the box
- [ ] Dropdown: Clear sets to empty (shows placeholder)
- [ ] Number input: Clear sets to empty string
- [ ] Dual input: Clear clears both front and rear
- [ ] Gear: Clear clears individual gear
- [ ] Clear icon only shows when value exists

### Conditional Display
- [ ] Icons fade out (opacity-0) when field is empty and at original
- [ ] Icons fade in (opacity-100) when field is changed from original
- [ ] Icons fade in when field has value
- [ ] No layout shift (min-width container + opacity transitions)

### Edge Cases
- [ ] Empty original values work correctly
- [ ] Reset after clear restores original
- [ ] Clear after reset clears again
- [ ] Multiple resets in a row always work
- [ ] Conditional parts (Wing) work correctly

### Accessibility
- [ ] All icons tab navigable
- [ ] ARIA labels correct
- [ ] Keyboard focus visible
- [ ] Touch targets adequate (32px)

---

## Visual Mockups

### Checkbox Part with Icons
```
┌──────────────────────────────────────────────────────┐
│  ✓ Sports: Hard            [↺] [✕]                   │
└──────────────────────────────────────────────────────┘
```

### Dropdown Part with Icons
```
┌──────────────────────────────────────────────────────┐
│  Wing                [Custom ▼]        [↺] [✕]        │
└──────────────────────────────────────────────────────┘
```

### Number Input with Icons
```
┌──────────────────────────────────────────────────────┐
│  Ride Height             [50 mm]         [↺] [✕]     │
└──────────────────────────────────────────────────────┘
```

---

## Benefits of Per-Setting Approach

1. **Granular Control** - Reset/clear individual values without affecting others
2. **Clear Visual Feedback** - Icons appear/disappear based on state
3. **No Confirmation Needed** - Single setting = low risk of accidental reset
4. **Better Mobile UX** - No need to scroll to global reset button
5. **Intuitive** - Icons are next to the field they affect
6. **Scalable** - Works for any number of settings

---

## Future Enhancements

- **Reset All Button** - Global reset (in addition to per-setting)
- **Keyboard Shortcuts** - Ctrl+Z to undo last change
- **Dirty Indicator** - Dot on changed settings
- **Bulk Reset** - Reset by section/category
