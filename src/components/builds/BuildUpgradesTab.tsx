/**
 * Build Upgrades Tab Component
 *
 * Purpose: Parts selection interface with category-based navigation
 * - Displays available parts grouped by category (Engine, Brakes, Suspension, etc.)
 * - Checkbox selection for each part (toggle on/off)
 * - Responsive design: Mobile dropdown, desktop sidebar for category navigation
 * - Visual feedback: Selected parts highlighted with primary background
 *
 * **Key Features:**
 * - Category-based navigation (Engine, Turbo, Brakes, Suspension, etc.)
 * - Checkbox selection for each part
 * - Visual feedback: Selected parts have bg-primary/10 and border-primary/30
 * - Parallel API calls: Fetch categories and parts simultaneously
 * - Part count display: "N parts available" in header
 *
 * **Data Flow:**
 * 1. Mount: Fetch categories and parts via parallel API calls
 * 2. Render: Show loading spinner until data loads
 * 3. Display: Render category navigation + active category's parts
 * 4. Interact: User clicks checkbox to toggle part selection
 * 5. Callback: Notify parent via onUpgradeToggle(partId)
 *
 * **Props:**
 * - selectedUpgrades: Record of partId -> boolean (true = selected)
 * - onUpgradeToggle: Callback when checkbox clicked (partId) => void
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
 * - Min-height 24px for checkboxes (accessibility)
 *
 * **Visual Feedback:**
 * - Selected part: bg-primary/10 + border-primary/30
 * - Unselected part: border-border + gt-hover-card
 * - Active category: Primary background color in sidebar
 * - Inactive category: Ghost variant in sidebar
 *
 * **Part Selection Logic:**
 * - Checkbox state: Controlled by selectedUpgrades[part.id]
 * - Toggle: onUpgradeToggle(partId) called on change
 * - Parent manages: selectedUpgrades object state
 * - No validation: All parts are optional (can select any combination)
 *
 * **Debugging Tips:**
 * - Parts not showing: Check /api/parts and /api/parts/categories responses
 * - Category empty: Verify parts have correct categoryId foreign key
 * - Selection not persisting: Check parent component collects selectedUpgrades on submit
 * - Checkbox not responding: Verify onUpgradeToggle callback is passed correctly
 * - Visual feedback wrong: Check isChecked variable calculation (selectedUpgrades[part.id] || false)
 *
 * **Common Issues:**
 * - Category navigation broken: Check activeCategory state updates on click
 * - Parts not filtering: Verify activeCategoryObj?.id matches part.categoryId
 * - Selected state lost: Parent must manage selectedUpgrades state
 * - Mobile dropdown not working: Verify Select component from shadcn/ui
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

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
  selectedUpgrades: Record<string, boolean>
  onUpgradeToggle: (partId: string) => void
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
// 4. Interact: User clicks checkbox to toggle part selection
// 5. Callback: Notify parent via onUpgradeToggle(partId)
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
// - Controlled component: Checkbox checked prop from selectedUpgrades[part.id]
// - Toggle callback: onUpgradeToggle(partId) called on change
// - Parent manages state: selectedUpgrades object in parent component
// - Visual feedback: Selected parts have primary background/border
// ============================================================

export function BuildUpgradesTab({ selectedUpgrades, onUpgradeToggle }: BuildUpgradesTabProps) {
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
          fetch('/api/parts/categories'),
          fetch('/api/parts')
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
          Content: Scrollable list of part checkboxes
          Visual feedback: Selected parts have bg-primary/10 + border-primary/30

          Part Rendering:
          - Checkbox: Controlled component (checked prop from selectedUpgrades)
          - Label: Clickable (cursor-pointer) to toggle selection
          - Container: Rounded border, min-height 44px (touch target)
          - Selected state: Primary background/border
          - Unselected state: Border with gt-hover-card hover effect

          Selection Logic:
          - isChecked: selectedUpgrades[part.id] || false (default to unchecked)
          - onCheckedChange: onUpgradeToggle(part.id) callback
          - Parent manages: selectedUpgrades object state
          - No validation: All parts optional, can select any combination
      ============================================================ */}

      <Card className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{activeCategory}</h3>
          <p className="text-sm text-muted-foreground">
            {activeCategoryParts.length} parts available
          </p>
        </div>

        <div className="overflow-y-auto flex-1 pr-4">
          <div className="space-y-2">
            {activeCategoryParts.map((part) => {
              // Get checkbox state from parent (default to false if not set)
              const isChecked = selectedUpgrades[part.id] || false

              return (
                <div
                  key={part.id}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-3 transition-colors min-h-[44px]',
                    isChecked
                      ? 'bg-primary/10 border-primary/30'
                      : 'border-border gt-hover-card'
                  )}
                >
                  <Checkbox
                    id={part.id}
                    checked={isChecked}
                    onCheckedChange={() => onUpgradeToggle(part.id)}
                    className="min-h-[24px] min-w-[44px]"
                  />
                  <Label
                    htmlFor={part.id}
                    className="flex-1 cursor-pointer text-sm font-medium"
                  >
                    {part.name}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
