/**
 * Toe Angle Input Component
 *
 * Purpose: Single toe angle input with bidirectional slider and dynamic icon
 * - Always-visible layout: Icon + text input + [− slider +]
 * - Dynamic icon: Changes based on value (ToeOutIcon → ToeStraightIcon → ToeInIcon)
 * - +/− buttons for precise single-step adjustment with hold-to-repeat
 *
 * **Data Model:**
 * - Storage: Signed float as string (e.g., "-0.300", "0.150", "0.000")
 * - Negative values: Toe Out (e.g., -0.300 displays as "0.300 Out")
 * - Positive values: Toe In (e.g., 0.150 displays as "0.150 In")
 * - Zero: Straight (displays as "0.000" with straight icon)
 *
 * **Slider Range:**
 * - Min: -0.500 (Toe Out)
 * - Max: +0.500 (Toe In)
 * - Center: 0.000 (Straight)
 * - Step: 0.01 for slider and button increments
 * - Text input accepts finer 0.001 precision
 * - Storage precision: 3 decimal places (toFixed(3))
 *
 * **+/− Button Behavior:**
 * - − moves toward Out (more negative), + moves toward In (more positive)
 * - Tap: Single 0.01 step immediately
 * - Hold: 400ms delay then repeats every 100ms
 * - − disabled at -0.500, + disabled at +0.500
 * - Integer-space math prevents floating point drift
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

import { useRef, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ToeInIcon, ToeOutIcon, ToeStraightIcon } from '@/components/icons/ToeIcons'

// ============================================================
// CONSTANTS
// ============================================================

const TOE_MIN = -0.5
const TOE_MAX = 0.5
const TOE_STEP = 0.01
const TOE_DECIMALS = 3  // Storage precision (toFixed(3))

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface ToeAngleInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  disabled?: boolean
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDirection(value: number): 'in' | 'out' | 'straight' {
  if (value > 0.0005) return 'in'
  if (value < -0.0005) return 'out'
  return 'straight'
}

function getToeIcon(direction: 'in' | 'out' | 'straight') {
  switch (direction) {
    case 'in': return ToeInIcon
    case 'out': return ToeOutIcon
    default: return ToeStraightIcon
  }
}

function formatDisplayValue(value: number): string {
  const abs = Math.abs(value).toFixed(TOE_DECIMALS)
  const direction = getDirection(value)
  if (direction === 'straight') return abs
  return `${abs} ${direction === 'in' ? 'In' : 'Out'}`
}

/**
 * Parse and validate direct text input
 * - Accepts decimal values with optional direction suffix
 * - Clamps to valid range (TOE_MIN to TOE_MAX)
 * - Handles "Out" suffix → negative, "In" suffix → positive
 */
function parseDirectInput(input: string): string {
  let cleaned = input.replace(/\s*(In|Out|IN|OUT)$/i, '')
  const isOut = /out/i.test(input)
  const isIn = /in/i.test(input) && !isOut

  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return '0.000'

  let val = parsed
  if (isOut) val = -Math.abs(parsed)
  else if (isIn) val = Math.abs(parsed)

  return Math.max(TOE_MIN, Math.min(TOE_MAX, val)).toFixed(TOE_DECIMALS)
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ToeAngleInput({ value, onChange, label, disabled = false }: ToeAngleInputProps) {
  // ============================================================
  // DERIVED VALUES
  // ============================================================
  const numericValue = parseFloat(value) || 0
  const direction = getDirection(numericValue)
  const IconComponent = getToeIcon(direction)
  const displayValue = formatDisplayValue(numericValue)

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
   * - Clamps to TOE_MIN/TOE_MAX
   * - Stores at 3 decimal places
   */
  const executeStep = useCallback((direction: 1 | -1) => {
    const current = parseFloat(valueRef.current) || 0
    // Integer-space math: multiply by 100, add direction, divide back
    const raw = Math.round(current * 100 + direction * TOE_STEP * 100) / 100
    const clamped = Math.max(TOE_MIN, Math.min(TOE_MAX, raw))
    onChange(clamped.toFixed(TOE_DECIMALS))
  }, [onChange])

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

  const handleSliderChange = (values: number[]) => {
    onChange(values[0].toFixed(TOE_DECIMALS))
  }

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseDirectInput(e.target.value))
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-2">
      {/* Input Row: Icon + Text Input */}
      <div className="flex items-center gap-2">
        <IconComponent
          size={24}
          className="shrink-0 text-foreground"
          aria-hidden="true"
        />
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

      {/* Slider Row: − Slider + */}
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || numericValue <= TOE_MIN}
            onMouseDown={() => startStep(-1)}
            onMouseUp={stopStep}
            onMouseLeave={stopStep}
            onTouchStart={() => startStep(-1)}
            onTouchEnd={stopStep}
            aria-label={`${label} toe Out — decrease`}
            className="min-h-[44px] px-2 shrink-0"
          >
            −
          </Button>
          <Slider
            value={[numericValue]}
            min={TOE_MIN}
            max={TOE_MAX}
            step={TOE_STEP}
            onValueChange={handleSliderChange}
            disabled={disabled}
            className="flex-1 min-h-[44px]"
            aria-label={`${label} toe angle slider`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || numericValue >= TOE_MAX}
            onMouseDown={() => startStep(1)}
            onMouseUp={stopStep}
            onMouseLeave={stopStep}
            onTouchStart={() => startStep(1)}
            onTouchEnd={stopStep}
            aria-label={`${label} toe In — increase`}
            className="min-h-[44px] px-2 shrink-0"
          >
            +
          </Button>
        </div>
        {/* Slider Labels */}
        <div className="flex justify-between text-xs text-muted-foreground px-7">
          <span>Out 0.500</span>
          <span>0.000</span>
          <span>In 0.500</span>
        </div>
      </div>
    </div>
  )
}
