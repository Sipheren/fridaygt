/**
 * Single Slider Input Component
 *
 * Purpose: Single-value slider input with text input and +/− buttons
 * - Always-visible layout: Text input + Unit (outside) + [− Slider +]
 * - +/− buttons for precise single-step adjustment with hold-to-repeat
 * - Used for: Ballast (0–500kg) and similar single-value range settings
 *
 * **Data Model:**
 * - Storage format: String value (e.g., "150", "0", "500")
 * - Value: Numeric value clamped to minValue–maxValue range
 * - Default: Empty string (interpreted as minValue)
 *
 * **Slider Behavior:**
 * - Range: minValue to maxValue (from setting prop)
 * - Step: From setting.step for button increments
 * - sliderStep: Coarser step (~100 stops max) for slider draggability
 * - Values clamped to min/max range
 *
 * **+/− Button Behavior:**
 * - Tap: Single step increment/decrement immediately
 * - Hold: 400ms delay then repeats every 100ms
 * - − disabled at minValue, + disabled at maxValue
 * - Integer-space math prevents floating point drift
 *
 * **Unit Display:**
 * - Unit label displays OUTSIDE the text input (right side)
 * - e.g., input shows "150" with "kg" label beside it
 *
 * **Design System Compliance:**
 * - min-h-[44px] for all interactive elements (WCAG touch targets)
 * - transition-colors on interactive elements
 * - aria-label for screen readers with full context
 * - space-y-2 for form field spacing
 *
 * **Props:**
 * - value: Numeric string (e.g., "150")
 * - onChange: Callback when value changes (signature: (value: string) => void)
 * - setting: TuningSetting object with minValue, maxValue, step, unit
 * - disabled: Optional, disables all interactions
 *
 * **Related Files:**
 * - src/components/builds/BuildTuningTab.tsx: Parent component using this
 * - src/components/builds/BallastSliderInput.tsx: Similar single-slider pattern
 * - src/components/builds/SliderDualInput.tsx: +/− button pattern reference
 */

'use client'

import { useRef, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { DbTuningSetting } from '@/types/database'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type SliderSetting = Pick<DbTuningSetting, 'minValue' | 'maxValue' | 'step' | 'unit'>

interface SingleSliderInputProps {
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
 */
function getDecimalPlaces(step: number | null | undefined): number {
  if (!step || step >= 1) return 0
  const decimalStr = step.toString().split('.')[1]
  return decimalStr ? decimalStr.length : 0
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SingleSliderInput({
  value,
  onChange,
  setting,
  disabled = false,
}: SingleSliderInputProps) {
  // ============================================================
  // CONFIGURATION FROM SETTING
  // ============================================================
  const minValue = setting.minValue ?? 0
  const maxValue = setting.maxValue ?? 100
  const step = setting.step ?? 1
  const unit = setting.unit

  const decimalPlaces = getDecimalPlaces(step)

  // Coarser step for slider thumb (~100 stops max) — text input uses full precision
  const sliderStep = Math.max(step, (maxValue - minValue) / 100)

  const centerPoint = (minValue + maxValue) / 2

  // Parse numeric value (default to minValue if empty/invalid)
  const numericValue = parseFloat(value || '') || minValue

  // ============================================================
  // HOLD-TO-REPEAT REFS
  // ============================================================
  // valueRef tracks latest prop value so interval always reads current data
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ============================================================
  // STEP LOGIC
  // ============================================================

  /**
   * Execute a single step increment/decrement
   * - Integer-space math prevents floating point drift
   * - Clamps to minValue/maxValue
   */
  const executeStep = useCallback((direction: 1 | -1) => {
    const current = parseFloat(valueRef.current || '') || minValue
    const factor = Math.pow(10, decimalPlaces)
    const raw = Math.round(current * factor + direction * step * factor) / factor
    const clamped = Math.max(minValue, Math.min(maxValue, raw))
    onChange(decimalPlaces > 0 ? clamped.toFixed(decimalPlaces) : clamped.toString())
  }, [minValue, maxValue, step, decimalPlaces, onChange])

  /**
   * Stop any active hold-to-repeat
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
   * Start step with hold-to-repeat
   * - Fires immediately, then after 400ms starts repeating every 100ms
   */
  const startStep = useCallback((direction: 1 | -1) => {
    executeStep(direction)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        executeStep(direction)
      }, 100)
    }, 400)
  }, [executeStep])

  // Clean up on unmount
  useEffect(() => () => stopStep(), [stopStep])

  // ============================================================
  // SLIDER / INPUT HANDLERS
  // ============================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value)
    if (isNaN(parsed)) {
      onChange('')
      return
    }
    const clamped = Math.max(minValue, Math.min(maxValue, parsed))
    onChange(decimalPlaces > 0 ? clamped.toFixed(decimalPlaces) : clamped.toString())
  }

  const handleSliderChange = (values: number[]) => {
    onChange(decimalPlaces > 0 ? values[0].toFixed(decimalPlaces) : values[0].toString())
  }

  // ============================================================
  // RENDER
  // ============================================================

  const centerLabel = decimalPlaces > 0 ? centerPoint.toFixed(decimalPlaces) : centerPoint.toString()
  const minLabel = decimalPlaces > 0 ? minValue.toFixed(decimalPlaces) : minValue.toString()
  const maxLabel = decimalPlaces > 0 ? maxValue.toFixed(decimalPlaces) : maxValue.toString()

  return (
    <div className="space-y-2">
      {/* Text Input with Unit */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={value ?? ''}
          onChange={handleInputChange}
          placeholder={`${minValue}${unit ? ` ${unit}` : ''}`}
          disabled={disabled}
          className="min-h-[44px] w-full text-center transition-colors"
          aria-label={`Value${unit ? ` in ${unit}` : ''}`}
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
            disabled={disabled || numericValue <= minValue}
            onMouseDown={() => startStep(-1)}
            onMouseUp={stopStep}
            onMouseLeave={stopStep}
            onTouchStart={() => startStep(-1)}
            onTouchEnd={stopStep}
            aria-label="Decrease value"
            className="min-h-[44px] px-2 shrink-0"
          >
            −
          </Button>
          <Slider
            value={[numericValue]}
            min={minValue}
            max={maxValue}
            step={sliderStep}
            onValueChange={handleSliderChange}
            disabled={disabled}
            className="flex-1 min-h-[44px]"
            aria-label={`Value slider${unit ? ` in ${unit}` : ''}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || numericValue >= maxValue}
            onMouseDown={() => startStep(1)}
            onMouseUp={stopStep}
            onMouseLeave={stopStep}
            onTouchStart={() => startStep(1)}
            onTouchEnd={stopStep}
            aria-label="Increase value"
            className="min-h-[44px] px-2 shrink-0"
          >
            +
          </Button>
        </div>
        {/* Slider Labels */}
        <div className="flex justify-between text-xs text-muted-foreground px-7">
          <span>{minLabel}{unit}</span>
          <span>{centerLabel}{unit}</span>
          <span>{maxLabel}{unit}</span>
        </div>
      </div>
    </div>
  )
}
