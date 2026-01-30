/**
 * Toe Angle Input Component
 *
 * Purpose: Single toe angle input with bidirectional slider and dynamic icon
 * - Always-visible layout: Icon + text input + slider
 * - Dynamic icon: Changes based on value (ToeOutIcon → ToeStraightIcon → ToeInIcon)
 *
 * **Data Model:**
 * - Storage: Signed float as string (e.g., "-0.300", "0.150", "0.000")
 * - Negative values: Toe Out (e.g., -0.300 displays as "0.300 Out")
 * - Positive values: Toe In (e.g., 0.150 displays as "0.150 In")
 * - Zero: Straight (displays as "0.000" with straight icon)
 *
 * **Slider Range:**
 * - Min: -5.000 (Toe Out)
 * - Max: +5.000 (Toe In)
 * - Center: 0.000 (Straight)
 * - Step: 0.01 for usable granularity
 * - Text input accepts finer 0.001 precision
 * - Storage precision: 3 decimal places (toFixed(3))
 *
 * **Interaction:**
 * - Drag slider → Updates value in real-time
 * - Type in input → Parses and validates value
 * - Icon changes dynamically as value crosses zero
 *
 * **Design System Compliance:**
 * - min-h-[44px] for all interactive elements (WCAG touch targets)
 * - transition-colors on interactive elements
 * - aria-label for screen readers with full context
 * - text-foreground for icon color (inherits theme)
 * - space-y-2 for form field spacing
 *
 * **Props:**
 * - value: Signed float as string (e.g., "-0.300")
 * - onChange: Callback when value changes (signature: (value: string) => void)
 * - label: "Front" or "Rear" for accessibility
 * - disabled: Optional, disables all interactions
 *
 * **Related Files:**
 * - src/components/icons/ToeIcons.tsx: Icon components used here
 * - src/components/builds/ToeAngleDualInput.tsx: Parent component wrapping this
 * - src/components/builds/BuildTuningTab.tsx: Uses ToeAngleDualInput
 */

'use client'

import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { ToeInIcon, ToeOutIcon, ToeStraightIcon } from '@/components/icons/ToeIcons'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * Props for ToeAngleInput component
 * - value: Signed float as string (e.g., "-0.300", "0.150", "0.000")
 * - onChange: Callback when value changes
 * - label: "Front" or "Rear" for accessibility/aria-label
 * - disabled: Optional, disables all interactions
 */
interface ToeAngleInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  disabled?: boolean
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Determine toe direction from signed numeric value
 * - Uses epsilon (0.0005) for float comparison to handle precision errors
 * - Positive: Toe In (tires pointing inward)
 * - Negative: Toe Out (tires pointing outward)
 * - Near zero: Straight
 *
 * @param value - Numeric toe angle value
 * @returns 'in' | 'out' | 'straight'
 */
function getDirection(value: number): 'in' | 'out' | 'straight' {
  if (value > 0.0005) return 'in'
  if (value < -0.0005) return 'out'
  return 'straight'
}

/**
 * Get icon component based on direction
 * - Maps direction string to corresponding icon component
 * - Used for dynamic icon rendering
 *
 * @param direction - 'in' | 'out' | 'straight'
 * @returns Icon component (ToeInIcon | ToeOutIcon | ToeStraightIcon)
 */
function getToeIcon(direction: 'in' | 'out' | 'straight') {
  switch (direction) {
    case 'in':
      return ToeInIcon
    case 'out':
      return ToeOutIcon
    default:
      return ToeStraightIcon
  }
}

/**
 * Format display value with direction label
 * - Always shows absolute value (positive number)
 * - Appends direction label for non-zero values
 * - Examples: "0.300", "0.300 Out", "0.150 In"
 *
 * @param value - Numeric toe angle value
 * @returns Formatted display string
 */
function formatDisplayValue(value: number): string {
  const abs = Math.abs(value).toFixed(3)
  const direction = getDirection(value)
  if (direction === 'straight') return abs
  return `${abs} ${direction === 'in' ? 'In' : 'Out'}`
}

/**
 * Parse and validate direct text input
 * - Accepts decimal values with optional direction suffix
 * - Clamps to valid range (-5 to +5)
 * - Handles "Out" suffix → converts to negative
 * - Handles "In" suffix → keeps positive
 * - Returns formatted 3-decimal string
 *
 * @param input - Raw user input string
 * @returns Parsed and formatted value string
 */
function parseDirectInput(input: string): string {
  // Strip direction suffixes if present
  let cleaned = input.replace(/\s*(In|Out|IN|OUT)$/i, '')

  // Check for "out" keyword (case insensitive) anywhere in input
  const isOut = /out/i.test(input)
  const isIn = /in/i.test(input) && !isOut // "in" but not "out"

  // Parse as float
  const parsed = parseFloat(cleaned)

  if (isNaN(parsed)) return '0.000'

  // Apply direction based on keywords
  let value = parsed
  if (isOut) value = -Math.abs(parsed)
  else if (isIn) value = Math.abs(parsed)

  // Clamp to valid range
  const clamped = Math.max(-5, Math.min(5, value))

  // Format to 3 decimal places
  return clamped.toFixed(3)
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * Toe Angle Input Component
 *
 * Single toe angle input with bidirectional slider (always visible)
 * - Icon + text input + slider displayed at all times
 *
 * Behavior:
 * - Drag slider → Updates value in real-time
 * - Type in input → Parses and validates value
 * - Icon updates dynamically with value changes
 */
export function ToeAngleInput({ value, onChange, label, disabled = false }: ToeAngleInputProps) {
  // ============================================================
  // DERIVED VALUES
  // ============================================================
  // Parse value as float (default to 0 if empty/invalid)
  const numericValue = parseFloat(value) || 0

  // Get display components based on current value
  const direction = getDirection(numericValue)
  const IconComponent = getToeIcon(direction)
  const displayValue = formatDisplayValue(numericValue)

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle slider value change
   * - Called continuously as slider drags
   * - Formats to 3 decimal places for storage
   */
  const handleSliderChange = (values: number[]) => {
    const newValue = values[0]
    onChange(newValue.toFixed(3))
  }

  /**
   * Handle direct text input
   * - Parses user input (handles "In"/"Out" suffixes)
   * - Validates and clamps to valid range
   * - Formats to 3 decimal places
   */
  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseDirectInput(e.target.value)
    onChange(parsed)
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-2">
      {/* ============================================================
          INPUT ROW (Icon + Text Input)
          ============================================================
          Shows: Icon + Input field with value
          Layout: Flex row with gap between elements
          Icon: 24px, inherits text color (text-foreground)
          Input: min-h-[44px] for touch targets, full width, shows formatted value
      ============================================================ */}

      <div className="flex items-center gap-2">
        {/* Direction Icon - React component with currentColor */}
        <IconComponent
          size={24}
          className="shrink-0 text-foreground"
          aria-hidden="true"
        />

        {/* Value Display/Input - min-h-[44px] for WCAG touch targets */}
        <Input
          id={`toe-${label.toLowerCase()}`}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleDirectInput}
          placeholder="0.000"
          disabled={disabled}
          className="min-h-[44px] w-full text-center transition-colors"
          aria-label={`${label} toe angle: ${displayValue}`}
        />
      </div>

      {/* ============================================================
          SLIDER SECTION (Always Visible)
          ============================================================
          Shows: Slider + Labels
          Slider: Bidirectional (-5 to +5), step 0.01
          Labels: "Out 5.000" | "0.000" | "In 5.000"
      ============================================================ */}

      <div className="space-y-2">
        {/* Slider - min-h-[44px] for touch targets */}
        <Slider
          value={[numericValue]}
          min={-5}
          max={5}
          step={0.01}
          onValueChange={handleSliderChange}
          disabled={disabled}
          className="w-full min-h-[44px]"
          aria-label={`${label} toe angle slider`}
        />

        {/* Slider Labels - text-xs is acceptable for helper text per design system */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Out 5.000</span>
          <span>0.000</span>
          <span>In 5.000</span>
        </div>
      </div>
    </div>
  )
}
