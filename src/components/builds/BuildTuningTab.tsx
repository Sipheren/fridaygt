/**
 * Build Tuning Tab Component
 *
 * Purpose: Tuning settings editor with dynamic input types and section-based navigation
 * - Renders tuning settings grouped by section (Brakes, Suspension, Transmission, etc.)
 * - Supports multiple input types: select, dual (front:rear), number, decimal, ratio, text
 * - Transmission section: Special handling for gear ratios (1-6+ gears, Final Drive)
 * - Responsive design: Mobile dropdown, desktop sidebar for section navigation
 *
 * **Key Features:**
 * - Dynamic input rendering based on setting.inputType field
 * - Section-based navigation with active state highlighting
 * - Gear management: Add/remove gears beyond the default 6, max 20 gears
 * - Memoized helpers: ordinal suffix, active section, filtered settings
 * - Parallel API calls: Fetch sections and settings simultaneously
 *
 * **Input Types:**
 * - **select**: Dropdown with predefined options (e.g., ECU Map options)
 * - **dual**: Front/Rear split inputs (e.g., Spring Rate: "120:120")
 * - **number/decimal**: Numeric input with unit label (e.g., "4.5 °")
 * - **ratio**: Front:Rear ratio format with colon separator (e.g., "50:50")
 * - **text**: Default text input for untyped settings
 *
 * **Transmission Section Special Handling:**
 * - Gears 1-6 are always shown
 * - Gears 7-20 can be added via "Add Gear" button
 * - Gears >6 have "Remove" button
 * - Final Drive rendered at bottom (separate from gears)
 * - Other Transmission settings (like Final Drive) shown via filtered settings
 *
 * **Responsive Design:**
 * - Mobile: Section dropdown selector (full width)
 * - Desktop: Vertical sidebar tabs (w-64 fixed width)
 * - Min-height 44px for all interactive elements (touch targets)
 *
 * **Props:**
 * - tuningSettings: Record of settingId -> value
 * - onSettingChange: Callback when setting value changes
 * - gears: Record of gearKey -> value (gear1, gear2, ..., finalDrive)
 * - onGearChange: Callback when gear value changes
 * - visibleGearCount: Number of gears to render (1-20)
 *
 * **State:**
 * - sections: Array of tuning sections (ordered by displayOrder)
 * - settings: Array of all tuning settings
 * - activeSection: Currently selected section name
 * - loading/error: API call status
 *
 * **Performance Optimizations:**
 * - useMemo for activeSectionObj (avoid repeated find() calls)
 * - useMemo for activeSectionSettings (avoid re-filtering on renders)
 * - useCallback for getOrdinalSuffix (stable function reference)
 * - Parallel API calls with Promise.all (faster data fetching)
 *
 * **Debugging Tips:**
 * - Settings not showing: Check setting.inputType matches renderSettingInput cases
 * - Gears not saving: Verify parent component passes correct onGearChange callback
 * - Section navigation broken: Check activeSection state updates on click
 * - Empty sections: Verify settings have correct sectionId foreign key
 * - Gear count wrong: Check visibleGearCount prop from parent
 *
 * **Common Issues:**
 * - Gear inputs not rendering: Verify activeSection === 'Transmission' condition
 * - Front:rear parsing broken: Check currentValue.split(':') handles empty values
 * - Settings not persisting: Ensure parent collects tuningSettings on form submit
 * - Mobile dropdown not working: Verify Select component from shadcn/ui
 *
 * **Related Files:**
 * - @/lib/dropdown-helpers.ts: formatCarOptions, formatTrackOptions (similar pattern)
 * - /api/tuning-settings/route.ts: Fetch all active settings
 * - /api/tuning-settings/sections/route.ts: Fetch all active sections
 * - src/components/builds/BuildSelector.tsx: Parent component using this tab
 * - src/types/database.ts: DbTuningSetting, DbTuningSection type definitions
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Loader2, Plus, RotateCcw, X } from 'lucide-react'
import { ToeAngleDualInput } from '@/components/builds/ToeAngleDualInput'
import { SliderDualInput } from '@/components/builds/SliderDualInput'
import { GradientSliderInput } from '@/components/builds/GradientSliderInput'
import { BallastSliderInput } from '@/components/builds/BallastSliderInput'

// ============================================================
// TYPE DEFINITIONS
// ============================================================
// Local types for tuning data structures
// These match database schema but are locally defined for component usage

interface TuningSection {
  id: string
  name: string
  displayOrder: number
}

interface TuningSetting {
  id: string
  sectionId: string
  name: string
  description?: string
  defaultValue?: string
  displayValue?: string
  displayOrder?: number | null
  isActive: boolean
  inputType?: string
  decimalPlaces?: number | null
  minValue?: number | null
  maxValue?: number | null
  step?: number | null
  unit?: string | null
  options?: string[] | null
  section: TuningSection
}

interface CustomGear {
  name: string
  value: string
}

interface BuildTuningTabProps {
  tuningSettings: Record<string, string>
  onSettingChange: (settingId: string, value: string) => void
  onSettingDelete?: (settingId: string) => void
  // Gear props (gears are now direct build fields, not settings)
  gears: Record<string, string>
  onGearChange: (gearKey: string, value: string) => void
  onAddGear: () => void
  onRemoveGear: (gearNumber: number) => void
  visibleGearCount: number
  // Original values for reset functionality
  originalTuningSettings: Record<string, string>
  originalGears: Record<string, string>
}

// ============================================================
// DYNAMIC INPUT RENDERER
// ============================================================
// Renders appropriate input component based on setting.inputType
// Supports: select, dual, number, decimal, ratio, text
//
// Why Dynamic Rendering?
// - Database-driven: inputType determines UI component
// - Flexible: Add new input types without code changes
// - Consistent: All settings use same onChange callback signature
//
// Input Type Logic:
// - select: Dropdown with predefined options (setting.options array)
// - dual: Front:Rear split (currentValue parsed as "front:rear")
// - number/decimal: Numeric input with unit label
// - ratio: Front:Rear ratio with colon separator (centered inputs)
// - text: Default fallback for untyped settings
//
// Common Pattern:
// - Parse currentValue (for dual/ratio types)
// - Render Input/Select with onChange callback
// - Update with formatted value (e.g., "${front}:${rear}")
//
// Debugging Tips:
// - Input not rendering: Check setting.inputType matches case condition
// - Split not working: Verify currentValue format matches "value:value" pattern
// - Options empty: Check setting.options array has data
// ============================================================

/**
 * Render appropriate input component based on setting's inputType
 *
 * @param setting - TuningSetting object with inputType configuration
 * @param currentValue - Current value of the setting (may be empty string)
 * @param onChange - Callback when value changes (signature: (value: string) => void)
 * @returns React Element with appropriate input component
 *
 * **Input Types Supported:**
 * - **select**: Dropdown with options from setting.options array
 * - **dual**: Two inputs for front:rear split (e.g., spring rates)
 * - **number/decimal**: Single numeric input with optional unit label
 * - **ratio**: Two inputs with colon separator (e.g., torque distribution)
 * - **text**: Default text input (fallback)
 *
 * **Value Parsing:**
 * - dual/ratio: Parse "front:rear" format, reconstruct on change
 * - select: Use displayValue as fallback if currentValue empty
 * - All types: onChange receives string value (formatted appropriately)
 */
function renderSettingInput(
  setting: TuningSetting,
  currentValue: string,
  onChange: (value: string) => void
) {
  const inputType = setting.inputType || 'text'

  // SELECT dropdown
  // Used for: ECU maps, differential types, etc.
  // Options: Predefined in setting.options array
  // Fallback: displayValue used if currentValue is empty
  if (inputType === 'select' && setting.options && setting.options.length > 0) {
    return (
      <Select
        value={currentValue || setting.displayValue || setting.options[0]}
        onValueChange={onChange}
      >
        <SelectTrigger className="min-h-[44px] w-full">
          <SelectValue placeholder="Select option..." />
        </SelectTrigger>
        <SelectContent>
          {setting.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // DUAL input (front:rear split for suspension settings)
  // Used for: Spring Rate, Damper, etc.
  // Format: "front:rear" (e.g., "120:120")
  // Parsing: Split by colon, default to empty string if missing
  // Reconstruction: "${newFront}:${rear}" or "${front}:${newRear}"
  if (inputType === 'dual') {
    // Parse current value as "front:rear"
    const [front = '', rear = ''] = currentValue.split(':')

    return (
      <div className="flex items-center gap-2">
        <Input
          id={`${setting.id}-front`}
          type="text"
          inputMode="decimal"
          value={front}
          onChange={(e) => onChange(`${e.target.value}:${rear}`)}
          placeholder="Front"
          className="min-h-[44px] flex-1"
        />
        <Input
          id={`${setting.id}-rear`}
          type="text"
          inputMode="decimal"
          value={rear}
          onChange={(e) => onChange(`${front}:${e.target.value}`)}
          placeholder="Rear"
          className="min-h-[44px] flex-1"
        />
      </div>
    )
  }

  // NUMBER or DECIMAL
  // Used for: Brake Balance, Ride Height, etc.
  // Format: Single numeric value (string)
  // Unit: Optional label shown after input (e.g., "°", "kg")
  if (inputType === 'number' || inputType === 'decimal') {
    return (
      <div className="flex items-center gap-2">
        <Input
          id={setting.id}
          type="text"
          inputMode="decimal"
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter value..."
          className="min-h-[44px] w-full"
        />
        {setting.unit && (
          <span className="text-sm text-muted-foreground whitespace-nowrap min-w-fit">
            {setting.unit}
          </span>
        )}
      </div>
    )
  }

  // RATIO format (e.g., "0:100" for Front/Rear Torque Distribution)
  // Used for: Torque Split, Brake Balance, etc.
  // Format: "front:rear" (e.g., "50:50")
  // Visual: Colon separator between centered inputs
  // Parsing: Same as dual, but inputs are center-aligned
  if (inputType === 'ratio') {
    // Parse current value as "front:rear"
    const [front = '', rear = ''] = currentValue.split(':')

    return (
      <div className="flex items-center gap-2">
        <Input
          id={`${setting.id}-front`}
          type="text"
          inputMode="numeric"
          value={front}
          onChange={(e) => onChange(`${e.target.value}:${rear}`)}
          placeholder="Front"
          className="min-h-[44px] flex-1 text-center"
        />
        <span className="text-muted-foreground font-medium">:</span>
        <Input
          id={`${setting.id}-rear`}
          type="text"
          inputMode="numeric"
          value={rear}
          onChange={(e) => onChange(`${front}:${e.target.value}`)}
          placeholder="Rear"
          className="min-h-[44px] flex-1 text-center"
        />
      </div>
    )
  }

  // TOE ANGLE input (bidirectional slider with icons)
  // Used for: Toe Angle setting (Suspension section)
  // Format: "front:rear" signed values (negative=out, positive=in)
  // Display: Icon changes dynamically (ToeOutIcon → ToeStraightIcon → ToeInIcon)
  // Range: -5.000 (Out) to +5.000 (In), center at 0.000 (Straight)
  if (inputType === 'toeAngle') {
    return (
      <ToeAngleDualInput
        value={currentValue || '0.000:0.000'}
        onChange={onChange}
      />
    )
  }

  // SLIDER DUAL input (centered sliders for suspension settings)
  // Used for: Negative Camber, Natural Frequency, Damping, Anti-Roll Bar
  // Format: "front:rear" values (e.g., "1.500:2.000")
  // Display: Text input + Unit (outside input) + slider underneath
  // Range: minValue to maxValue from setting prop, center calculated as (min+max)/2
  if (inputType === 'sliderDual') {
    return (
      <SliderDualInput
        value={currentValue || ''}
        onChange={onChange}
        setting={setting}
      />
    )
  }

  // BALLAST SLIDER input (bidirectional single slider for Ballast Positioning)
  // Used for: Ballast Positioning (Performance Adjustment section)
  // Format: Single signed value (e.g., "-25", "0", "+25")
  // Display: Text input with dynamic label (Front/Center/Rear) + slider underneath
  // Range: -50 (Full Front) to +50 (Full Rear), 0 at Center
  if (inputType === 'ballastSlider') {
    return (
      <BallastSliderInput
        value={currentValue || '0'}
        onChange={onChange}
        setting={setting}
      />
    )
  }

  // GRADIENT SLIDER input (single value with gradient fill slider)
  // Used for: Power Restrictor, Ballast
  // Format: Single numeric value (e.g., "75", "150")
  // Display: Text input + Unit (outside input) + gradient fill slider underneath
  // Range: minValue to maxValue from setting prop, center calculated as (min+max)/2
  // Gradient: Light primary (60%) → Full primary (100%) - uniform across all instances
  if (inputType === 'gradientSlider') {
    return (
      <GradientSliderInput
        value={currentValue || ''}
        onChange={onChange}
        setting={setting}
      />
    )
  }

  // Default TEXT input
  // Fallback for settings without specific inputType
  // Used for: Generic text settings, custom values
  // Validation: Parent component should validate on submit
  return (
    <Input
      id={setting.id}
      type="text"
      value={currentValue}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
      className="min-h-[44px] w-full"
    />
  )
}

// ============================================================
// MAIN COMPONENT - BuildTuningTab
// ============================================================
// Tuning settings editor with section-based navigation
// Fetches sections/settings on mount, renders active section's settings
//
// Component Flow:
// 1. Mount: Fetch sections and settings via parallel API calls
// 2. Render: Show loading spinner until data loads
// 3. Display: Render section navigation (sidebar/dropdown) + active settings
// 4. Interact: User changes section or updates setting values
// 5. Callback: Notify parent via onSettingChange/onGearChange
//
// Data Fetching Strategy:
// - Parallel calls: Promise.all for sections + settings (faster than sequential)
// - One-time fetch: useEffect with empty deps (no refetch on re-renders)
// - Error handling: Try-catch with error state display
//
// State Management:
// - sections: Array of all tuning sections (for navigation)
// - settings: Array of all tuning settings (for filtering)
// - activeSection: Name of currently selected section
// - loading/error: API call status
//
// Special Case: Transmission Section
// - Gears 1-6 (or more) rendered from props.gears
// - Gears 7+ have "Remove" button
// - Final Drive rendered at bottom
// - Other settings filtered (only show Final Drive from API)
// ============================================================

export function BuildTuningTab({
  tuningSettings,
  onSettingChange,
  onSettingDelete,
  gears,
  onGearChange,
  onAddGear,
  onRemoveGear,
  visibleGearCount,
  originalTuningSettings,
  originalGears,
}: BuildTuningTabProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  // sections: Array of tuning sections (e.g., Brakes, Suspension, Transmission)
  // settings: Array of all tuning settings (filtered by active section)
  // activeSection: Name of currently selected section (string)
  // loading: API call in progress
  // error: Error message if API call fails

  const [sections, setSections] = useState<TuningSection[]>([])
  const [settings, setSettings] = useState<TuningSetting[]>([])
  const [activeSection, setActiveSection] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================
  // DATA FETCHING - Sections and Settings
  // ============================================================
  // Fetch tuning sections and settings on component mount
  // Parallel API calls with Promise.all for performance
  // Sets first section as active by default
  //
  // Why Parallel Calls?
  // - Sections and settings are independent
  // - Promise.all fetches both simultaneously
  // - Reduces total load time vs sequential calls
  //
  // Why Empty Deps Array?
  // - Only fetch once on mount
  // - Sections/settings don't change during component lifecycle
  // - Prevents unnecessary re-fetches on re-renders
  //
  // Error Handling:
  // - Try-catch wraps API calls
  // - Error state displayed to user
  // - Loading state cleared in finally block
  //
  // Debugging Tips:
  // - Empty sections: Check /api/tuning-settings/sections response
  // - Empty settings: Check /api/tuning-settings response
  // - Error shown: Check browser console for network errors
  // - Active section not set: Verify sectionsData.sections.length > 0
  // ============================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Parallel API calls: Fetch sections and settings simultaneously
        // DEV: nocache=true bypasses 1-hour cache during development
        const [sectionsRes, settingsRes] = await Promise.all([
          fetch('/api/tuning-settings/sections?nocache=true'),
          fetch('/api/tuning-settings?nocache=true')
        ])

        if (!sectionsRes.ok) throw new Error('Failed to fetch sections')
        if (!settingsRes.ok) throw new Error('Failed to fetch settings')

        const sectionsData = await sectionsRes.json()
        const settingsData = await settingsRes.json()

        setSections(sectionsData.sections)
        setSettings(settingsData.settings)

        // Set first section as active if none selected
        // Default to first section in displayOrder
        if (sectionsData.sections.length > 0) {
          setActiveSection(sectionsData.sections[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tuning data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Only fetch once on mount

  // ============================================================
  // MEMOIZED HELPERS
  // ============================================================
  // Performance optimizations to avoid recalculations on every render
  // - useCallback for getOrdinalSuffix (stable function reference)
  // - useMemo for activeSectionObj (avoid repeated find() calls)
  // - useMemo for activeSectionSettings (avoid re-filtering on renders)

  /**
   * Get ordinal suffix for gear numbers (1st, 2nd, 3rd, 4th, etc.)
   * Memoized with useCallback to avoid recreating function on every render
   *
   * Algorithm:
   * - Handle special cases: 11, 12, 13 → "th" (not "st", "nd", "rd")
   * - Last digit 1 → "st" (except 11)
   * - Last digit 2 → "nd" (except 12)
   * - Last digit 3 → "rd" (except 13)
   * - All others → "th"
   *
   * Examples:
   * - 1 → "1st", 2 → "2nd", 3 → "3rd"
   * - 4 → "4th", 11 → "11th", 21 → "21st"
   *
   * @param n - Number to get suffix for
   * @returns Ordinal suffix string ("st", "nd", "rd", "th")
   */
  const getOrdinalSuffix = useCallback((n: number): string => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }, [])

  /**
   * Get active section object from sections array
   * Memoized to avoid repeated find() calls on every render
   *
   * Why Memoize?
   * - find() runs on every render without useMemo
   * - sections reference only changes on data fetch (rare)
   * - activeSection only changes when user clicks nav
   * - Avoids unnecessary object creation
   *
   * Returns:
   * - TuningSection object if found
   * - undefined if activeSection doesn't match any section
   */
  const activeSectionObj = useMemo(
    () => sections.find((s) => s.name === activeSection),
    [sections, activeSection]
  )

  /**
   * Get settings for active section (with special handling for Transmission)
   * Memoized to avoid re-filtering settings array on every render
   *
   * Transmission Special Case:
   * - Only show "Final Drive" setting from API
   * - Gears 1-N handled separately via props.gears
   * - Prevents duplicate gear inputs
   *
   * Why Memoize?
   * - filter() runs on every render without useMemo
   * - settings reference only changes on data fetch (rare)
   * - activeSectionObj only changes when user clicks nav
   * - Active section name check avoids recalculating isTransmission
   *
   * Returns:
   * - Array of TuningSetting objects for active section
   * - Empty array if no settings match active section
   */
  const activeSectionSettings = useMemo(() => {
    let filtered = settings.filter((s) => s.sectionId === activeSectionObj?.id)

    // For Transmission: only show Final Drive (gears are handled separately via props)
    // Gears 1-6 (or more) are rendered from props.gears object
    // Final Drive is the only Transmission setting shown from API
    const isTransmission = activeSection === 'Transmission'
    if (isTransmission) {
      filtered = filtered.filter(s => s.name === 'Final Drive')
    }

    return filtered
  }, [settings, activeSectionObj, activeSection])

  // ============================================================
  // RESET/CLEAR HANDLERS
  // ============================================================

  /**
   * Reset single setting to original value from database
   * @param settingId - ID of setting to reset
   */
  const handleResetSetting = (settingId: string) => {
    const originalValue = originalTuningSettings[settingId]
    onSettingChange(settingId, originalValue)
  }

  /**
   * Clear single setting (set to empty string)
   * @param settingId - ID of setting to clear
   */
  const handleClearSetting = (settingId: string) => {
    onSettingChange(settingId, '')
  }

  /**
   * Reset single gear to original value from database
   * @param gearKey - Key of gear to reset (gear1, gear2, ..., finalDrive)
   */
  const handleResetGear = (gearKey: string) => {
    const originalValue = originalGears[gearKey]
    onGearChange(gearKey, originalValue)
  }

  /**
   * Clear single gear (set to empty string)
   * @param gearKey - Key of gear to clear (gear1, gear2, ..., finalDrive)
   */
  const handleClearGear = (gearKey: string) => {
    onGearChange(gearKey, '')
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Show centered spinner while fetching sections and settings
  // Fixed height (700px) prevents layout shift when data loads
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[700px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ============================================================
  // ERROR STATE
  // ============================================================
  // Show error message if API calls fail
  // User can retry by refreshing the page
  // ============================================================

  if (error) {
    return (
      <div className="flex items-center justify-center h-[700px]">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  // ============================================================
  // MAIN RENDER - Section Navigation + Settings Display
  // ============================================================
  // Layout: Flex container with responsive column direction
  // - Mobile: Column layout (dropdown + full-width settings)
  // - Desktop: Row layout (sidebar + settings panel)
  //
  // Left Side: Section navigation
  // - Mobile: Dropdown selector (sm:hidden)
  // - Desktop: Vertical sidebar tabs (hidden sm:block)
  //
  // Right Side: Settings inputs
  // - Header: Section name + setting count
  // - Scrollable: Overflow-y-auto for long setting lists
  // - Dynamic: Transmission shows gears, others show settings
  // ============================================================

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* ============================================================
          SECTION NAVIGATION (Left Side)
          ============================================================
          Mobile: Dropdown selector (full width)
          Desktop: Vertical sidebar tabs (w-64 fixed width)
          Active state: Primary background color

          Why Two Patterns?
          - Mobile: Dropdown saves vertical space
          - Desktop: Sidebar shows all sections at once
          - sm:breakpoint (640px) switches between patterns

          User Interaction:
          - Click section name/button → setActiveSection
          - Active section highlighted with primary color
          - Settings panel re-renders with new section
      ============================================================ */}

      {/* Mobile: Dropdown selector */}
      <div className="sm:hidden w-full">
        <Select value={activeSection} onValueChange={setActiveSection}>
          <SelectTrigger className="min-h-[44px] w-full">
            <SelectValue placeholder="Select section..." />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.name}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Vertical sidebar tabs */}
      <Card className="hidden sm:block w-64 p-2">
        <div className="flex flex-col gap-1">
          {sections.map((section) => (
            <Button
              key={section.id}
              type="button"
              variant={activeSection === section.name ? 'default' : 'ghost'}
              className={cn(
                'justify-start min-h-[44px]',
                activeSection === section.name
                  ? 'bg-primary text-primary-foreground'
                  : ''
              )}
              onClick={() => setActiveSection(section.name)}
            >
              {section.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* ============================================================
          SETTINGS PANEL (Right Side)
          ============================================================
          Header: Section name + setting count
          Content: Scrollable list of setting inputs
          Special Case: Transmission section shows gears + Final Drive

          Setting Count Calculation:
          - Transmission: activeSectionSettings.length + visibleGearCount
            (1 Final Drive setting + N gears)
          - Other sections: activeSectionSettings.length
            (all settings in this section)
      ============================================================ */}

      <Card className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{activeSection}</h3>
          <p className="text-sm text-muted-foreground">
            {activeSection === 'Transmission'
              ? `${activeSectionSettings.length + visibleGearCount} settings`
              : `${activeSectionSettings.length} settings`
            }
          </p>
        </div>

        <div className="overflow-y-auto flex-1 pr-4">
          <div className="space-y-4">
            {/* ============================================================
                TRANSMISSION SECTION - Special Rendering
                ============================================================
                Gears 1-6: Always rendered (default minimum)
                Gears 7-20: Conditionally rendered based on visibleGearCount
                Gear >6: Shows "Remove" button
                Final Drive: Rendered at bottom with border separator

                Why Separate Gear Rendering?
                - Gears are build fields, not database settings
                - Stored in props.gears object (gear1, gear2, ..., finalDrive)
                - Dynamic count: Some cars have 6 gears, some have 7+
                - User control: Add/remove gears beyond the default 6

                Gear Naming:
                - 1st, 2nd, 3rd: Ordinal suffix from getOrdinalSuffix()
                - 4th, 5th, 6th, etc.: Regular ordinal suffixes
                - Final Drive: Separate input (not a "gear")

                Add Gear Logic:
                - Max 20 gears (hard limit)
                - Button shown if visibleGearCount < 20
                - Calls onAddGear callback (parent increments count)
            ============================================================ */}

            {activeSection === 'Transmission' ? (
              <>
                {/* Render gears 1-6 or more based on visibleGearCount */}
                {Array.from({ length: visibleGearCount }, (_, i) => {
                  const gearNumber = i + 1
                  const gearKey = `gear${gearNumber}`
                  const currentValue = gears[gearKey] || ''
                  const originalValue = originalGears[gearKey] || ''
                  const hasChanged = originalValue !== currentValue
                  const hasValue = currentValue !== ''

                  return (
                    <div key={gearKey} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {gearNumber}{getOrdinalSuffix(gearNumber)} Gear
                        </Label>
                        <div className="flex gap-1 shrink-0">
                          {/* Reset - only show if changed from original */}
                          {hasChanged && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary transition-all duration-150"
                              aria-label={`Reset ${gearNumber}${getOrdinalSuffix(gearNumber)} gear to original value`}
                              onClick={() => handleResetGear(gearKey)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Clear - only show if has value */}
                          {hasValue && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive transition-all duration-150"
                              aria-label={`Clear ${gearNumber}${getOrdinalSuffix(gearNumber)} gear`}
                              onClick={() => handleClearGear(gearKey)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {gearNumber > 6 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveGear(gearNumber)}
                              className="text-destructive hover:text-destructive h-8 px-2"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={currentValue}
                        onChange={(e) => onGearChange(gearKey, e.target.value)}
                        placeholder="Enter gear ratio..."
                        className="min-h-[44px]"
                      />
                    </div>
                  )
                })}

                {/* Add Gear Button (only show if we have less than 20 gears) */}
                {visibleGearCount < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAddGear}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Gear
                  </Button>
                )}

                {/* Final Drive at bottom */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Final Drive</Label>
                    <div className="flex gap-1 shrink-0">
                      {/* Reset - only show if changed from original */}
                      {(originalGears.finalDrive || '') !== (gears.finalDrive || '') && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary transition-all duration-150"
                          aria-label="Reset Final Drive to original value"
                          onClick={() => handleResetGear('finalDrive')}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Clear - only show if has value */}
                      {(gears.finalDrive || '') !== '' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-all duration-150"
                          aria-label="Clear Final Drive"
                          onClick={() => handleClearGear('finalDrive')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={gears.finalDrive || ''}
                    onChange={(e) => onGearChange('finalDrive', e.target.value)}
                    placeholder="Enter final drive ratio..."
                    className="min-h-[44px]"
                  />
                </div>
              </>
            ) : (
              /* ============================================================
                  NON-TRANSMISSION SECTIONS - Standard Setting Rendering
                  ============================================================
                  Render all settings in active section
                  Each setting: Label (with unit) + Dynamic input
                  Input type determined by renderSettingInput()
                  Value passed from tuningSettings prop
                  onChange callback: onSettingChange(settingId, value)
              ============================================================ */

              activeSectionSettings.map((setting) => {
                const currentValue = tuningSettings[setting.id] || ''
                const originalValue = originalTuningSettings[setting.id] || ''
                const hasChanged = originalValue !== currentValue
                const hasValue = currentValue !== ''

                return (
                  <div key={setting.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={setting.id} className="text-sm font-medium">
                        {setting.name}
                        {setting.unit && (
                          <span className="text-muted-foreground font-normal ml-1">
                            ({setting.unit})
                          </span>
                        )}
                      </Label>
                      <div className="flex gap-1 shrink-0">
                        {/* Reset - only show if changed from original */}
                        {hasChanged && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-all duration-150"
                            aria-label={`Reset ${setting.name} to original value`}
                            onClick={() => handleResetSetting(setting.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Clear - only show if has value */}
                        {hasValue && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-all duration-150"
                            aria-label={`Clear ${setting.name}`}
                            onClick={() => handleClearSetting(setting.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {renderSettingInput(setting, currentValue, (value) =>
                      onSettingChange(setting.id, value)
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
