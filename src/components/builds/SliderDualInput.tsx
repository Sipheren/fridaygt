/**
 * Slider Dual Input Component
 *
 * Purpose: Front/Rear dual input with always-visible centered sliders
 * - Manages "front:rear" value format (e.g., "1.500:2.000")
 * - Displays optional unit/degree symbols next to values
 * - Provides sliders for visual adjustment underneath each input
 * - Responsive layout: stacked on mobile, side-by-side on desktop
 *
 * **Data Model:**
 * - Storage format: "front:rear" string (e.g., "1.500:2.000")
 * - Front value: Numeric value clamped to minValue-maxValue range
 * - Rear value: Numeric value clamped to minValue-maxValue range
 * - Default: Empty string (interpreted as 0)
 *
 * **Value Parsing:**
 * - Splits on colon to extract front/rear values
 * - Defaults to empty string if missing
 * - Reconstructs on change: "${newFront}:${rear}" or "${front}:${newRear}"
 *
 * **Slider Behavior:**
 * - Range: minValue to maxValue (from setting prop)
 * - Step: From setting.step (0.01 for decimals, 1 for integers)
 * - Center Point: Calculated as (minValue + maxValue) / 2
 * - Clamping: Values automatically clamped to min/max range
 *
 * **Unit Display:**
 * - Unit displays OUTSIDE text input (not in value)
 * - Negative Camber: Shows ° after input
 * - Natural Frequency: Shows Hz after input
 * - Damping: Shows % after input
 * - Anti-Roll Bar: Shows Lv after input
 * - Others: Shows unit from setting.unit if present
 *
 * **Layout:**
 * - Mobile (grid-cols-1): Stacked vertically (Front above Rear)
 * - Desktop (sm:grid-cols-2): Side-by-side with gap-4
 * - Each axle: Label + Text Input + Unit Span + Slider + Slider Labels
 *
 * **Design System Compliance:**
 * - Uses shadcn Label component
 * - min-h-[44px] for all interactive elements (WCAG touch targets)
 * - transition-colors on interactive elements
 * - aria-label for screen readers with full context
 * - text-sm for labels, text-xs for slider labels
 * - space-y-2 for form field spacing
 * - Responsive grid-cols-1 sm:grid-cols-2 layout
 *
 * **Props:**
 * - value: "front:rear" string (e.g., "1.500:2.000")
 * - onChange: Callback when value changes (signature: (value: string) => void)
 * - setting: TuningSetting object with minValue, maxValue, step, unit
 * - disabled: Optional, disables all interactions
 *
 * **Usage Example:**
 * <SliderDualInput
 *   value="1.500:2.000"
 *   onChange={(newValue) => setSetting(setting.id, newValue)}
 *   setting={setting}
 * />
 *
 * **Related Files:**
 * - src/components/builds/BuildTuningTab.tsx: Parent component using this
 * - src/components/builds/ToeAngleDualInput.tsx: Similar pattern (bidirectional)
 * - src/app/api/tuning-settings/route.ts: Fetches setting metadata
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
 * Props for SliderDualInput component
 * - value: "front:rear" string format (e.g., "1.500:2.000")
 * - onChange: Callback when value changes
 * - setting: SliderSetting with slider configuration
 * - disabled: Optional, disables all interactions
 */
interface SliderDualInputProps {
  value: string | null
  onChange: (value: string) => void
  setting: SliderSetting
  disabled?: boolean
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate number of decimal places from step value
 * - Step 0.01 → 2 decimals
 * - Step 1 → 0 decimals (integer)
 * - Step 0.1 → 1 decimal
 * - Step null/undefined → 0 decimals (default to integer)
 *
 * @param step - Step value from setting
 * @returns Number of decimal places (0-3)
 */
function getDecimalPlaces(step: number | null | undefined): number {
  if (!step || step >= 1) return 0
  const decimalStr = step.toString().split('.')[1]
  return decimalStr ? decimalStr.length : 0
}

/**
 * Parse and validate numeric value
 * - Clamps to min/max range if provided
 * - Formats to specified decimal places
 * - Returns formatted string for storage
 *
 * @param input - Raw user input string
 * @param minValue - Minimum value (optional)
 * @param maxValue - Maximum value (optional)
 * @param decimalPlaces - Number of decimal places for formatting
 * @returns Parsed, clamped, and formatted value string
 */
function parseAndClampValue(
  input: string,
  minValue: number | null | undefined,
  maxValue: number | null | undefined,
  decimalPlaces: number
): string {
  const parsed = parseFloat(input)

  if (isNaN(parsed)) return ''

  let clamped = parsed

  // Clamp to min/max range if specified
  if (minValue !== null && minValue !== undefined && clamped < minValue) {
    clamped = minValue
  }
  if (maxValue !== null && maxValue !== undefined && clamped > maxValue) {
    clamped = maxValue
  }

  // Format to specified decimal places
  return decimalPlaces > 0 ? clamped.toFixed(decimalPlaces) : clamped.toString()
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * Slider Dual Input Component
 *
 * Front/Rear dual input with always-visible centered sliders
 * - Text input + Unit + Slider for each axle
 * - Responsive layout: stacked (mobile) / side-by-side (desktop)
 *
 * Behavior:
 * - Drag slider → Updates value in real-time
 * - Type in input → Parses, validates, clamps to range
 * - Unit displays next to text input value
 */
export function SliderDualInput({
  value,
  onChange,
  setting,
  disabled = false
}: SliderDualInputProps) {
  // ============================================================
  // CONFIGURATION FROM SETTING
  // ============================================================
  const minValue = setting.minValue ?? 0
  const maxValue = setting.maxValue ?? 100
  const step = setting.step ?? 1
  const unit = setting.unit

  // Calculate decimal places from step
  const decimalPlaces = getDecimalPlaces(step)

  // Calculate center point for slider labels (mathematical middle of range)
  const centerPoint = (minValue + maxValue) / 2

  // ============================================================
  // VALUE PARSING
  // ============================================================
  // Parse "front:rear" format, default to empty strings
  const [front = '', rear = ''] = (value || '').split(':')

  // Parse numeric values for sliders (default to minValue if empty/invalid)
  const frontNumeric = parseFloat(front) || minValue
  const rearNumeric = parseFloat(rear) || minValue

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle front axle text input change
   * - Parses user input
   * - Clamps to min/max range
   * - Formats to correct decimal places
   * - Reconstructs "front:rear" format
   */
  const handleFrontInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseAndClampValue(e.target.value, minValue, maxValue, decimalPlaces)
    onChange(`${parsed}:${rear}`)
  }

  /**
   * Handle rear axle text input change
   * - Parses user input
   * - Clamps to min/max range
   * - Formats to correct decimal places
   * - Reconstructs "front:rear" format
   */
  const handleRearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseAndClampValue(e.target.value, minValue, maxValue, decimalPlaces)
    onChange(`${front}:${parsed}`)
  }

  /**
   * Handle front axle slider change
   * - Formats to correct decimal places
   * - Reconstructs "front:rear" format
   */
  const handleFrontSliderChange = (values: number[]) => {
    const formatted = decimalPlaces > 0 ? values[0].toFixed(decimalPlaces) : values[0].toString()
    onChange(`${formatted}:${rear}`)
  }

  /**
   * Handle rear axle slider change
   * - Formats to correct decimal places
   * - Reconstructs "front:rear" format
   */
  const handleRearSliderChange = (values: number[]) => {
    const formatted = decimalPlaces > 0 ? values[0].toFixed(decimalPlaces) : values[0].toString()
    onChange(`${front}:${formatted}`)
  }

  // ============================================================
  // RENDER
  // ============================================================

  // Format center point label with appropriate decimal places
  const centerLabel = decimalPlaces > 0 ? centerPoint.toFixed(decimalPlaces) : centerPoint.toString()
  const minLabel = decimalPlaces > 0 ? minValue.toFixed(decimalPlaces) : minValue.toString()
  const maxLabel = decimalPlaces > 0 ? maxValue.toFixed(decimalPlaces) : maxValue.toString()

  return (
    // ============================================================
    // RESPONSIVE GRID LAYOUT
    // ============================================================
    // Mobile (grid-cols-1): Stacked vertically
    // Desktop (sm:grid-cols-2): Side-by-side
    // Gap (gap-4): 4 units between items
    // ============================================================
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* ============================================================
          FRONT AXLE INPUT
          ============================================================
          Label: "Front" (text-sm text-muted-foreground per design system)
          Input: Text input with unit suffix, min-h-[44px] for touch targets
          Slider: Centered slider with labels
          Layout: Column with space-y-2 spacing
      ============================================================ */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Front</Label>

        {/* Text Input with Unit Display */}
        <div className="flex items-center gap-2">
          <Input
            id={`slider-dual-front-${unit}`}
            type="text"
            inputMode="decimal"
            value={front}
            onChange={handleFrontInputChange}
            placeholder="Enter value..."
            disabled={disabled}
            className="min-h-[44px] w-full text-center transition-colors"
            aria-label={`Front setting value${unit ? ` in ${unit}` : ''}`}
          />
          {unit && (
            <span className="text-sm text-muted-foreground whitespace-nowrap min-w-fit">
              {unit}
            </span>
          )}
        </div>

        {/* Slider with Labels */}
        <div className="space-y-2">
          <Slider
            value={[frontNumeric]}
            min={minValue}
            max={maxValue}
            step={step}
            onValueChange={handleFrontSliderChange}
            disabled={disabled}
            className="w-full min-h-[44px]"
            aria-label={`Front setting slider`}
          />
          {/* Slider Labels - text-xs is acceptable for helper text per design system */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{minLabel}</span>
            <span>{centerLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          REAR AXLE INPUT
          ============================================================
          Label: "Rear" (text-sm text-muted-foreground per design system)
          Input: Text input with unit suffix, min-h-[44px] for touch targets
          Slider: Centered slider with labels
          Layout: Column with space-y-2 spacing
      ============================================================ */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Rear</Label>

        {/* Text Input with Unit Display */}
        <div className="flex items-center gap-2">
          <Input
            id={`slider-dual-rear-${unit}`}
            type="text"
            inputMode="decimal"
            value={rear}
            onChange={handleRearInputChange}
            placeholder="Enter value..."
            disabled={disabled}
            className="min-h-[44px] w-full text-center transition-colors"
            aria-label={`Rear setting value${unit ? ` in ${unit}` : ''}`}
          />
          {unit && (
            <span className="text-sm text-muted-foreground whitespace-nowrap min-w-fit">
              {unit}
            </span>
          )}
        </div>

        {/* Slider with Labels */}
        <div className="space-y-2">
          <Slider
            value={[rearNumeric]}
            min={minValue}
            max={maxValue}
            step={step}
            onValueChange={handleRearSliderChange}
            disabled={disabled}
            className="w-full min-h-[44px]"
            aria-label={`Rear setting slider`}
          />
          {/* Slider Labels - text-xs is acceptable for helper text per design system */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{minLabel}</span>
            <span>{centerLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
