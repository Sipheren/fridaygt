# Gradient Slider Enhancement Plan

## Overview

Enhance Power Restrictor and Ballast tuning inputs with gradient fill sliders that provide visual feedback like a loading bar. As the slider value increases from 0% to 100%, the fill should visually progress with a gradient, matching GT7's performance adjustment UI and the project's design system.

## Current State

### Target Settings

**1. Power Restrictor**
- **Database Reference**: `name = 'Power Restrictor'`
- **Current Display**: Number input (0-100%)
- **Current Storage**: Integer values
- **Section**: Performance Adjustment
- **inputType**: `number`
- **Enhancement Requirements**:
  - Add gradient fill slider underneath input
  - Range: 0-100%
  - Step: 1 (integer values)
  - Gradient: Project primary accent gradient
  - Labels: "0%" | "50%" | "100%"

**2. Ballast**
- **Database Reference**: `name = 'Ballast'`
- **Current Display**: Number input (0-200kg)
- **Current Storage**: Integer values
- **Section**: Performance Adjustment
- **inputType**: `number`
- **Enhancement Requirements**:
  - Add gradient fill slider underneath input
  - Range: 0-200
  - Step: 1 (integer values)
  - Gradient: Project primary accent gradient (same style as Power Restrictor)
  - Labels: "0" | "100" | "200"

## Research Findings

### UI Best Practices (2025)

Based on current research:

1. **[40 Real-World Slider UI Examples That Work](https://www.eleken.co/blog-posts/slider-ui)** - Comprehensive guide showing gradient sliders improve UX by providing immediate visual feedback

2. **[Progress Bar Design Best Practices](https://uxplanet.org/progress-bar-design-best-practices-526f4d0a3c30)** - Key principles:
   - Use gradients to indicate intensity or progression
   - Keep designs simple and clear
   - Ensure proper contrast for accessibility

3. **[Analysis of 24 Innovative Progress Bar Designs](https://www.oreateai.com/blog/analysis-of-24-innovative-progress-bar-designs-visual-solutions-to-enhance-user-experience/1a26b4dcb90f9dacdab77f21ffc4e6a8)** - Shows gradient fills improve user engagement and understanding

4. **[React Slider with Gradient Track](https://www.shadcn.io/patterns/slider-styled-5)** - shadcn/ui pattern for gradient sliders that transitions from blue to red

5. **[Progress indicators – Material Design 3](https://m3.material.io/components/progress-indicators/overview)** - Official guidelines for linear progress indicators

### Gradient Design Trends 2025

- **Aurora gradients** continue to rise in popularity
- Gradients used to visually signify performance/intensity levels
- Color transitions should be smooth and meaningful
- Dark mode requires careful contrast considerations

## Technical Approach

### Option A: New Input Type (Recommended)

Create a new `gradientSlider` inputType that adds gradient fill sliders to the existing number input pattern.

**Pros:**
- Clean separation of concerns
- Existing `number` inputs unchanged
- Easy to extend to other settings in future
- Follows pattern established with `sliderDual`

**Cons:**
- Requires new inputType handling in BuildTuningTab
- Requires database update for affected settings

### Option B: Component Enhancement

Enhance the existing number input rendering to conditionally show gradient sliders based on setting configuration.

**Pros:**
- No database changes needed
- Can use existing inputType field

**Cons:**
- Couples slider logic to existing component
- Less flexible for future enhancements

**Decision**: Option A (New Input Type) - cleaner architecture and follows the pattern established with `sliderDual` and `toeAngle` inputTypes.

## Component Architecture

### New Component: `GradientSliderInput.tsx`

Location: `src/components/builds/GradientSliderInput.tsx`

**Purpose**: Single number input with gradient fill slider underneath

**Props**:
```tsx
interface GradientSliderInputProps {
  value: string | null           // Numeric string (e.g., "75")
  onChange: (value: string) => void
  setting: TuningSetting         // Contains minValue, maxValue, step, unit
  disabled?: boolean
}
```

**Features**:
- Single text input with unit display
- Gradient fill slider underneath input
- Gradient transitions based on value position (0% → 100%)
- Consistent gradient style across all instances
- Optional unit/degree display next to value
- Slider labels showing min/mid/max
- Center point calculation: `(minValue + maxValue) / 2`

**Uniform Gradient Style**:

All gradient sliders use the same project-brand gradient for consistency:
- **Colors**: Light primary → Dark primary
- **Start**: `hsl(var(--primary) / 60%)` - Light blue/purple
- **End**: `hsl(var(--primary))` - Full saturation primary color
- **Track**: `bg-muted` - Neutral gray for unfilled portion
- **Metaphor**: "Setting intensity increases" - works for both power and weight

**Implementation Approach**:

The gradient slider uses a CSS overlay approach for the gradient fill:

```tsx
// Container with neutral track background
<div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
  {/* Gradient fill that grows with value */}
  <div
    className="absolute top-0 left-0 h-full rounded-full transition-all duration-150 ease-out"
    style={{
      width: `${(numericValue / maxValue) * 100}%`,
      background: 'linear-gradient(to right, hsl(var(--primary) / 60%), hsl(var(--primary)))',
    }}
  />
</div>
```

**Alternative**: Use Tailwind arbitrary values for gradient:
```tsx
<div className="absolute top-0 left-0 h-full rounded-full transition-all duration-150 ease-out bg-gradient-to-r from-primary/60 to-primary"
     style={{ width: `${(numericValue / maxValue) * 100}%` }} />
```

## Database Changes

> **Note**: Table and column names use PascalCase with double quotes per Supabase/PostgreSQL conventions.
> Columns: `"inputType"`, `"minValue"`, `"maxValue"`, `"step"`, `"displayOrder"`, `"name"`

```sql
-- Update Power Restrictor - add gradient slider support
UPDATE "TuningSetting"
SET "inputType" = 'gradientSlider',
    "minValue" = 0,
    "maxValue" = 100,
    "step" = 1
WHERE "name" = 'Power Restrictor';

-- Update Ballast - add gradient slider support
UPDATE "TuningSetting"
SET "inputType" = 'gradientSlider',
    "minValue" = 0,
    "maxValue" = 200,
    "step" = 1
WHERE "name" = 'Ballast';
```

## Design System Compliance

All new components must follow established patterns:

- **Touch Targets**: `min-h-[44px]` on all interactive elements
- **Transitions**: `transition-colors` on interactive elements
- **Accessibility**: `aria-label` with full context for screen readers
- **Text Sizes**:
  - Labels: `text-sm text-muted-foreground`
  - Values: `text-sm font-medium`
  - Slider labels: `text-xs text-muted-foreground`
- **Spacing**: `space-y-2` for form field vertical rhythm
- **Responsive**: Full width with proper max-width constraints

### Color Usage

**Uniform Gradient for All Sliders**:
- Start: `hsl(var(--primary) / 60%)` - Light primary blue/purple (low intensity)
- End: `hsl(var(--primary))` - Full saturation primary color (max intensity)
- Track: `bg-muted` - Neutral gray for unfilled portion
- Animation: `transition-all duration-150 ease-out` - Smooth 150ms transitions

## Implementation Tasks

### Task 1: Create GradientSliderInput Component
- **File**: `src/components/builds/GradientSliderInput.tsx`
- **Steps**:
  1. Create component with TypeScript interfaces
  2. Implement number input parsing and formatting
  3. Add text input with optional unit display
  4. Add gradient fill slider with dynamic background
  5. Calculate center point for slider labels
  6. Add event handlers for text and slider inputs
  7. Implement validation and clamping
  8. Add Design System compliance (min-h-[44px], aria-labels)
  9. Add comprehensive documentation comments
  10. Implement gradient type logic (power/weight/default)

### Task 2: Update BuildTuningTab
- **File**: `src/components/builds/BuildTuningTab.tsx`
- **Steps**:
  1. Import GradientSliderInput component
  2. Add `gradientSlider` case to `renderSettingInput()` function
  3. Pass setting props (minValue, maxValue, step, unit) to component
  4. Determine gradient type based on setting name
  5. Test with different settings to verify display

### Task 3: Update Build Detail Page Display
- **File**: `src/app/builds/[id]/page.tsx`
- **Steps**:
  1. Review current display for affected settings
  2. Ensure unit symbols display correctly
  3. Verify formatted values show proper precision
  4. No structural changes needed (display logic already handles units)

### Task 4: Database Migration
- **Action**: Manual SQL execution in Supabase
- **Table**: `"TuningSetting"` (PascalCase, quoted)
- **Steps**:
  1. Run SQL updates for both settings
  2. Verify changes in Supabase table editor
  3. Test in local dev environment
  4. Verify settings API returns new inputType values

### Task 5: Testing & Verification
- **Areas to Test**:
  1. **Text Input**:
     - Direct value entry works
     - Validation and clamping to min/max
     - Proper decimal precision based on step
     - Integer values only (no decimals)
  2. **Slider Interaction**:
     - Dragging updates value in real-time
     - Sliders start at correct position
     - Gradient fill animates smoothly
     - Step granularity feels natural (1% at a time)
  3. **Gradient Display**:
     - All sliders use consistent primary color gradient
     - Gradient fills from light to dark primary
     - Gradients update smoothly during drag (150ms transition)
     - Unfilled portion shows neutral track color
     - Consistent visual language across both settings
  4. **Responsiveness**:
     - Works on mobile (44px touch targets)
     - Full-width layout on all screen sizes
  5. **Data Persistence**:
     - Values save correctly to database
     - Build detail page displays updated values
     - No data loss on existing builds

## Visual Design Specifications

### Uniform Gradient Style (All Sliders)

**Color Stops**:
```
0%:   hsl(var(--primary) / 60%)   # Light primary blue/purple
50%:  hsl(var(--primary) / 80%)   # Medium primary
100%: hsl(var(--primary))          # Full saturation primary
```

**CSS Implementation**:
```css
.gradient-fill {
  background: linear-gradient(
    to right,
    hsl(var(--primary) / 60%),
    hsl(var(--primary))
  );
}
```

**Visual Hierarchy**:
- Empty track: `bg-muted` - Neutral gray (provides contrast for filled portion)
- Filled portion: Primary gradient - Visually indicates current value intensity
- Smooth transition: 150ms ease-out - Natural, responsive feel without jarring movements

### Gradient Fill Implementation

**Option 1: CSS Custom Properties** (Recommended)
```tsx
<div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
  <div
    className="h-full rounded-full transition-all duration-150 ease-out"
    style={{
      width: `${(value / maxValue) * 100}%`,
      background: 'linear-gradient(to right, hsl(var(--primary) / 60%), hsl(var(--primary)))',
    }}
  />
</div>
```

**Option 2: Tailwind Arbitrary Values**
```tsx
<div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
  <div
    className="h-full rounded-full transition-all duration-150 ease-out bg-gradient-to-r from-primary/60 to-primary"
    style={{ width: `${(value / maxValue) * 100}%` }}
  />
</div>
```

## Edge Cases & Considerations

### 1. Existing Build Data
- **Concern**: Existing builds may have values outside new ranges
- **Solution**:
  - Power Restrictor: Clamp values >100 to 100 on load
  - Ballast: Clamp values >200 to 200 on load
  - Display warning if clamping occurs (optional enhancement)

### 2. Precision Handling
- **Issue**: Both settings are integer-only (no decimals)
- **Solution**:
  - Step 1 → Integer values only
  - Input type="number" with step="1"
  - ParseInt validation before storage

### 3. Gradient Performance
- **Issue**: Gradient recalculation on every slider change
- **Solution**:
  - Use CSS width transitions (GPU accelerated)
  - Debounce if performance issues arise
  - Test on mobile devices for smoothness

### 4. Accessibility
- **Issue**: Gradient fills may not be visible to colorblind users
- **Solution**:
  - Maintain numeric labels below slider
  - Use pattern/texture in addition to color (optional)
  - Ensure minimum contrast ratio (3:1 for large UI elements)
  - Provide screen reader announcements for value changes

### 5. Dark Mode
- **Issue**: Gradients must work in both light and dark modes
- **Solution**:
  - Use CSS custom properties (HSL with var())
  - Test gradients in both themes
  - Ensure sufficient contrast in both modes

## Success Criteria

- [ ] Both settings display gradient fill sliders underneath inputs
- [ ] Text inputs maintain existing width
- [ ] All sliders use consistent primary color gradient (uniform styling)
- [ ] All sliders have correct ranges (0-100, 0-200) and center points
- [ ] Slider dragging updates gradient in real-time
- [ ] Direct text input works with validation
- [ ] Values save and load correctly
- [ ] Mobile responsive with proper touch targets
- [ ] Build detail page displays values correctly
- [ ] No console errors or warnings
- [ ] Works on all existing builds without data loss
- [ ] Gradient visible and smooth in both light and dark modes
- [ ] Consistent visual language across all gradient sliders
- [ ] Accessibility compliant (screen readers, colorblind users)

## Future Enhancements (Out of Scope)

- Add color-coded zones (green/yellow/red) for optimal ranges
- Implement "snap to center" button
- Add visual indicators for GT7-recommended ranges
- Animated particles in gradient fill (performance impact)
- 3D gradient effects with shadows
- Preset buttons for common setups (street, track, drift)

## Version Planning

This feature will be version **2.13.0** (minor version - new UI components for existing features).

**Session**: #43
**Files to be modified**: 4 (1 new, 3 modified)
**Database changes**: Yes (2 rows in TuningSetting)
**Breaking changes**: No
**Migration required**: Yes (SQL updates)

## References

- [40 Real-World Slider UI Examples](https://www.eleken.co/blog-posts/slider-ui)
- [Progress Bar Design Best Practices](https://uxplanet.org/progress-bar-design-best-practices-526f4d0a3c30)
- [Innovative Progress Bar Designs](https://www.oreateai.com/blog/analysis-of-24-innovative-progress-bar-designs-visual-solutions-to-enhance-user-experience/1a26b4dcb90f9dacdab77f21ffc4e6a8)
- [shadcn Gradient Slider Pattern](https://www.shadcn.io/patterns/slider-styled-5)
- [Material Design 3 Progress Indicators](https://m3.material.io/components/progress-indicators/overview)
- [Gradient Progress Bars](https://codecanel.com/gradient-progress-bars/)
- FridayGT Design System: `docs/DESIGN-SYSTEM.md`
