/**
 * Gradient Slider Input Component
 *
 * Purpose: Interactive gradient bar that fills from left to right based on value
 * - Single interactive element (no separate text input or slider)
 * - Drag/click anywhere on the bar to adjust value
 * - Gradient fills from left edge based on percentage of max value
 * - Numeric value displays on top of gradient (e.g., "75%", "150kg")
 * - 0% = empty bar (no fill), 100% = full gradient fill
 *
 * **Data Model:**
 * - Storage format: String value (e.g., "75", "150")
 * - Value: Numeric value clamped to minValue-maxValue range
 * - Default: Empty string (interpreted as minValue)
 *
 * **Interaction:**
 * - Click anywhere on bar → Jump to that position
 * - Drag horizontally → Adjust value in real-time
 * - Touch support for mobile devices
 * - Calculates value from click/drag position as percentage of width
 *
 * **Gradient Style:**
 * - Light primary (60%) → Full saturation primary (100%)
 * - Extends from left edge based on value percentage
 * - Unfilled portion shows neutral track background
 * - Smooth 150ms transition on value changes
 *
 * **Value Display:**
 * - Power Restrictor: Shows "00%" format (zero-padded to 2 digits)
 * - Ballast: Shows "000kg" format (zero-padded to 3 digits, range 0-500)
 * - Others: Shows unit from setting.unit with appropriate padding
 *
 * **Design System Compliance:**
 * - min-h-[44px] for touch targets (WCAG)
 * - aria-label for screen readers
 * - text-sm for labels
 * - Responsive full-width layout
 *
 * **Props:**
 * - value: Numeric string (e.g., "75")
 * - onChange: Callback when value changes (signature: (value: string) => void)
 * - setting: TuningSetting object with minValue, maxValue, step, unit
 * - disabled: Optional, disables all interactions
 *
 * **Usage Example:**
 * <GradientSliderInput
 *   value="75"
 *   onChange={(newValue) => setSetting(setting.id, newValue)}
 *   setting={setting}
 * />
 *
 * **Related Files:**
 * - src/components/builds/BuildTuningTab.tsx: Parent component using this
 */

'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface TuningSetting {
  minValue?: number | null
  maxValue?: number | null
  step?: number | null
  unit?: string | null
}

interface GradientSliderInputProps {
  value: string | null
  onChange: (value: string) => void
  setting: TuningSetting
  disabled?: boolean
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * Gradient Slider Input Component
 *
 * Interactive gradient bar with value display
 * - Click/drag to adjust value
 * - Gradient fills left-to-right based on percentage
 * - Value overlays on top of gradient
 */
export function GradientSliderInput({
  value,
  onChange,
  setting,
  disabled = false
}: GradientSliderInputProps) {
  // ============================================================
  // CONFIGURATION FROM SETTING
  // ============================================================
  const minValue = setting.minValue ?? 0
  const maxValue = setting.maxValue ?? 100
  const step = setting.step ?? 1
  const unit = setting.unit

  // Parse numeric value (default to minValue if empty/invalid)
  const numericValue = parseFloat(value || '') || minValue

  // Calculate fill percentage (0-100%)
  const fillPercentage = ((numericValue - minValue) / (maxValue - minValue)) * 100

  // ============================================================
  // STATE FOR DRAGGING
  // ============================================================
  const [isDragging, setIsDragging] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // ============================================================
  // VALUE CALCULATION FROM POSITION
  // ============================================================

  /**
   * Calculate value from click/drag position
   * - Converts pixel position to percentage
   * - Converts percentage to actual value in range
   * - Clamps to min/max range
   * - Rounds to nearest step increment
   */
  const calculateValueFromPosition = useCallback((clientX: number): number => {
    if (!barRef.current) return minValue

    const rect = barRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))

    const rawValue = minValue + percentage * (maxValue - minValue)

    // Round to nearest step
    const steppedValue = Math.round(rawValue / step) * step

    // Clamp to range
    return Math.max(minValue, Math.min(maxValue, steppedValue))
  }, [minValue, maxValue, step])

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle mouse down / touch start
   * - Calculate value from click position
   * - Start dragging state
   */
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const newValue = calculateValueFromPosition(clientX)

    // Format as integer (no decimals for this input type)
    onChange(newValue.toString())

    setIsDragging(true)
  }

  /**
   * Handle mouse move (during drag)
   * - Only fires if isDragging is true
   * - Update value based on cursor position
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return

    const newValue = calculateValueFromPosition(e.clientX)
    onChange(newValue.toString())
  }, [isDragging, disabled, calculateValueFromPosition, onChange])

  /**
   * Handle touch move (during drag)
   * - Only fires if isDragging is true
   * - Update value based on touch position
   */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || disabled) return

    e.preventDefault() // Prevent scrolling while dragging
    const newValue = calculateValueFromPosition(e.touches[0].clientX)
    onChange(newValue.toString())
  }, [isDragging, disabled, calculateValueFromPosition, onChange])

  /**
   * Handle mouse up / touch end
   * - Stop dragging state
   */
  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // ============================================================
  // EFFECTS FOR DRAG LISTENERS
  // ============================================================
  // Add/remove window event listeners for dragging outside the component

  useEffect(() => {
    // Mouse events
    if (isDragging && !disabled) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handlePointerUp)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handlePointerUp)
      }
    }
  }, [isDragging, disabled, handleMouseMove, handlePointerUp])

  useEffect(() => {
    // Touch events
    if (isDragging && !disabled) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handlePointerUp)

      return () => {
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handlePointerUp)
      }
    }
  }, [isDragging, disabled, handleTouchMove, handlePointerUp])

  // ============================================================
  // FORMAT DISPLAY VALUE
  // ============================================================

  /**
   * Format value with zero-padding and unit
   * - Power Restrictor (%): "00%" to "100%" (2 digits)
   * - Ballast (kg): "000kg" to "500kg" (3 digits for 0-500 range)
   * - Others: Use appropriate padding based on maxValue
   */
  const formatDisplayValue = (): string => {
    // Determine padding based on maxValue
    const maxLength = Math.floor(Math.log10(maxValue)) + 1

    // Power Restrictor special case: always 2 digits for 0-100
    const digits = maxValue === 100 ? 2 : maxLength

    // Zero-pad the value
    const paddedValue = numericValue.toString().padStart(digits, '0')

    return `${paddedValue}${unit || ''}`
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-2">
      {/* ============================================================
          INTERACTIVE GRADIENT BAR
          ============================================================
          - Click/drag anywhere to adjust value
          - Gradient fills from left based on value percentage
          - Value displays fixed in center of bar
          - 0% = empty bar, 100% = full gradient fill
          - Matches Input component styling (border-input, bg-input/30, rounded-md)
      ============================================================ */}
      <div
        ref={barRef}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        className={`
          relative h-12 w-full rounded-md border overflow-hidden cursor-pointer
          min-h-[48px] touch-none select-none shadow-xs
          transition-[color,box-shadow] outline-none
          bg-transparent dark:bg-input/30 border-input
          ${disabled ? 'opacity-50 cursor-not-allowed disabled:pointer-events-none' : ''}
          ${isDragging ? 'border-ring' : ''}
          focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
        `}
        role="slider"
        aria-label={`Gradient slider${unit ? ` in ${unit}` : ''}`}
        aria-valuemin={minValue}
        aria-valuemax={maxValue}
        aria-valuenow={numericValue}
        aria-disabled={disabled}
      >
        {/* ============================================================
            VALUE TEXT - FIXED IN CENTER
            ============================================================
            - Always visible, centered in bar
            - Shows current value with zero-padding
        ============================================================ */}
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold text-foreground drop-shadow-md whitespace-nowrap z-10">
          {formatDisplayValue()}
        </span>

        {/* ============================================================
            GRADIENT FILL OVERLAY
            ============================================================
            - Extends from left edge based on value percentage
            - Gradient: Light primary (60% opacity) → Full primary (100% opacity)
            - Smooth transition on value changes
            - Behind the value text (z-index lower)
        ============================================================ */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/60 to-primary/80 transition-all duration-150 ease-out"
          style={{
            width: `${fillPercentage}%`,
          }}
        />
      </div>

      {/* ============================================================
          RANGE LABELS (min, max)
          ============================================================
          - Shows minimum and maximum values below bar
          - Smaller text for context
      ============================================================ */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{minValue}{unit}</span>
        <span>{maxValue}{unit}</span>
      </div>
    </div>
  )
}
