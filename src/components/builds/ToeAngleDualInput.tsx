/**
 * Toe Angle Dual Input Component
 *
 * Purpose: Front/Rear wrapper for ToeAngleInput components
 * - Wraps two ToeAngleInput components for front and rear axles
 * - Manages "front:rear" value format (e.g., "-0.300:0.150")
 * - Responsive layout: stacked on mobile, side-by-side on desktop
 *
 * **Data Model:**
 * - Storage format: "front:rear" string (e.g., "-0.300:0.150")
 * - Front value: Signed float (negative = Out, positive = In)
 * - Rear value: Signed float (negative = Out, positive = In)
 * - Default: "0.000:0.000" (both straight)
 *
 * **Value Parsing:**
 * - Splits on colon to extract front/rear values
 * - Defaults to "0.000" if missing or empty
 * - Reconstructs on change: "${newFront}:${rear}" or "${front}:${newRear}"
 *
 * **Layout:**
 * - Mobile (grid-cols-1): Stacked vertically (Front above Rear)
 * - Desktop (sm:grid-cols-2): Side-by-side with gap-4
 * - Each axle: Label + ToeAngleInput component
 *
 * **Design System Compliance:**
 * - Uses shadcn Label component (not raw <span>)
 * - text-sm for labels (not text-xs per design system)
 * - space-y-2 for form field spacing
 * - gap-4 for responsive grid gaps
 * - Responsive breakpoint at sm (640px)
 *
 * **Props:**
 * - value: "front:rear" string (e.g., "-0.300:0.150")
 * - onChange: Callback when value changes (signature: (value: string) => void)
 *
 * **Usage Example:**
 * <ToeAngleDualInput
 *   value="-0.300:0.150"
 *   onChange={(newValue) => setToeAngle(newValue)}
 * />
 *
 * **Related Files:**
 * - src/components/builds/ToeAngleInput.tsx: Single input component used here
 * - src/components/builds/BuildTuningTab.tsx: Parent component using this wrapper
 * - src/app/builds/[id]/page.tsx: Displays formatted toe angle values
 */

'use client'

import { Label } from '@/components/ui/label'
import { ToeAngleInput } from './ToeAngleInput'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * Props for ToeAngleDualInput component
 * - value: "front:rear" string format (e.g., "-0.300:0.150")
 * - onChange: Callback when value changes
 */
interface ToeAngleDualInputProps {
  value: string
  onChange: (value: string) => void
}

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * Toe Angle Dual Input Component
 *
 * Wraps two ToeAngleInput components for front and rear axles
 * - Manages "front:rear" value format
 * - Responsive layout: stacked (mobile) / side-by-side (desktop)
 *
 * Value Parsing:
 * - Splits value on colon: value.split(':')
 * - Defaults to "0.000" if front or rear is missing
 * - Reconstructs on individual axle change
 *
 * Layout:
 * - Grid: 1 column on mobile, 2 columns on sm+ (640px)
 * - Gap: 4 units between grid items
 * - Each axle: Label (text-sm) + ToeAngleInput
 */
export function ToeAngleDualInput({ value, onChange }: ToeAngleDualInputProps) {
  // ============================================================
  // VALUE PARSING
  // ============================================================
  // Parse "front:rear" format
  // Defaults to "0.000" if either value is missing/empty
  const [front = '0.000', rear = '0.000'] = value.split(':')

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle front axle value change
   * - Reconstructs "front:rear" format with new front value
   * - Preserves existing rear value
   */
  const handleFrontChange = (newFront: string) => {
    onChange(`${newFront}:${rear}`)
  }

  /**
   * Handle rear axle value change
   * - Reconstructs "front:rear" format with new rear value
   * - Preserves existing front value
   */
  const handleRearChange = (newRear: string) => {
    onChange(`${front}:${newRear}`)
  }

  // ============================================================
  // RENDER
  // ============================================================

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
          Component: ToeAngleInput with front value
          Layout: Column with space-y-2 spacing
      ============================================================ */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Front</Label>
        <ToeAngleInput
          value={front}
          onChange={handleFrontChange}
          label="Front"
        />
      </div>

      {/* ============================================================
          REAR AXLE INPUT
          ============================================================
          Label: "Rear" (text-sm text-muted-foreground per design system)
          Component: ToeAngleInput with rear value
          Layout: Column with space-y-2 spacing
      ============================================================ */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Rear</Label>
        <ToeAngleInput
          value={rear}
          onChange={handleRearChange}
          label="Rear"
        />
      </div>
    </div>
  )
}
