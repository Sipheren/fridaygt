/**
 * Create New Build Page
 *
 * Purpose: Form page for creating a new car build with upgrades and tuning
 * - Multi-step form with basic info, upgrades, and tuning tabs
 * - Car selection with searchable dropdown (grouped by manufacturer)
 * - Parts upgrades organized by category
 * - Tuning settings with custom values
 * - Gear ratios (1-20 gears + final drive)
 * - Admin can assign build to different users
 * - Public/private visibility toggle
 *
 * **Key Features:**
 * - Car selection: Grouped dropdown with search and virtualization
 * - Build name: Required text input
 * - Description: Optional textarea
 * - Public toggle: Switch for public/private visibility
 * - Creator selection: Admin-only dropdown to assign to user
 * - Upgrades tab: Checkboxes for parts by category
 * - Tuning tab: Custom settings + gear ratios
 * - Validation: Client-side validation before submit
 * - Success: Redirect to /builds/[id] on create
 *
 * **Form Flow:**
 * 1. Page loads → Fetch cars, users, current user
 * 2. Pre-select car: If carId in query params (from car detail page)
 * 3. User fills form: Car, name, description, public, creator, upgrades, tuning
 * 4. Submit: Validate → POST /api/builds → Redirect to build detail
 * 5. Error: Show error dialog, user stays on form
 *
 * **State Management:**
 * - cars: Available cars from API
 * - users: Active users from API (for admin creator selection)
 * - currentUser: Current user info (id, role)
 * - loading: Loading state during data fetch
 * - saving: Loading state during form submit
 * - carId: Selected car ID
 * - name: Build name
 * - description: Build description
 * - isPublic: Public/private flag
 * - selectedUserId: Creator ID (admin only)
 * - selectedUpgrades: Map of partId → boolean (checked state)
 * - tuningSettings: Map of settingId → value
 * - gears: Map of gear1...gear20, finalDrive → value
 * - visibleGearCount: Number of gear inputs to show (6-20)
 *
 * **Upgrades Tab:**
 * - Parts grouped by category (Engine, Drivetrain, etc.)
 * - Checkboxes for each part
 * - Visual: Part name, optional value badge
 * - State: selectedUpgrades[partId] = true/false
 * - Submit: Converts to [{ partId }] array
 *
 * **Tuning Tab:**
 * - Settings grouped by section (Suspension, Brakes, etc.)
 * - Custom inputs: Text/number/select based on setting type
 * - Add/remove: Dynamic settings (user can add/remove)
 * - Gear ratios: 20 gear inputs + final drive (expandable 6-20)
 * - State: tuningSettings[settingId] = value
 * - Submit: Converts to [{ settingId, value }] array
 * - Gears: Spread as direct fields (gear1, gear2, ..., finalDrive)
 *
 * **Gear Ratios:**
 * - Direct fields: gear1...gear20, finalDrive (text to preserve formatting)
 * - Expandable: Start with 6, add up to 20
 * - Optional: User can leave empty
 * - Display: Text inputs (allow ratios like "3.500", "4.100", etc.)
 * - Submit: Spread as top-level fields in request body
 *
 * **Admin Creator Selection:**
 * - Only shown: When currentUser.role === 'ADMIN'
 * - Purpose: Create builds on behalf of other users
 * - Default: Current user selected on mount
 * - User options: name || email as label, email as subtitle
 * - Submit: userId only sent if different from current user
 *
 * **Validation:**
 * - Car: Required (carId must be selected)
 * - Name: Required (name must not be empty)
 * - Upgrades: Optional (can save with no upgrades)
 * - Tuning: Optional (can save with no tuning)
 * - Gears: Optional (can save with no gears)
 * - Dialog: Shows validation error if submit with invalid data
 *
 * **API Integration:**
 * - GET /api/cars: Fetch available cars
 * - GET /api/users?active=true: Fetch active users (admin)
 * - GET /api/auth/session: Fetch current user info
 * - POST /api/builds: Create new build
 * - Request body: { carId, name, description, isPublic, userId?, upgrades[], settings[], gears... }
 * - Response: { id: string } (new build ID)
 * - Success: router.push('/builds/[id]')
 *
 * **Pre-selection from URL:**
 * - Query param: ?carId=[id] from car detail page
 * - Effect: Auto-selects car in dropdown
 * - Use case: "Create build" button on car detail page
 * - Code: searchParams.get('carId') in useEffect
 *
 * **Tabs Component:**
 * - Two tabs: Upgrades & Parts, Tuning Settings
 * - Icons: Wrench (upgrades), Settings (tuning)
 * - Separate components: BuildUpgradesTab, BuildTuningTab
 * - Props: State and handlers passed down
 * - Controlled: Parent manages all state
 *
 * **Error Handling:**
 * - Fetch cars: Console log error, set loading false
 * - Fetch users: Console log error (non-blocking)
 * - Submit: Show error dialog with message
 * - Validation: Show validation dialog
 * - User stays: Can retry after error
 *
 * **Page Layout:**
 * - Back button: Navigates to /builds
 * - Header: Title "CREATE NEW BUILD", icon, save button
 * - Card: Build information (car, name, description, public, creator)
 * - Tabs: Upgrades, Tuning (full width)
 * - Bottom save: Save button (repeated for convenience)
 * - Dialogs: Validation, error
 *
 * **Styling:**
 * - Form: Standard padding and spacing
 * - Inputs: min-h-[44px] for touch targets
 * - Buttons: Full width on mobile, auto on desktop
 * - Tabs: Grid layout (2 columns)
 * - Card: Bordered with shadow
 *
 * **Car Selection:**
 * - SearchableComboBox: Grouped by manufacturer
 * - Virtualized: Efficient for large car lists
 * - Options: formatCarOptions(cars) helper
 * - Search: Real-time filter as user types
 * - Loading: Shows spinner during fetch
 *
 * **User Selection (Admin):**
 * - SearchableComboBox: List of active users
 * - Options: name || email as label
 * - Helper text: "As an admin, you can create builds on behalf of other users"
 * - Default: Current user selected
 * - API: Active users only (?active=true)
 *
 * **Related Files:**
 * - @/app/builds/page.tsx: Builds listing page
 * - @/app/builds/[id]/page.tsx: Build detail page
 * - @/app/builds/[id]/edit/page.tsx: Edit build page
 * - @/components/builds/BuildUpgradesTab: Upgrades tab component
 * - @/components/builds/BuildTuningTab: Tuning tab component
 * - @/lib/dropdown-helpers: formatCarOptions helper
 * - @/app/api/builds/route.ts: Create build API endpoint
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SearchableComboBox } from '@/components/ui/searchable-combobox'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Save, Wrench, Settings } from 'lucide-react'
import { BuildUpgradesTab } from '@/components/builds/BuildUpgradesTab'
import { BuildTuningTab } from '@/components/builds/BuildTuningTab'
import { LoadingSection } from '@/components/ui/loading'
import { formatCarOptions } from '@/lib/dropdown-helpers'
import type { DbCar } from '@/types/database'

// ============================================================
// TYPES
// ============================================================
// API User interface (for admin creator selection)
// - id: User ID
// - name: Display name (optional)
// - email: Email address
// - role: User role (PENDING | USER | ADMIN)
interface ApiUser {
  id: string
  name: string | null
  email: string
  role: 'PENDING' | 'USER' | 'ADMIN'
}

export default function NewBuildPage() {
  // ============================================================
  // STATE
  // ============================================================
  // - router: Next.js router for navigation
  // - searchParams: URL query params (for carId pre-selection)
  // - cars: Available cars from API
  // - users: Active users from API (for admin creator selection)
  // - currentUser: Current user info (id, role)
  // - loading: Loading state during data fetch
  // - saving: Loading state during form submit
  // - showErrorDialog: Error dialog visibility
  // - showValidationDialog: Validation dialog visibility
  // - errorMessage: Error message to display
  //
  // Form fields:
  // - carId: Selected car ID
  // - name: Build name
  // - description: Build description
  // - isPublic: Public/private flag
  // - selectedUserId: Creator ID (admin only)
  // - selectedUpgrades: Map of partId → boolean (checked state)
  // - tuningSettings: Map of settingId → value
  // - gears: Map of gear1...gear20, finalDrive → value
  // - visibleGearCount: Number of gear inputs to show (6-20)
  //
  // Why this state?
  // - cars/users: Populate dropdowns
  // - currentUser: Check if admin for creator selection
  // - selectedUpgrades/tuningSettings: Track form inputs
  // - gears: Track gear ratio inputs (expandable)
  // - visibleGearCount: Control how many gear inputs to show
  // ============================================================

  const router = useRouter()
  const searchParams = useSearchParams()
  const [cars, setCars] = useState<DbCar[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Form fields
  const [carId, setCarId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUpgrades, setSelectedUpgrades] = useState<Record<string, string | boolean>>({})
  const [tuningSettings, setTuningSettings] = useState<Record<string, string>>({})
  // Gear ratios as direct fields
  const [gears, setGears] = useState<Record<string, string>>({
    finalDrive: '',
    gear1: '',
    gear2: '',
    gear3: '',
    gear4: '',
    gear5: '',
    gear6: '',
    // Gears 7-20 can be added dynamically
  })
  const [visibleGearCount, setVisibleGearCount] = useState(6) // Start with 6 gears

  // ============================================================
  // ORIGINAL STATE (for reset functionality)
  // ============================================================
  // Store original values for reset functionality
  // For new builds, current values equal original values (empty/default)
  const [originalUpgrades, setOriginalUpgrades] = useState<Record<string, string | boolean>>({})
  const [originalTuningSettings, setOriginalTuningSettings] = useState<Record<string, string>>({})
  const [originalGears, setOriginalGears] = useState<Record<string, string>>({})

  // ============================================================
  // DATA FETCHING
  // ============================================================
  // Fetch users, cars, and pre-select car if carId in query params
  // - Fetch users: For admin creator selection
  // - Fetch cars: For car selection dropdown
  // - Fetch session: To get current user info
  // - Pre-select car: If carId in query params (from car detail page)
  //
  // Why useEffect on mount?
  // - Load data on page load
  // - Populate dropdowns
  // - Check if admin for creator selection
  // - Pre-select car from URL
  useEffect(() => {
    fetchUsers()
    fetchCars()
    fetchParts()

    // Pre-select car if carId is in query params
    const preselectedCarId = searchParams.get('carId')
    if (preselectedCarId) {
      setCarId(preselectedCarId)
    }
  }, [])

  // Fetch active users for admin creator selection
  // - Endpoint: GET /api/users?active=true
  // - Response: { users: ApiUser[] }
  // - Get session: Fetch current user info
  // - Set default: Select current user in dropdown
  // - Error handling: Console log (non-blocking)
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?active=true')
      const data = await response.json()

      // Get current user info
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()

      if (sessionData.user) {
        // Find current user in the list and set as default
        const activeUsers = data.users || []
        setUsers(activeUsers)
        const currentUserInList = activeUsers.find((u: ApiUser) => u.email === sessionData.user.email)
        if (currentUserInList) {
          setCurrentUser({ id: currentUserInList.id, role: currentUserInList.role })
          setSelectedUserId(currentUserInList.id)
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Fetch cars for car selection dropdown
  // - Endpoint: GET /api/cars
  // - Response: { cars: DbCar[] }
  // - Set loading false: Hide spinner
  // - Error handling: Console log
  const fetchCars = async () => {
    try {
      const response = await fetch('/api/cars')
      const data = await response.json()
      setCars(data.cars || [])
    } catch (error) {
      console.error('Error fetching cars:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch parts and set default values for GT Auto and Custom Parts
  // - Endpoint: GET /api/parts
  // - Response: { parts: Part[] }
  // - Sets default values for new parts based on part names
  const fetchParts = async () => {
    try {
      const response = await fetch('/api/parts')
      const data = await response.json()
      const partsData = data.parts || []

      // Set default values for GT Auto and Custom Parts
      // GT Auto defaults
      // - Wide Body Installed: "No"
      // Custom Parts defaults
      // - Front: "Standard"
      // - Side: "Standard"
      // - Rear: "Standard"
      // - Wing: "Standard"
      // - Wing Height: "Medium" (conditional)
      // - Wing Endplate: "0" (conditional)
      const defaults: Record<string, string | boolean> = {}

      for (const part of partsData) {
        if (part.name === 'Wide Body Installed') {
          defaults[part.id] = 'No'
        } else if (part.name === 'Front') {
          defaults[part.id] = 'Standard'
        } else if (part.name === 'Side') {
          defaults[part.id] = 'Standard'
        } else if (part.name === 'Rear') {
          defaults[part.id] = 'Standard'
        } else if (part.name === 'Wing') {
          defaults[part.id] = 'Standard'
        } else if (part.name === 'Wing Height') {
          defaults[part.id] = 'Medium'
        } else if (part.name === 'Wing Endplate') {
          defaults[part.id] = '0'
        } else if (part.name === 'Wheel Offset') {
          defaults[part.id] = 'Standard'
        } else if (part.name === 'Wheel Width') {
          defaults[part.id] = 'Standard'
        }
      }

      setSelectedUpgrades(defaults)
    } catch (error) {
      console.error('Error fetching parts:', error)
    }
  }

  // ============================================================
  // DROPDOWN OPTIONS
  // ============================================================
  // Format car options for SearchableComboBox
  // - Grouped by manufacturer
  // - formatCarOptions: Helper from @/lib/dropdown-helpers
  // - Memoized: Avoid re-format on every render
  const carOptions = useMemo(() => formatCarOptions(cars), [cars])

  // Format user options for SearchableComboBox
  // - Label: name || email
  // - Subtitle: email
  // - Memoized: Avoid re-format on every render
  const userOptions = useMemo(() => {
    return users.map(user => ({
      value: user.id,
      label: user.name || user.email,
      subtitle: user.email,
    }))
  }, [users])

  // ============================================================
  // FORM HANDLERS - UPGRADES
  // ============================================================
  // Handle upgrade value change (checkbox or dropdown)
  // - partId: Part ID to update
  // - value: New value (boolean for checkboxes, string for dropdowns)
  // - State: selectedUpgrades[partId] = value
  // - Submit: Convert to [{ partId, value }] array
  const handleUpgradeChange = (partId: string, value: string | boolean) => {
    setSelectedUpgrades((prev) => ({
      ...prev,
      [partId]: value,
    }))
  }

  // ============================================================
  // FORM HANDLERS - TUNING
  // ============================================================
  // Update tuning setting value
  // - settingId: Setting ID to update
  // - value: New value
  // - State: tuningSettings[settingId] = value
  // - Submit: Convert to [{ settingId, value }] array
  const handleTuningSetting = (settingId: string, value: string) => {
    setTuningSettings((prev) => ({
      ...prev,
      [settingId]: value,
    }))
  }

  // Delete tuning setting
  // - settingId: Setting ID to remove
  // - State: Delete tuningSettings[settingId]
  // - Use case: User removes custom setting
  const handleTuningSettingDelete = (settingId: string) => {
    setTuningSettings((prev) => {
      const updated = { ...prev }
      delete updated[settingId]
      return updated
    })
  }

  // ============================================================
  // FORM HANDLERS - GEARS
  // ============================================================
  // Update gear ratio value
  // - gearKey: 'gear1'...'gear20' or 'finalDrive'
  // - value: New value (e.g., "3.500")
  // - State: gears[gearKey] = value
  const handleGearChange = (gearKey: string, value: string) => {
    setGears((prev) => ({
      ...prev,
      [gearKey]: value,
    }))
  }

  // Add gear input (up to 20)
  // - Increments: visibleGearCount
  // - Max: 20 gears
  // - Use case: User has more than 6 gears
  const handleAddGear = () => {
    if (visibleGearCount < 20) {
      setVisibleGearCount((prev) => prev + 1)
    }
  }

  // Remove gear input
  // - gearNumber: Gear number to remove (7-20)
  // - Deletes: gears[`gear${gearNumber}`]
  // - Decrements: visibleGearCount if removing last gear
  // - Min: 6 gears minimum
  const handleRemoveGear = (gearNumber: number) => {
    setGears((prev) => {
      const updated = { ...prev }
      delete updated[`gear${gearNumber}`]
      return updated
    })
    if (gearNumber === visibleGearCount) {
      setVisibleGearCount((prev) => Math.max(6, prev - 1))
    }
  }

  // ============================================================
  // FORM SUBMISSION
  // ============================================================
  // Handle form submission
  // - Validation: Check carId and name are set
  // - Convert upgrades: Map to [{ partId }] array
  // - Convert settings: Map to [{ settingId, value }] array
  // - Spread gears: Include gear1...gear20, finalDrive as top-level fields
  // - API: POST /api/builds
  // - Success: Redirect to /builds/[id]
  // - Error: Show error dialog, user stays on form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!carId || !name) {
      setShowValidationDialog(true)
      return
    }

    setSaving(true)

    try {
      // Convert selected upgrades to array
      // - Checkbox parts: Include if value is true
      // - Dropdown parts: Include all (have string values)
      // - Format: { partId, value } where value is optional for checkboxes
      const upgrades = Object.entries(selectedUpgrades)
        .filter(([_, value]) => {
          // Include checkbox parts that are checked (true)
          // Include all dropdown parts (string values)
          return value === true || typeof value === 'string'
        })
        .map(([partId, value]) => {
          // For checkboxes (true), just send partId
          // For dropdowns (string), send partId and value
          if (typeof value === 'string') {
            return { partId, value }
          }
          return { partId }
        })

      // Convert tuning settings to array of settingIds (standard settings only)
      const settings = Object.entries(tuningSettings)
        .map(([settingId, value]) => ({ settingId, value }))

      const response = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          name,
          description: description || null,
          isPublic,
          userId: currentUser?.role === 'ADMIN' && selectedUserId !== currentUser.id ? selectedUserId : null,
          upgrades,
          settings,
          // Include gears as direct fields
          ...gears,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create build')
      }

      const data = await response.json()
      router.push(`/builds/${data.id}`)
    } catch (error) {
      console.error('Error creating build:', error)
      setErrorMessage('Failed to create build')
      setShowErrorDialog(true)
      setSaving(false)
    }
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Show loading spinner while fetching cars
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading cars..." />
      </div>
    )
  }

  // ============================================================
  // FORM RENDER
  // ============================================================
  // Main form layout with back button, header, card, tabs
  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Back Button */}
      <Button type="button" variant="ghost" onClick={() => router.push('/builds')} className="h-11 px-4 sm:h-9">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Builds
      </Button>

      {/* Header */}
      {/* - Title: "CREATE NEW BUILD" with Wrench icon */}
      {/* - Actions: Save button (changes to "Saving..." during submit) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          CREATE NEW BUILD
        </h1>
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Build'}
        </Button>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Build Information</CardTitle>
          <CardDescription>Basic details about your build</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Car Selection */}
          {/* - Required: User must select a car */}
          {/* - Searchable: Grouped by manufacturer with search */}
          {/* - Virtualized: Efficient for large lists */}
          {/* - Loading: Shows spinner during fetch */}
          <div className="space-y-2">
            <Label htmlFor="car">Car *</Label>
            <SearchableComboBox
              options={carOptions}
              value={carId}
              onValueChange={setCarId}
              placeholder="Select a car"
              searchPlaceholder="Search cars..."
              disabled={saving}
              isLoading={loading}
              grouped
              virtualized
            />
          </div>

          {/* Build Name */}
          {/* - Required: User must enter a name */}
          {/* - Placeholder: Examples of build names */}
          <div className="space-y-2">
            <Label htmlFor="name">Build Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Street Racing Setup, Track Day Special"
              className="min-h-[44px]"
              required
            />
          </div>

          {/* Description */}
          {/* - Optional: User can add notes about build */}
          {/* - Textarea: 4 rows for description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your build setup, tuning philosophy, or notes"
              className="min-h-[44px]"
              rows={4}
            />
          </div>

          {/* Creator Selection (Admin only) */}
          {/* - Only shown: When currentUser.role === 'ADMIN' */}
          {/* - Purpose: Create builds on behalf of other users */}
          {/* - Default: Current user selected */}
          {currentUser?.role === 'ADMIN' && (
            <div className="space-y-2">
              <Label htmlFor="creator">Creator</Label>
              <SearchableComboBox
                options={userOptions}
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder="Select creator"
                searchPlaceholder="Search users..."
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                As an admin, you can create builds on behalf of other users
              </p>
            </div>
          )}

          {/* Public Toggle */}
          {/* - Switch: Toggle for public/private */}
          {/* - Description: "Allow other users to view and clone this build" */}
          <div className="flex items-center justify-between space-x-2 border border-border rounded-lg p-4">
            <div className="space-y-1">
              <Label htmlFor="public" className="text-base font-semibold">
                Make Public
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow other users to view and clone this build
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upgrades and Tuning Tabs */}
      {/* - Two tabs: Upgrades & Parts, Tuning Settings */}
      {/* - Full width: Grid layout (2 columns) */}
      {/* - Controlled components: State managed by parent */}
      <Tabs defaultValue="upgrades" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upgrades">
            <Wrench className="h-4 w-4 mr-2" />
            Upgrades & Parts
          </TabsTrigger>
          <TabsTrigger value="tuning">
            <Settings className="h-4 w-4 mr-2" />
            Tuning Settings
          </TabsTrigger>
        </TabsList>

        {/* Upgrades Tab */}
        {/* - Component: BuildUpgradesTab */}
        {/* - Props: selectedUpgrades, onUpgradeChange */}
        {/* - Renders: Checkboxes and dropdowns for parts by category */}
        <TabsContent value="upgrades">
          <BuildUpgradesTab
            selectedUpgrades={selectedUpgrades}
            onUpgradeChange={handleUpgradeChange}
            originalUpgrades={selectedUpgrades}  // For new builds, current = original
          />
        </TabsContent>

        {/* Tuning Tab */}
        {/* - Component: BuildTuningTab */}
        {/* - Props: tuningSettings, gears, handlers */}
        {/* - Renders: Custom settings + gear ratios */}
        <TabsContent value="tuning">
          <BuildTuningTab
            tuningSettings={tuningSettings}
            onSettingChange={handleTuningSetting}
            onSettingDelete={handleTuningSettingDelete}
            gears={gears}
            onGearChange={handleGearChange}
            onAddGear={handleAddGear}
            onRemoveGear={handleRemoveGear}
            visibleGearCount={visibleGearCount}
            originalTuningSettings={tuningSettings}  // For new builds, current = original
            originalGears={gears}  // For new builds, current = original
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button */}
      {/* - Repeated: For convenience (user doesn't have to scroll up) */}
      {/* - Full width: On mobile, auto on desktop */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Build'}
        </Button>
      </div>

      {/* Validation Dialog */}
      {/* - Shows: When car or name is empty */}
      {/* - Message: "Please select a car and enter a build name before saving" */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation Error</DialogTitle>
            <DialogDescription>
              Please select a car and enter a build name before saving.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      {/* - Shows: When API call fails */}
      {/* - Message: Error from API or generic message */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
