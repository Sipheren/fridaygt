/**
 * Build Upgrades Tab Component
 *
 * Purpose: Parts selection interface with category-based navigation
 * - Displays available parts grouped by category (Engine, Brakes, Suspension, etc.)
 * - Mixed input types: Checkbox selection for existing parts, Dropdown for new parts
 * - GT Auto: Wide Body Installed dropdown
 * - Custom Parts: Front, Side, Rear, Wing dropdowns with conditional Wing options
 * - Responsive design: Mobile dropdown, desktop sidebar for category navigation
 * - Visual feedback: Selected parts highlighted with primary background
 *
 * **Key Features:**
 * - Category-based navigation (Engine, Turbo, Brakes, Suspension, GT Auto, Custom Parts, etc.)
 * - Checkbox selection for existing categories (Sports, Club Sports, Semi-Racing, Racing, Extreme)
 * - Dropdown selection for new categories (GT Auto, Custom Parts)
 * - Conditional display: Wing Height/Endplate only shown when Wing = "Custom"
 * - Visual feedback: Selected parts have bg-primary/10 and border-primary/30
 * - Parallel API calls: Fetch categories and parts simultaneously
 * - Part count display: "N parts available" in header
 *
 * **Data Flow:**
 * 1. Mount: Fetch categories and parts via parallel API calls
 * 2. Render: Show loading spinner until data loads
 * 3. Display: Render category navigation + active category's parts
 * 4. Interact: User clicks checkbox or selects dropdown option
 * 5. Callback: Notify parent via onUpgradeChange(partId, value)
 *
 * **Props:**
 * - selectedUpgrades: Record of partId -> string | boolean (dropdown value or boolean)
 * - onUpgradeChange: Callback when selection changes (partId, value) => void
 *
 * **State:**
 * - categories: Array of part categories (for navigation)
 * - parts: Array of all parts (filtered by active category)
 * - activeCategory: Currently selected category name
 * - loading/error: API call status
 *
 * **Responsive Design:**
 * - Mobile: Category dropdown selector (full width)
 * - Desktop: Vertical sidebar tabs (w-64 fixed width)
 * - Min-height 44px for all interactive elements (touch targets)
 * - Dropdowns: Full-width on mobile (w-full sm:w-fit pattern)
 *
 * **Visual Feedback:**
 * - Selected checkbox: bg-primary/10 + border-primary/30
 * - Unselected checkbox: border-border + gt-hover-card
 * - Active category: Primary background color in sidebar
 * - Inactive category: Ghost variant in sidebar
 *
 * **Part Selection Logic:**
 * - Checkbox parts: Boolean true/false for selected/unselected
 * - Dropdown parts: String value for selected option
 * - Parent manages: selectedUpgrades object with mixed types
 * - No validation: All parts are optional (can select any combination)
 *
 * **Conditional Display:**
 * - Wing Height and Wing Endplate only shown when Wing = "Custom"
 * - These parts have special conditional logic in rendering
 *
 * **Debugging Tips:**
 * - Parts not showing: Check /api/parts and /api/parts/categories responses
 * - Category empty: Verify parts have correct categoryId foreign key
 * - Selection not persisting: Check parent component collects selectedUpgrades on submit
 * - Dropdown not working: Verify onUpgradeChange callback is passed correctly
 * - Conditional parts not showing: Check Wing value equals "Custom"
 *
 * **Common Issues:**
 * - Category navigation broken: Check activeCategory state updates on click
 * - Parts not filtering: Verify activeCategoryObj?.id matches part.categoryId
 * - Selected state lost: Parent must manage selectedUpgrades state
 * - Mobile dropdown not working: Verify Select component from shadcn/ui
 * - Conditional options always hidden: Check isConditionalPartShown logic
 *
 * **Related Files:**
 * - /api/parts/route.ts: Fetch all active parts
 * - /api/parts/categories/route.ts: Fetch all active categories
 * - src/components/builds/BuildTuningTab.tsx: Similar pattern (section navigation)
 * - src/components/builds/BuildSelector.tsx: Parent component using this tab
 * - src/types/database.ts: DbPart, DbPartCategory type definitions
 */

'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Loader2, RotateCcw, X } from 'lucide-react'

// ============================================================
// TYPE DEFINITIONS
// ============================================================
// Local types for parts data structures
// These match database schema but are locally defined for component usage

interface PartCategory {
  id: string
  name: string
  displayOrder: number
}

interface Part {
  id: string
  categoryId: string
  name: string
  description?: string
  isActive: boolean
  category: PartCategory
}

interface BuildUpgradesTabProps {
  selectedUpgrades: Record<string, string | boolean>
  onUpgradeChange: (partId: string, value: string | boolean) => void
  originalUpgrades: Record<string, string | boolean>  // Original values for reset functionality
}

// ============================================================
// DROPDOWN OPTIONS CONFIGURATION
// ============================================================
// Defines available options for each dropdown-based part
// Used for GT Auto and Custom Parts categories

// GT Auto part options (order here controls display order)
const GT_AUTO_OPTIONS: Record<string, string[]> = {
  'Wide Body Installed': ['Yes', 'No'],
  'Wheel Size': ['10"', '11"', '12"', '13"', '14"', '15"', '16"', '17"', '18"', '19"', '20"', '21"', '22"', '23"', '24"', '25"', '26"', '27"', '28"', '29"', '30"'],
  'Wheel Width': ['Standard', 'Wide'],
  'Wheel Offset': ['Standard', 'Wide'],
}

// Custom Parts base options (shown by default)
const CUSTOM_PARTS_OPTIONS: Record<string, string[]> = {
  'Front': ['Standard', 'Type A', 'Type B'],
  'Side': ['Standard', 'Type A', 'Type B'],
  'Rear': ['Standard', 'Type A', 'Type B'],
  'Wing': ['Standard', 'None', 'Type A', 'Type B', 'Custom'],
}

// Conditional Wing options (shown when Wing = "Custom")
const WING_OPTIONS: Record<string, string[]> = {
  'Wing Height': ['Low', 'Medium', 'High'],
  'Wing Endplate': Array.from({ length: 26 }, (_, i) => i.toString()), // 0-25
}

// ============================================================
// HELPER FUNCTIONS - Category Type Detection
// ============================================================

/**
 * Determines if a category uses dropdown inputs vs checkbox inputs
 * @param categoryName - The name of the part category
 * @returns true if category uses dropdowns, false if uses checkboxes
 */
function isDropdownCategory(categoryName: string): boolean {
  return categoryName === 'GT Auto' || categoryName === 'Custom Parts'
}

/**
 * Gets available options for a dropdown part
 * @param partName - The name of the part
 * @returns Array of option strings, or empty array if not a dropdown part
 */
function getDropdownOptions(partName: string): string[] {
  // Check GT Auto options
  if (GT_AUTO_OPTIONS[partName]) {
    return GT_AUTO_OPTIONS[partName]
  }
  // Check Custom Parts options
  if (CUSTOM_PARTS_OPTIONS[partName]) {
    return CUSTOM_PARTS_OPTIONS[partName]
  }
  // Check Wing options
  if (WING_OPTIONS[partName]) {
    return WING_OPTIONS[partName]
  }
  return []
}

/**
 * Checks if a part is a conditional Wing option (only shown when Wing = "Custom")
 * @param partName - The name of the part
 * @returns true if part is conditional on Wing selection
 */
function isConditionalWingPart(partName: string): boolean {
  return partName === 'Wing Height' || partName === 'Wing Endplate'
}

// ============================================================
// MAIN COMPONENT - BuildUpgradesTab
// ============================================================
// Parts selection interface with category-based navigation
// Fetches categories/parts on mount, renders active category's parts
//
// Component Flow:
// 1. Mount: Fetch categories and parts via parallel API calls
// 2. Render: Show loading spinner until data loads
// 3. Display: Render category navigation (sidebar/dropdown) + active parts
// 4. Interact: User clicks checkbox or selects dropdown option
// 5. Callback: Notify parent via onUpgradeChange(partId, value)
//
// Data Fetching Strategy:
// - Parallel calls: Promise.all for categories + parts (faster than sequential)
// - One-time fetch: useEffect with empty deps (no refetch on re-renders)
// - Error handling: Try-catch with error state display
//
// State Management:
// - categories: Array of all part categories (for navigation)
// - parts: Array of all parts (filtered by active category)
// - activeCategory: Name of currently selected category
// - loading/error: API call status
//
// Part Selection Pattern:
// - Checkbox parts: Boolean true/false for selected/unselected
// - Dropdown parts: String value for selected option
// - Parent manages state: selectedUpgrades object in parent component
// - Visual feedback: Selected parts have primary background/border
//
// Conditional Display:
// - Wing Height and Wing Endplate only shown when Wing = "Custom"
// - Logic: Find Wing part value, show/hide conditional parts accordingly
// ============================================================

export function BuildUpgradesTab({ selectedUpgrades, onUpgradeChange, originalUpgrades }: BuildUpgradesTabProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  // categories: Array of part categories (e.g., Engine, Turbo, Brakes)
  // parts: Array of all parts (filtered by active category)
  // activeCategory: Name of currently selected category (string)
  // loading: API call in progress
  // error: Error message if API call fails

  const [categories, setCategories] = useState<PartCategory[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================
  // DATA FETCHING - Categories and Parts
  // ============================================================
  // Fetch part categories and parts on component mount
  // Parallel API calls with Promise.all for performance
  // Sets first category as active by default
  //
  // Why Parallel Calls?
  // - Categories and parts are independent
  // - Promise.all fetches both simultaneously
  // - Reduces total load time vs sequential calls
  //
  // Why Empty Deps Array?
  // - Only fetch once on mount
  // - Categories/parts don't change during component lifecycle
  // - Prevents unnecessary re-fetches on re-renders
  //
  // Error Handling:
  // - Try-catch wraps API calls
  // - Error state displayed to user
  // - Loading state cleared in finally block
  //
  // Debugging Tips:
  // - Empty categories: Check /api/parts/categories response
  // - Empty parts: Check /api/parts response
  // - Error shown: Check browser console for network errors
  // - Active category not set: Verify categoriesData.categories.length > 0
  // ============================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Parallel API calls: Fetch categories and parts simultaneously
        const [categoriesRes, partsRes] = await Promise.all([
          fetch('/api/parts/categories?nocache=true'),
          fetch('/api/parts?nocache=true')
        ])

        if (!categoriesRes.ok) throw new Error('Failed to fetch categories')
        if (!partsRes.ok) throw new Error('Failed to fetch parts')

        const categoriesData = await categoriesRes.json()
        const partsData = await partsRes.json()

        setCategories(categoriesData.categories)
        setParts(partsData.parts)

        // Set first category as active if none selected
        // Default to first category in displayOrder
        if (categoriesData.categories.length > 0) {
          setActiveCategory(categoriesData.categories[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load parts data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Only fetch once on mount

  // ============================================================
  // DERIVED STATE - Active Category Parts
  // ============================================================
  // Filter parts by active category for rendering
  // No memoization needed: Simple filter, fast enough
  //
  // activeCategoryObj: Category object for active category name
  // activeCategoryParts: Parts array filtered by categoryId
  //
  // Debugging Tips:
  // - Empty parts array: Verify activeCategoryObj?.id exists
  // - Parts not filtering: Check part.categoryId matches activeCategoryObj.id
  // - All parts showing: Verify categoryId foreign key is correct
  // ============================================================

  // Get the active category data
  const activeCategoryObj = categories.find((c) => c.name === activeCategory)
  const activeCategoryParts = parts.filter((p) => p.categoryId === activeCategoryObj?.id)

  // ============================================================
  // DERIVED STATE - Conditional Wing Parts Display
  // ============================================================
  // Find Wing part value to determine if conditional parts should be shown
  // Wing Height and Wing Endplate only shown when Wing = "Custom"
  //
  // wingPartValue: Current value of Wing dropdown (string or undefined)
  // showConditionalWingParts: true when Wing = "Custom"
  //
  // Logic:
  // 1. Find Wing part in all parts
  // 2. Get its current value from selectedUpgrades
  // 3. Check if value equals "Custom"
  // 4. Use this to filter conditional parts

  const wingPart = parts.find((p) => p.name === 'Wing')
  const wingPartValue = wingPart ? selectedUpgrades[wingPart.id] : undefined
  const showConditionalWingParts = typeof wingPartValue === 'string' && wingPartValue === 'Custom'

  // All dropdown option keys in desired display order (GT Auto first, then Custom Parts, then Wing)
  const DROPDOWN_PART_ORDER = [
    ...Object.keys(GT_AUTO_OPTIONS),
    ...Object.keys(CUSTOM_PARTS_OPTIONS),
    ...Object.keys(WING_OPTIONS),
  ]

  // Filter parts for active category, excluding conditional parts if Wing != "Custom"
  // Dropdown categories sort by DROPDOWN_PART_ORDER; checkbox categories keep API order
  const visibleParts = activeCategoryParts
    .filter((part) => {
      if (!isConditionalWingPart(part.name)) return true
      return showConditionalWingParts
    })
    .sort((a, b) => {
      const aIdx = DROPDOWN_PART_ORDER.indexOf(a.name)
      const bIdx = DROPDOWN_PART_ORDER.indexOf(b.name)
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

  // ============================================================
  // RESET/CLEAR HANDLERS
  // ============================================================

  /**
   * Reset single part to original value from database
   * @param partId - ID of part to reset
   */
  const handleResetPart = (partId: string) => {
    const originalValue = originalUpgrades[partId]
    onUpgradeChange(partId, originalValue)
  }

  /**
   * Clear single part (set to empty)
   * @param partId - ID of part to clear
   * For dropdown parts: clear to empty string
   * For checkbox parts: clear to false (unchecked)
   * Special case: Clearing Wing also clears Wing Height and Wing Endplate
   */
  const handleClearPart = (partId: string) => {
    const part = parts.find((p) => p.id === partId)
    if (!part) return

    // Check if part belongs to dropdown category
    const category = categories.find((c) => c.id === part.categoryId)
    const isDropdown = category && isDropdownCategory(category.name)

    // For dropdown parts, clear to empty string
    // For checkbox parts, clear to false
    onUpgradeChange(partId, isDropdown ? '' : false)

    // Special case: If clearing Wing, also clear conditional Wing parts
    if (part.name === 'Wing') {
      // Find and clear Wing Height and Wing Endplate
      const wingHeight = parts.find((p) => p.name === 'Wing Height')
      const wingEndplate = parts.find((p) => p.name === 'Wing Endplate')
      if (wingHeight) onUpgradeChange(wingHeight.id, '')
      if (wingEndplate) onUpgradeChange(wingEndplate.id, '')
    }
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Show centered spinner while fetching categories and parts
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
  // MAIN RENDER - Category Navigation + Parts List
  // ============================================================
  // Layout: Flex container with responsive column direction
  // - Mobile: Column layout (dropdown + full-width parts list)
  // - Desktop: Row layout (sidebar + parts panel)
  //
  // Left Side: Category navigation
  // - Mobile: Dropdown selector (sm:hidden)
  // - Desktop: Vertical sidebar tabs (hidden sm:block)
  //
  // Right Side: Parts list with checkboxes
  // - Header: Category name + part count
  // - Scrollable: Overflow-y-auto for long part lists
  // - Visual feedback: Selected parts highlighted
  // ============================================================

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* ============================================================
          CATEGORY NAVIGATION (Left Side)
          ============================================================
          Mobile: Dropdown selector (full width)
          Desktop: Vertical sidebar tabs (w-64 fixed width)
          Active state: Primary background color

          Why Two Patterns?
          - Mobile: Dropdown saves vertical space
          - Desktop: Sidebar shows all categories at once
          - sm:breakpoint (640px) switches between patterns

          User Interaction:
          - Click category name/button → setActiveCategory
          - Active category highlighted with primary color
          - Parts list re-renders with new category
      ============================================================ */}

      {/* Mobile: Dropdown selector */}
      <div className="sm:hidden w-full">
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger className="min-h-[44px] w-full">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Vertical sidebar tabs */}
      <Card className="hidden sm:block w-64 p-2">
        <div className="flex flex-col gap-1">
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant={activeCategory === category.name ? 'default' : 'ghost'}
              className={cn(
                'justify-start min-h-[44px]',
                activeCategory === category.name
                  ? 'bg-primary text-primary-foreground'
                  : ''
              )}
              onClick={() => setActiveCategory(category.name)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* ============================================================
          PARTS LIST PANEL (Right Side)
          ============================================================
          Header: Category name + part count ("N parts available")
          Content: Scrollable list of parts (checkboxes or dropdowns)
          Visual feedback: Selected parts have bg-primary/10 + border-primary/30

          Part Rendering - Two Types:
          1. Checkbox Parts (existing categories):
             - Controlled checkbox component
             - Boolean true/false for selected/unselected
             - Click label to toggle selection
             - Rounded border, min-height 44px (touch target)

          2. Dropdown Parts (GT Auto, Custom Parts):
             - Select component with predefined options
             - String value for selected option
             - Full-width on mobile (w-full sm:w-fit pattern)
             - Conditional: Wing Height/Endplate only shown when Wing = "Custom"
             - Wing Endplate: Dropdown with options 0-25

          Selection Logic:
          - Parent manages: selectedUpgrades object with mixed types
          - Callback: onUpgradeChange(partId, value) for all input types
          - No validation: All parts optional, can select any combination

          Conditional Display:
          - Wing Height and Wing Endplate filtered from visibleParts
          - Only included when Wing value equals "Custom"
      ============================================================ */}

      <Card className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{activeCategory}</h3>
          <p className="text-sm text-muted-foreground">
            {visibleParts.length} parts available
          </p>
        </div>

        <div className="overflow-y-auto flex-1 pr-4">
          <div className="space-y-3">
            {visibleParts.map((part) => {
              // Determine input type based on category
              const isDropdown = isDropdownCategory(activeCategory)
              const options = getDropdownOptions(part.name)
              const partValue = selectedUpgrades[part.id]

              // Checkbox rendering (existing parts)
              if (!isDropdown) {
                const isChecked = partValue === true
                const originalValue = originalUpgrades[part.id]
                const hasChanged = originalValue !== partValue
                const hasValue = partValue === true

                return (
                  <div
                    key={part.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors min-h-[44px]',
                      isChecked
                        ? 'bg-primary/10 border-primary/30'
                        : 'border-border gt-hover-card'
                    )}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        id={part.id}
                        checked={isChecked}
                        onCheckedChange={() => onUpgradeChange(part.id, !isChecked)}
                        className="min-h-[24px] min-w-[44px]"
                      />
                      <Label
                        htmlFor={part.id}
                        className="flex-1 cursor-pointer text-sm font-medium"
                      >
                        {part.name}
                      </Label>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {/* Reset - only show if changed from original */}
                      {hasChanged && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary transition-all duration-150"
                          aria-label={`Reset ${part.name} to original value`}
                          onClick={() => handleResetPart(part.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Clear - only show if checked */}
                      {hasValue && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-all duration-150"
                          aria-label={`Uncheck ${part.name}`}
                          onClick={() => handleClearPart(part.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              }

              // Dropdown rendering (GT Auto and Custom Parts)
              if (options.length > 0) {
                const currentValue = typeof partValue === 'string' ? partValue : ''
                const originalValue = typeof originalUpgrades[part.id] === 'string' ? originalUpgrades[part.id] : ''
                const hasChanged = originalValue !== currentValue
                const hasValue = currentValue !== ''

                return (
                  <div key={part.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={part.id} className="text-sm font-medium">
                        {part.name}
                      </Label>
                      <div className="flex gap-1 shrink-0">
                        {/* Reset - only show if changed from original */}
                        {hasChanged && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-all duration-150"
                            aria-label={`Reset ${part.name} to original value`}
                            onClick={() => handleResetPart(part.id)}
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
                            aria-label={`Clear ${part.name}`}
                            onClick={() => handleClearPart(part.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Select
                      value={currentValue}
                      onValueChange={(value) => onUpgradeChange(part.id, value)}
                    >
                      <SelectTrigger id={part.id} className="min-h-[44px] w-full">
                        <SelectValue placeholder={`Select ${part.name.toLowerCase()}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              // Fallback: part without options (shouldn't happen)
              return null
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
