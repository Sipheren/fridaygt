/**
 * Ballast Slider Input Component
 *
 * Purpose: Single-value bidirectional slider for Ballast Positioning
 * - Text input shows value with dynamic position label (Front/Center/Rear)
 * - Slider ranges from -50 (Full Front) to +50 (Full Rear) with 0 at Center
 * - Click/drag slider to adjust value in real-time
 * - Input validation and clamping to range
 *
 * **Data Model:**
 * - Storage format: Clean numeric string (e.g., "-25", "0", "25")
 * - Value: Numeric value clamped to -50 to +50 range
 * - Default: Empty string (interpreted as 0/Center)
 *
 * **Value Mapping:**
 * - -50: Full Front
 * - -1 to -49: Front bias
 * - 0: Center
 * - +1 to +49: Rear bias
 * - +50: Full Rear
 *
 * **Display Labels:**
 * - Negative values: "{value} Front" (e.g., "-25 Front")
 * - Zero: "0 Center"
 * - Positive values: "+{value} Rear" (e.g., "+25 Rear")
 *
 * **Slider Labels:**
 * - Three labels underneath: "-50 Front", "0 Center", "+50 Rear"
 *
 * **Layout:**
 * - Single column layout (not dual)
 * - Text input with position label
 * - Slider underneath with three-point labels
 *
 * **Design System Compliance:**
 * - Uses shadcn Input and Slider components
 * - min-h-[44px] for all interactive elements (WCAG touch targets)
 * - transition-colors on interactive elements
 * - aria-label for screen readers with full context
 * - text-sm for labels, text-xs for slider labels
 * - space-y-2 for form field spacing
 * * - Responsive full-width layout
 *
 * **Props:**
 * - value: Numeric string (e.g., "-25", "0", "25")
 * - onChange: Callback when value changes (signature: (value: string) => void)
 * - setting: TuningSetting object with minValue, maxValue, step
 *
 * **Usage Example:**
 * <BallastSliderInput
 *   value="-25"
 *   onChange={(newValue) => setSetting(setting.id, newValue)}
 *   setting={setting}
 * />
 *
 * **Related Files:**
 * - src/components/builds/BuildTuningTab.tsx: Parent component using this
 * - src/components/builds/SliderDualInput.tsx: Similar slider pattern
 * - src/components/builds/ToeAngleDualInput.tsx: Bidirectional value handling
 */

'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import type { DbTuningSetting } from '@/types/database'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type SliderSetting = Pick<DbTuningSetting, 'minValue' | 'maxValue' | 'step' | 'unit'>

/**
 * Props for BallastSliderInput component
 * - value: Numeric string format (e.g., "-25", "0", "25")
 * - onChange: Callback when value changes
 * - setting: SliderSetting with slider configuration
 */
interface BallastSliderInputProps {
  value: string | null
  onChange: (value: string) => void
  setting: SliderSetting
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Parse and validate numeric value
 * - Clamps to min/max range if provided
 * - Returns formatted string for storage
 *
 * @param input - Raw user input string
 * @param minValue - Minimum value (-50)
 * @param maxValue - Maximum value (50)
 * @returns Parsed, clamped, and formatted value string
 */
function parseAndClampValue(
  input: string,
  minValue: number,
  maxValue: number
): string {
  const parsed = parseFloat(input)

  if (isNaN(parsed)) return ''

  let clamped = parsed

  // Clamp to min/max range
  if (clamped < minValue) {
    clamped = minValue
  }
  if (clamped > maxValue) {
    clamped = maxValue
  }

  // Return as integer string (no decimals for this input type)
  return clamped.toString()
}

/**
 * Get position label based on value
 * - Negative values: "Front"
 * - Zero: "Center"
 * - Positive values: "Rear"
 *
 * @param value - Numeric value
 * @returns Position label string
 */
function getPositionLabel(value: number): string {
  if (value < 0) return 'Front'
  if (value > 0) return 'Rear'
  return 'Center'
}

/**
 * Format display value with position label
 * - Negative: "-25 Front"
 * - Zero: "0 Center"
 * - Positive: "+25 Rear" (adds + prefix)
 *
 * @param value - Numeric value
 * @returns Formatted display string with label
 */
function formatDisplayValue(value: number): string {
  const positionLabel = getPositionLabel(value)

  if (value < 0) {
    return `${value} ${positionLabel}`
  }
  if (value > 0) {
    return `+${value} ${positionLabel}`
  }
  return `0 ${positionLabel}`
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * Ballast Slider Input Component
 *
 * Single-value bidirectional slider for Ballast Positioning
 * - Text input shows value with position label (Front/Center/Rear)
 * - Slider underneath for visual adjustment
 * - Range: -50 (Front) to +50 (Rear) with 0 at Center
 *
 * Behavior:
 * - Drag slider → Updates value in real-time
 * - Type in input → Parses, validates, clamps to range
 * - Position label updates automatically based on value
 */
export function BallastSliderInput({
  value,
  onChange,
  setting
}: BallastSliderInputProps) {
  // ============================================================
  // CONFIGURATION FROM SETTING
  // ============================================================
  const minValue = setting.minValue ?? -50
  const maxValue = setting.maxValue ?? 50
  const step = setting.step ?? 1

  // Parse numeric value for slider (default to 0 if empty/invalid)
  // Round to nearest integer since step is 1
  const numericValue = Math.round(parseFloat(value || '') || 0)

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle text input change
   * - Parses user input
   * - Clamps to -50 to +50 range
   * - Returns formatted integer string
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseAndClampValue(e.target.value, minValue, maxValue)
    onChange(parsed)
  }

  /**
   * Handle slider change
   * - Formats to integer string
   * - Clamps to range automatically by Slider component
   */
  const handleSliderChange = (values: number[]) => {
    onChange(values[0].toString())
  }

  // ============================================================
  // RENDER
  // ============================================================

  // Format display value with position label
  const displayValue = formatDisplayValue(numericValue)

  // Slider labels with position
  const minLabel = `${minValue} Front`
  const centerLabel = '0 Center'
  const maxLabel = `+${maxValue} Rear`

  return (
    <div className="space-y-2">
      {/* ============================================================
          TEXT INPUT WITH POSITION LABEL
          ============================================================
          - Shows value with dynamic label (Front/Center/Rear)
          - User can type directly or use slider
          - min-h-[44px] for touch targets (WCAG)
      ============================================================ */}
      <Input
        id="ballast-slider-input"
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleInputChange}
        placeholder="0 Center"
        className="min-h-[44px] w-full text-center transition-colors"
        aria-label="Ballast positioning value"
      />

      {/* ============================================================
          SLIDER WITH LABELS
          ============================================================
          - Bidirectional slider (-50 to +50)
          - Three labels: min (-50 Front), center (0 Center), max (+50 Rear)
          - min-h-[44px] for touch targets (WCAG)
      ============================================================ */}
      <div className="space-y-2">
        <Slider
          value={[numericValue]}
          min={minValue}
          max={maxValue}
          step={step}
          onValueChange={handleSliderChange}
          className="w-full min-h-[44px]"
          aria-label="Ballast positioning slider"
        />
        {/* Slider Labels - text-xs is acceptable for helper text per design system */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minLabel}</span>
          <span>{centerLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  )
}
