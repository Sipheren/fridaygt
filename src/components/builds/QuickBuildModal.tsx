/**
 * Quick Build Modal Component
 *
 * Purpose: Modal dialog for creating basic builds with minimal setup
 * - Simplified build creation (car selection + name + description only)
 * - No tuning settings or part upgrades (can add later)
 * - Pre-fills car selection if preselectedCarId prop provided
 * - Closes on success and optionally calls onBuildCreated callback
 *
 * **Key Features:**
 * - Minimal form: Car selector + build name + description (optional)
 * - Quick creation: No tuning or upgrades required upfront
 * - Car pre-selection: Opens with car selected if preselectedCarId provided
 * - Searchable dropdown: Virtualized car list with search
 * - Validation: Car and name required, description optional
 *
 * **Data Flow:**
 * 1. Open: Fetch cars via /api/cars (lazy: only when opened)
 * 2. User fills form: Selects car, enters name, optionally adds description
 * 3. Submit: POST to /api/builds/quick with { carId, name, description }
 * 4. Success: Call onBuildCreated(build.id), reset form, close modal
 * 5. Error: Display error message, keep modal open
 *
 * **Props:**
 * - open: Modal open/close state (controlled by parent)
 * - onOpenChange: Callback when modal should close (open: boolean) => void
 * - onBuildCreated: Optional callback after build created (buildId: string) => void
 * - preselectedCarId: Optional car ID to pre-select in dropdown
 *
 * **State:**
 * - loading: Form submission in progress
 * - cars: Array of DbCar objects (for dropdown)
 * - carsLoading: Cars API call in progress
 * - formData: { carId, name, description } form values
 * - error: Error message string (if validation or API fails)
 *
 * **Form Fields:**
 * - car (required): SearchableComboBox with formatCarOptions
 *   - Virtualized: Handles large car list efficiently
 *   - Grouped: By manufacturer
 *   - Searchable: By name, manufacturer, year, category
 * - name (required): Text input, trimmed on submit
 * - description (optional): Textarea, trimmed on submit, null if empty
 *
 * **Validation Rules:**
 * - carId: Must not be empty string
 * - name: Must not be empty after trim()
 * - description: Optional, converted to null if empty after trim()
 *
 * **API Integration:**
 * - POST /api/builds/quick: Creates build without tuning/upgrades
 * - Request body: { carId: string, name: string, description?: string }
 * - Response: { id: string, ...buildData }
 * - Success: Calls onBuildCreated(build.id), closes modal
 * - Error: Displays error message from response
 *
 * **Cars Fetching Strategy:**
 * - Lazy fetch: Only when modal opens (open === true && cars.length === 0)
 * - One-time fetch: useEffect with open dependency
 * - Error handling: Sets error state if fetch fails
 * - Loading state: Shows spinner in SearchableComboBox
 *
 * **Form Reset:**
 * - On success: Reset to { carId: preselectedCarId || '', name: '', description: '' }
 * - Keeps modal open until callback completes
 * - Closes modal via onOpenChange(false) after reset
 *
 * **Debugging Tips:**
 * - Cars not loading: Check /api/cars response, verify carsLoading state
 * - Pre-selection not working: Verify preselectedCarId matches car UUID in cars array
 * - Submit disabled: Check loading state, validation rules
 * - Modal not closing: Verify onOpenChange callback is called
 * - Error not showing: Check error state is displayed in UI
 *
 * **Common Issues:**
 * - Cars dropdown empty: /api/cars returned empty array (database issue)
 * - Car not pre-selected: preselectedCarId doesn't match any car.id
 * - Name trim failing: Ensure formData.name.trim() is called
 * - Submit blocked: Check validation logic (carId required, name required)
 * - Modal won't close: Check onOpenChange(false) is called after successful creation
 *
 * **Related Files:**
 * - /api/builds/quick/route.ts: Quick build creation endpoint
 * - /api/cars/route.ts: Fetch all cars for dropdown
 * - @/lib/dropdown-helpers.ts: formatCarOptions helper for SearchableComboBox
 * - @/components/ui/searchable-combobox.tsx: Dropdown component
 * - @/components/ui/dialog.tsx: Modal wrapper component
 * - @/types/database.ts: DbCar type definition
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableComboBox } from '@/components/ui/searchable-combobox'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCarOptions } from '@/lib/dropdown-helpers'
import type { DbCar } from '@/types/database'

// ============================================================
// PROPS
// ============================================================

interface QuickBuildModalProps {
  open: boolean  // Modal open/close state (controlled)
  onOpenChange: (open: boolean) => void  // Callback to close modal
  onBuildCreated?: (buildId: string) => void  // Optional callback after creation
  preselectedCarId?: string  // Optional car ID to pre-select
}

// ============================================================
// MAIN COMPONENT - QuickBuildModal
// ============================================================
// Modal dialog for creating basic builds with minimal setup
// No tuning settings or part upgrades required
//
// Component Flow:
// 1. Open: Fetch cars (lazy load on first open)
// 2. User fills form: Select car, enter name, optionally description
// 3. Submit: POST to /api/builds/quick
// 4. Success: Call callback, reset form, close modal
// 5. Error: Display error, keep modal open
//
// Why "Quick" Build?
// - Full build creation requires tuning + upgrades (multi-step form)
// - Quick build gets you started with minimal setup
// - Can add tuning/upgrades later from build detail page
//
// Form Strategy:
// - Minimal required fields: car, name
// - Optional: description (helps identify build later)
// - No tuning: Gears default to 6, settings empty
// - No upgrades: All parts unselected
//
// Validation:
// - Client-side: Check carId and name before submitting
// - Server-side: Zod schema validates request body
// - Error handling: Display API error messages to user
// ============================================================

export function QuickBuildModal({
  open,
  onOpenChange,
  onBuildCreated,
  preselectedCarId,
}: QuickBuildModalProps) {
  const router = useRouter()

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  // loading: Form submission in progress (submit button disabled)
  // cars: Array of cars for dropdown (lazy loaded on open)
  // carsLoading: Cars API call in progress (show spinner in dropdown)
  // formData: Form values (carId, name, description)
  // error: Validation or API error message (displayed to user)

  const [loading, setLoading] = useState(false)
  const [cars, setCars] = useState<DbCar[]>([])
  const [carsLoading, setCarsLoading] = useState(false)
  const [formData, setFormData] = useState({
    carId: preselectedCarId || '',
    name: '',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)

  // ============================================================
  // CARS FETCHING - Lazy Load on Modal Open
  // ============================================================
  // Fetch cars only when modal opens and cars array is empty
  // Prevents unnecessary API calls when modal is closed
  //
  // Why Lazy Load?
  // - Cars list is large (500+ cars)
  // - Modal might never be opened
  // - Saves bandwidth on page load
  //
  // Fetch Triggers:
  // - open === true (modal opened)
  // - cars.length === 0 (not fetched yet)
  //
  // Error Handling:
  // - Sets error state if fetch fails
  // - Displays error in SearchableComboBox error prop
  //
  // Debugging Tips:
  // - Cars not loading: Check open state is true
  // - Empty dropdown: Check /api/cars response
  // - Error persists: Check browser console for network errors
  // ============================================================

  useEffect(() => {
    if (open && cars.length === 0) {
      fetchCars()
    }
  }, [open])

  const fetchCars = async () => {
    try {
      setCarsLoading(true)
      const response = await fetch('/api/cars')
      if (!response.ok) throw new Error('Failed to fetch cars')
      const data = await response.json()
      setCars(data.cars || [])
    } catch (err) {
      console.error('Error fetching cars:', err)
      setError('Failed to load cars')
    } finally {
      setCarsLoading(false)
    }
  }

  // ============================================================
  // MODAL STATE MANAGEMENT - Pass Through to Parent
  // ============================================================
  // Pass open change requests to parent component
  // Parent controls modal state (controlled component pattern)
  //
  // Why Pass Through?
  // - Parent manages modal state (open/close)
  // - This component only requests changes via callback
  // - Keeps state management in parent (single source of truth)
  // ============================================================

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  // ============================================================
  // FORM SUBMISSION - Create Quick Build
  // ============================================================
  // Validate form data, submit to API, handle response
  //
  // Validation Steps:
  // 1. Check carId is not empty (required field)
  // 2. Check name is not empty after trim (required field)
  // 3. Set error message if validation fails
  //
  // API Call:
  // - Endpoint: POST /api/builds/quick
  // - Headers: Content-Type: application/json
  // - Body: { carId, name (trimmed), description (trimmed or null) }
  //
  // Success Handling:
  // 1. Parse response JSON to get build.id
  // 2. Call onBuildCreated(build.id) if provided
  // 3. Reset form to initial state
  // 4. Close modal via onOpenChange(false)
  //
  // Error Handling:
  // - Parse error JSON from response
  // - Extract error.message or use generic fallback
  // - Display error in UI (red text with background)
  // - Keep modal open for retry
  //
  // Debugging Tips:
  // - Submit blocked: Check validation rules (carId, name)
  // - API error: Check response body for error message
  // - Modal not closing: Verify onOpenChange(false) is called
  // - Form not resetting: Check setFormData call after success
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation: Check required fields
    if (!formData.carId) {
      setError('Please select a car')
      return
    }

    if (!formData.name.trim()) {
      setError('Please enter a build name')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/builds/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: formData.carId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create build')
      }

      const build = await response.json()

      // Call callback if provided (parent can navigate to build page)
      if (onBuildCreated) {
        onBuildCreated(build.id)
      }

      // Reset form and close modal
      setFormData({
        carId: preselectedCarId || '',
        name: '',
        description: '',
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating build:', err)
      setError(err instanceof Error ? err.message : 'Failed to create build')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // DROPDOWN OPTIONS - Format Cars for SearchableComboBox
  // ============================================================
  // Format car array into ComboBoxOption format
  // Groups by manufacturer, searchable by name/manufacturer/year/category
  //
  // formatCarOptions returns:
  // - value: car.id
  // - label: "{year} {name}" (year omitted if null)
  // - group: manufacturer (e.g., "Porsche", "Ferrari")
  // - searchTerms: Combined string for fuzzy search
  //
  // Why formatCarOptions?
  // - SearchableComboBox requires specific option format
  // - Consistent grouping across all car dropdowns
  // - Fuzzy search enabled via searchTerms
  // ============================================================

  const carOptions = formatCarOptions(cars)

  // ============================================================
  // MAIN RENDER - Modal Dialog
  // ============================================================
  // Dialog wrapper with form content
  // - Header: Title + description
  // - Form: Car selector + name input + description textarea
  // - Footer: Cancel + Create buttons
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {/* ============================================================
            DIALOG HEADER - Title + Description
            ============================================================
            Title: "Create Quick Build"
            Description: Explains that tuning/upgrades can be added later
        ============================================================ */}

        <DialogHeader>
          <DialogTitle>Create Quick Build</DialogTitle>
          <DialogDescription>
            Create a basic build setup. You can add upgrades and tuning settings
            later from the builds page.
          </DialogDescription>
        </DialogHeader>

        {/* ============================================================
            FORM - Car + Name + Description
            ============================================================
            Layout: Vertical stack with space-y-4 spacing
            Controlled components: value and onChange tied to formData

            Field: Car Selection (Required)
            - Component: SearchableComboBox
            - Options: carOptions (grouped by manufacturer)
            - Value: formData.carId
            - onChange: Updates formData.carId
            - Features: Virtualized, grouped, searchable
            - Loading: Shows spinner while carsLoading
            - Error: Shows error if cars array empty

            Field: Build Name (Required)
            - Component: Input (text)
            - Placeholder: "e.g., Nürburgring Setup, Spa Quali..."
            - Value: formData.name
            - onChange: Updates formData.name
            - AutoFocus: True (focus on modal open)

            Field: Description (Optional)
            - Component: Textarea
            - Placeholder: "Brief description of this build..."
            - Value: formData.description
            - onChange: Updates formData.description
            - Rows: 3 (approximate height)

            Error Display:
            - Background: Destructive/10 (red tint)
            - Text: Destructive (red)
            - Padding: p-3 (rounded corners)
            - Shown: Only if error state is not null
        ============================================================ */}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Car Selection */}
          <div className="space-y-2">
            <Label htmlFor="car">Car *</Label>
            <SearchableComboBox
              options={carOptions}
              value={formData.carId}
              onValueChange={(value) =>
                setFormData({ ...formData, carId: value })
              }
              placeholder="Select a car"
              searchPlaceholder="Search cars..."
              disabled={loading}
              isLoading={carsLoading}
              error={cars.length === 0 && !carsLoading ? "Failed to load cars" : undefined}
              grouped
              virtualized
            />
          </div>

          {/* Build Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Build Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Nürburgring Setup, Spa Quali..."
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this build..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          {/* ============================================================
              DIALOG FOOTER - Cancel + Create Buttons
              ============================================================
              Cancel Button:
              - Variant: outline
              - onClick: Closes modal via onOpenChange(false)
              - Disabled: While loading (prevents close during submit)

              Create Button:
              - Type: submit (form submission)
              - Variant: default (primary color)
              - Icon: Loader2 spinner when loading
              - Text: "Create Build" or "Creating..." (via spinner)
              - Disabled: While loading (prevents double submit)
          ============================================================ */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Build
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
