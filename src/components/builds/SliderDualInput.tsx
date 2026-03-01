/**
 * Slider Dual Input Component
 *
 * Purpose: Front/Rear dual input with always-visible centered sliders
 * - Manages "front:rear" value format (e.g., "1.500:2.000")
 * - Displays optional unit/degree symbols next to values
 * - Provides sliders for visual adjustment underneath each input
 * - +/− buttons for precise single-step adjustment with hold-to-repeat
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
 * - sliderStep: Coarser step for slider thumb (~100 stops max) for draggability
 * - Center Point: Calculated as (minValue + maxValue) / 2
 * - Clamping: Values automatically clamped to min/max range
 *
 * **+/− Button Behavior:**
 * - Tap: Single step increment/decrement immediately
 * - Hold: 400ms delay then repeats every 100ms (hold-to-repeat)
 * - Disabled: − at minValue, + at maxValue
 * - Float-safe: Uses integer-space math to avoid 0.01+0.01 drift
 * - valueRef: Always reads latest prop value in interval to avoid stale closures
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
 * - Each axle: Label + Text Input + Unit Span + [− Slider +] + Labels
 *
 * **Design System Compliance:**
 * - Uses shadcn Label and Button components
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
 * **Related Files:**
 * - src/components/builds/BuildTuningTab.tsx: Parent component using this
 * - src/components/builds/ToeAngleDualInput.tsx: Similar pattern (bidirectional)
 * - src/app/api/tuning-settings/route.ts: Fetches setting metadata
 */

'use client'

import { useRef, useCallback, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

  if (minValue !== null && minValue !== undefined && clamped < minValue) {
    clamped = minValue
  }
  if (maxValue !== null && maxValue !== undefined && clamped > maxValue) {
    clamped = maxValue
  }

  return decimalPlaces > 0 ? clamped.toFixed(decimalPlaces) : clamped.toString()
}

// ============================================================
// MAIN COMPONENT
// ============================================================

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

  const decimalPlaces = getDecimalPlaces(step)

  // Coarser step for slider thumb (~100 stops max) — text input still uses full precision
  const sliderStep = Math.max(step, (maxValue - minValue) / 100)

  const centerPoint = (minValue + maxValue) / 2

  // ============================================================
  // VALUE PARSING
  // ============================================================
  const [front = '', rear = ''] = (value || '').split(':')

  const frontNumeric = parseFloat(front) || minValue
  const rearNumeric = parseFloat(rear) || minValue

  // ============================================================
  // HOLD-TO-REPEAT REFS
  // ============================================================
  // valueRef: Always holds the latest prop value so interval callbacks
  // read current data instead of the stale closure from mousedown time
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ============================================================
  // STEP LOGIC
  // ============================================================

  /**
   * Execute a single step increment/decrement
   * - Reads latest value from valueRef (not stale closure)
   * - Integer-space math prevents floating point drift (0.01+0.01 errors)
   * - Clamps result to min/max before formatting
   */
  const executeStep = useCallback((direction: 1 | -1, axis: 'front' | 'rear') => {
    const [latestFront = '', latestRear = ''] = (valueRef.current || '').split(':')
    const currentStr = axis === 'front' ? latestFront : latestRear
    const current = parseFloat(currentStr)
    const base = isNaN(current) ? minValue : current

    // Integer-space math to avoid floating point drift
    const factor = Math.pow(10, decimalPlaces)
    const raw = Math.round(base * factor + direction * step * factor) / factor
    const clamped = Math.max(minValue, Math.min(maxValue, raw))
    const formatted = decimalPlaces > 0 ? clamped.toFixed(decimalPlaces) : clamped.toString()

    if (axis === 'front') {
      onChange(`${formatted}:${latestRear}`)
    } else {
      onChange(`${latestFront}:${formatted}`)
    }
  }, [minValue, maxValue, step, decimalPlaces, onChange])

  /**
   * Stop any active hold-to-repeat (clears both timeout and interval)
   * Called on mouseup, mouseleave, touchend
   */
  const stopStep = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  /**
   * Start a step with hold-to-repeat behaviour
   * - Fires immediately on press
   * - After 400ms delay begins repeating every 100ms
   */
  const startStep = useCallback((direction: 1 | -1, axis: 'front' | 'rear') => {
    executeStep(direction, axis)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        executeStep(direction, axis)
      }, 100)
    }, 400)
  }, [executeStep])

  // Clean up on unmount to prevent memory leaks
  useEffect(() => () => stopStep(), [stopStep])

  // ============================================================
  // SLIDER / INPUT HANDLERS
  // ============================================================

  const handleFrontInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseAndClampValue(e.target.value, minValue, maxValue, decimalPlaces)
    onChange(`${parsed}:${rear}`)
  }

  const handleRearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseAndClampValue(e.target.value, minValue, maxValue, decimalPlaces)
    onChange(`${front}:${parsed}`)
  }

  const handleFrontSliderChange = (values: number[]) => {
    const formatted = decimalPlaces > 0 ? values[0].toFixed(decimalPlaces) : values[0].toString()
    onChange(`${formatted}:${rear}`)
  }

  const handleRearSliderChange = (values: number[]) => {
    const formatted = decimalPlaces > 0 ? values[0].toFixed(decimalPlaces) : values[0].toString()
    onChange(`${front}:${formatted}`)
  }

  // ============================================================
  // RENDER
  // ============================================================

  const centerLabel = decimalPlaces > 0 ? centerPoint.toFixed(decimalPlaces) : centerPoint.toString()
  const minLabel = decimalPlaces > 0 ? minValue.toFixed(decimalPlaces) : minValue.toString()
  const maxLabel = decimalPlaces > 0 ? maxValue.toFixed(decimalPlaces) : maxValue.toString()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* FRONT AXLE */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Front</Label>

        {/* Text Input with Unit */}
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

        {/* Slider row with +/− buttons */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || frontNumeric <= minValue}
              onMouseDown={() => startStep(-1, 'front')}
              onMouseUp={stopStep}
              onMouseLeave={stopStep}
              onTouchStart={() => startStep(-1, 'front')}
              onTouchEnd={stopStep}
              aria-label="Decrease front value"
              className="min-h-[44px] px-2 shrink-0"
            >
              −
            </Button>
            <Slider
              value={[frontNumeric]}
              min={minValue}
              max={maxValue}
              step={sliderStep}
              onValueChange={handleFrontSliderChange}
              disabled={disabled}
              className="flex-1 min-h-[44px]"
              aria-label="Front setting slider"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || frontNumeric >= maxValue}
              onMouseDown={() => startStep(1, 'front')}
              onMouseUp={stopStep}
              onMouseLeave={stopStep}
              onTouchStart={() => startStep(1, 'front')}
              onTouchEnd={stopStep}
              aria-label="Increase front value"
              className="min-h-[44px] px-2 shrink-0"
            >
              +
            </Button>
          </div>
          {/* Slider Labels */}
          <div className="flex justify-between text-xs text-muted-foreground px-7">
            <span>{minLabel}</span>
            <span>{centerLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      </div>

      {/* REAR AXLE */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Rear</Label>

        {/* Text Input with Unit */}
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

        {/* Slider row with +/− buttons */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || rearNumeric <= minValue}
              onMouseDown={() => startStep(-1, 'rear')}
              onMouseUp={stopStep}
              onMouseLeave={stopStep}
              onTouchStart={() => startStep(-1, 'rear')}
              onTouchEnd={stopStep}
              aria-label="Decrease rear value"
              className="min-h-[44px] px-2 shrink-0"
            >
              −
            </Button>
            <Slider
              value={[rearNumeric]}
              min={minValue}
              max={maxValue}
              step={sliderStep}
              onValueChange={handleRearSliderChange}
              disabled={disabled}
              className="flex-1 min-h-[44px]"
              aria-label="Rear setting slider"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || rearNumeric >= maxValue}
              onMouseDown={() => startStep(1, 'rear')}
              onMouseUp={stopStep}
              onMouseLeave={stopStep}
              onTouchStart={() => startStep(1, 'rear')}
              onTouchEnd={stopStep}
              aria-label="Increase rear value"
              className="min-h-[44px] px-2 shrink-0"
            >
              +
            </Button>
          </div>
          {/* Slider Labels */}
          <div className="flex justify-between text-xs text-muted-foreground px-7">
            <span>{minLabel}</span>
            <span>{centerLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
