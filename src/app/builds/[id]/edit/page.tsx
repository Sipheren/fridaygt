/**
 * Edit Build Page
 *
 * Purpose: Form page for editing an existing car build
 * - Similar to new build page, but loads existing data
 * - Car selection is read-only (cannot change car after creation)
 * - Multi-step form with basic info, upgrades, and tuning tabs
 * - Parts upgrades organized by category
 * - Tuning settings with custom values
 * - Gear ratios (1-20 gears + final drive)
 * - Admin can change build ownership
 * - Public/private visibility toggle
 *
 * **Key Features:**
 * - Car (read-only): Display car name, prevent changes
 * - Build name: Required text input
 * - Description: Optional textarea
 * - Public toggle: Switch for public/private visibility
 * - Creator selection: Admin-only dropdown to change ownership
 * - Upgrades tab: Checkboxes for parts by category
 * - Tuning tab: Custom settings + gear ratios
 * - Validation: Client-side validation before submit
 * - Success: Redirect to /builds/[id] on save
 *
 * **Form Flow:**
 * 1. Page loads → Fetch build, users, current user
 * 2. Load existing data: upgrades, settings, gears into form
 * 3. User edits form: Name, description, public, creator, upgrades, tuning
 * 4. Submit: Validate → PATCH /api/builds/[id] → Redirect to build detail
 * 5. Error: Show error dialog, user stays on form
 *
 * **State Management:**
 * - id: Build ID from URL params
 * - users: Active users from API (for admin creator selection)
 * - currentUser: Current user info (id, role)
 * - loading: Loading state during data fetch
 * - saving: Loading state during form submit
 * - showErrorDialog: Error dialog visibility
 * - showValidationDialog: Validation dialog visibility
 * - errorMessage: Error message to display
 * - carName: Formatted car name (read-only display)
 * - selectedUserId: Creator ID (admin only)
 * - selectedUpgrades: Map of partId → boolean (checked state)
 * - tuningSettings: Map of settingId → value
 * - gears: Map of gear1...gear20, finalDrive → value
 * - visibleGearCount: Number of gear inputs to show (6-20)
 *
 * **Data Loading:**
 * - Build: GET /api/builds/[id] → Returns build with upgrades, settings, gears
 * - Users: GET /api/users?active=true → For admin creator selection
 * - Session: GET /api/auth/session → To get current user info
 * - Upgrades: Converted to checkbox state (partId → true/false)
 * - Settings: Converted to input state (settingId → value)
 * - Gears: Loaded from direct fields (gear1...gear20, finalDrive)
 * - visibleGearCount: Dynamically set based on number of gears
 *
 * **Upgrades Tab:**
 * - Parts grouped by category (Engine, Drivetrain, etc.)
 * - Checkboxes for each part
 * - Visual: Part name, optional value badge
 * - State: selectedUpgrades[partId] = true/false
 * - Load: Map build.upgrades to checkbox state (partId → true)
 * - Submit: Converts to [{ partId }] array
 *
 * **Tuning Tab:**
 * - Settings grouped by section (Suspension, Brakes, etc.)
 * - Custom inputs: Text/number/select based on setting type
 * - Add/remove: Dynamic settings (user can add/remove)
 * - Gear ratios: 20 gear inputs + final drive (expandable 6-20)
 * - State: tuningSettings[settingId] = value
 * - Load: Map build.settings to input state (settingId → value)
 * - Submit: Converts to [{ settingId, value }] array
 * - Gears: Spread as direct fields (gear1, gear2, ..., finalDrive)
 *
 * **Gear Ratios:**
 * - Direct fields: gear1...gear20, finalDrive (text to preserve formatting)
 * - Expandable: Start with 6, add up to 20
 * - Optional: User can leave empty
 * - Display: Text inputs (allow ratios like "3.500", "4.100", etc.)
 * - Load: Load from build.gear1...gear20, build.finalDrive
 * - visibleGearCount: Dynamically set based on highest gear with value
 * - Submit: Spread as top-level fields in request body
 *
 * **Admin Creator Selection:**
 * - Only shown: When currentUser.role === 'ADMIN'
 * - Purpose: Change build ownership
 * - Default: Current build owner selected
 * - User options: name || email as label, email as subtitle
 * - Submit: userId only sent if different from current owner
 *
 * **Validation:**
 * - Name: Required (name must not be empty)
 * - Upgrades: Optional (can save with no upgrades)
 * - Tuning: Optional (can save with no tuning)
 * - Gears: Optional (can save with no gears)
 * - Dialog: Shows validation error if submit with invalid data
 *
 * **API Integration:**
 * - GET /api/builds/[id]: Fetch existing build
 *   - Response: Build object with upgrades[], settings[], gear1...gear20
 * - GET /api/users?active=true: Fetch active users (admin)
 * - GET /api/auth/session: Fetch current user info
 * - PATCH /api/builds/[id]: Update build
 *   - Request body: { name, description, isPublic, userId?, upgrades[], settings[], gears... }
 *   - Response: Success/error
 * - Success: router.push('/builds/[id]')
 *
 * **Tabs Component:**
 * - Two tabs: Upgrades & Parts, Tuning Settings
 * - Icons: Wrench (upgrades), Settings (tuning)
 * - Separate components: BuildUpgradesTab, BuildTuningTab
 * - Props: State and handlers passed down
 * - Controlled: Parent manages all state
 *
 * **Error Handling:**
 * - Fetch build: Show error dialog, redirect to /builds
 * - Fetch users: Console log error (non-blocking)
 * - Submit: Show error dialog with message
 * - Validation: Show validation dialog
 * - User stays: Can retry after error
 *
 * **Page Layout:**
 * - Back button: Navigates to /builds/[id]
 * - Header: Title "EDIT BUILD", icon, save button
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
 * - Read-only car: Muted background, border
 *
 * **Differences from New Build Page:**
 * - Car: Read-only (cannot change)
 * - Data loading: Fetch existing build and populate form
 * - Default values: Load from build instead of empty
 * - Back button: Navigates to build detail instead of builds list
 * - Title: "EDIT BUILD" instead of "CREATE NEW BUILD"
 * - API: PATCH instead of POST
 *
 * **Related Files:**
 * - @/app/builds/page.tsx: Builds listing page
 * - @/app/builds/[id]/page.tsx: Build detail page
 * - @/app/builds/new/page.tsx: Create new build page (similar structure)
 * - @/components/builds/BuildUpgradesTab: Upgrades tab component
 * - @/components/builds/BuildTuningTab: Tuning tab component
 * - @/app/api/builds/[id]/route.ts: Update build API endpoint
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

// ============================================================
// TYPES
// ============================================================
// Part interface (for new format upgrades)
interface Part {
  id: string
  name: string
  categoryId: string
  description?: string
  isActive: boolean
}

interface BuildUpgrade {
  id: string
  category: string
  part: string | Part
  partId?: string
  value?: string | null // Dropdown value for GT Auto and Custom Parts
}

interface BuildSetting {
  id: string
  section: string
  setting: string
  value: string
  settingId?: string
}

interface ApiUser {
  id: string
  name: string | null
  email: string
  role: 'PENDING' | 'USER' | 'ADMIN'
}

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  carId: string
  userId: string
  car: {
    id: string
    name: string
    manufacturer: string
    year: number | null
  }
  upgrades: BuildUpgrade[]
  settings: BuildSetting[]
  // Gear ratios as direct fields (text to preserve formatting)
  finalDrive: string | null
  gear1: string | null
  gear2: string | null
  gear3: string | null
  gear4: string | null
  gear5: string | null
  gear6: string | null
  gear7: string | null
  gear8: string | null
  gear9: string | null
  gear10: string | null
  gear11: string | null
  gear12: string | null
  gear13: string | null
  gear14: string | null
  gear15: string | null
  gear16: string | null
  gear17: string | null
  gear18: string | null
  gear19: string | null
  gear20: string | null
}

export default function EditBuildPage({ params }: { params: Promise<{ id: string }> }) {
  // ============================================================
  // STATE
  // ============================================================
  // - router: Next.js router for navigation
  // - id: Build ID from URL params
  // - users: Active users from API (for admin creator selection)
  // - currentUser: Current user info (id, role)
  // - loading: Loading state during data fetch
  // - saving: Loading state during form submit
  // - showErrorDialog: Error dialog visibility
  // - showValidationDialog: Validation dialog visibility
  // - errorMessage: Error message to display
  //
  // Form fields:
  // - name: Build name
  // - description: Build description
  // - isPublic: Public/private flag
  // - carName: Formatted car name (read-only display)
  // - selectedUserId: Creator ID (admin only)
  // - selectedUpgrades: Map of partId → boolean (checked state)
  // - tuningSettings: Map of settingId → value
  // - gears: Map of gear1...gear20, finalDrive → value
  // - visibleGearCount: Number of gear inputs to show (6-20)
  //
  // Why this state?
  // - users: Populate admin creator dropdown
  // - currentUser: Check if admin for creator selection
  // - selectedUpgrades/tuningSettings: Track form inputs
  // - gears: Track gear ratio inputs (expandable)
  // - visibleGearCount: Control how many gear inputs to show
  // ============================================================

  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [users, setUsers] = useState<ApiUser[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [carName, setCarName] = useState('')
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
  // DATA FETCHING
  // ============================================================
  // Fetch build, users, and current user on mount
  // - Build: Load existing data (upgrades, settings, gears)
  // - Users: For admin creator selection
  // - Session: To get current user info and check if admin
  useEffect(() => {
    params.then((p) => {
      setId(p.id)
      fetchUsers()
      fetchBuild(p.id)
    })
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?active=true')
      const data = await response.json()

      // Get current user info
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()

      if (sessionData.user) {
        const activeUsers = data.users || []
        setUsers(activeUsers)
        const currentUserInList = activeUsers.find((u: ApiUser) => u.email === sessionData.user.email)
        if (currentUserInList) {
          setCurrentUser({ id: currentUserInList.id, role: currentUserInList.role })
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Fetch build data and populate form fields
  // - Load: name, description, isPublic, car, userId
  // - Convert upgrades: Build.upgrades[] → selectedUpgrades map
  // - Convert settings: Build.settings[] → tuningSettings map
  // - Load gears: Build.gear1...gear20 → gears map
  // - Set visibleGearCount: Based on highest gear with value
  // - Error handling: Show dialog, redirect to /builds
  const fetchBuild = async (buildId: string) => {
    try {
      const response = await fetch(`/api/builds/${buildId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch build')
      }
      const data: Build = await response.json()

      // Set form fields
      setName(data.name)
      setDescription(data.description || '')
      setIsPublic(data.isPublic)
      setCarName(`${data.car.manufacturer} ${data.car.name}${data.car.year ? ` '${String(data.car.year).slice(-2)}` : ''}`)
      setSelectedUserId(data.userId)

      // Convert upgrades to checkbox/dropdown state
      // - Checkbox parts (existing): value = true
      // - Dropdown parts (GT Auto, Custom Parts): value = string option
      const upgradesMap: Record<string, string | boolean> = {}
      data.upgrades.forEach((upgrade) => {
        // Use partId if available, otherwise skip (for legacy data)
        if (upgrade.partId) {
          // If value exists (dropdown part), use it; otherwise default to true (checkbox)
          upgradesMap[upgrade.partId] = upgrade.value || true
        }
      })
      setSelectedUpgrades(upgradesMap)

      // Convert settings to input state (standard settings only, gears are direct fields)
      const settingsMap: Record<string, string> = {}
      data.settings.forEach((setting) => {
        if (setting.settingId) {
          // Standard setting: use settingId as key
          settingsMap[setting.settingId] = setting.value
        }
        // Skip legacy settings without settingId (old data)
      })
      setTuningSettings(settingsMap)

      // Load gears from direct fields (already strings now)
      const gearsData: Record<string, string> = {}
      // Load final drive
      if (data.finalDrive !== null && data.finalDrive !== undefined) {
        gearsData.finalDrive = data.finalDrive
      }
      // Load gears 1-20
      for (let i = 1; i <= 20; i++) {
        const gearKey = `gear${i}` as const
        const gearValue = (data as unknown as Record<string, string | null>)[gearKey]
        if (gearValue !== null && gearValue !== undefined) {
          gearsData[gearKey] = gearValue
          // Track how many gears we have to show the right amount
          if (i > visibleGearCount) {
            setVisibleGearCount(i)
          }
        }
      }
      setGears(gearsData)
    } catch (error) {
      console.error('Error fetching build:', error)
      setErrorMessage('Failed to load build')
      setShowErrorDialog(true)
      router.push('/builds')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // DROPDOWN OPTIONS
  // ============================================================
  // Format user options for SearchableComboBox
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
  const handleTuningSetting = (settingId: string, value: string) => {
    setTuningSettings((prev) => ({
      ...prev,
      [settingId]: value,
    }))
  }

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
  const handleGearChange = (gearKey: string, value: string) => {
    setGears((prev) => ({
      ...prev,
      [gearKey]: value,
    }))
  }

  const handleAddGear = () => {
    if (visibleGearCount < 20) {
      setVisibleGearCount((prev) => prev + 1)
    }
  }

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
  // - Validation: Check name is set
  // - Convert upgrades: Map to [{ partId }] array
  // - Convert settings: Map to [{ settingId, value }] array
  // - Spread gears: Include gear1...gear20, finalDrive as top-level fields
  // - API: PATCH /api/builds/[id]
  // - Success: Redirect to /builds/[id]
  // - Error: Show error dialog, user stays on form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name) {
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

      const response = await fetch(`/api/builds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          isPublic,
          userId: currentUser?.role === 'ADMIN' && selectedUserId ? selectedUserId : undefined,
          upgrades,
          settings,
          // Include gears as direct fields
          ...gears,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update build')
      }

      router.push(`/builds/${id}`)
    } catch (error) {
      console.error('Error updating build:', error)
      setErrorMessage('Failed to update build')
      setShowErrorDialog(true)
      setSaving(false)
    }
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Show loading spinner while fetching build
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading build..." />
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
      <Button type="button" variant="ghost" onClick={() => router.push(`/builds/${id}`)} className="h-11 px-4 sm:h-9">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Build
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          EDIT BUILD
        </h1>
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Build Information</CardTitle>
          <CardDescription>Basic details about your build</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Car (Read-only) */}
          <div className="space-y-2">
            <Label>Car</Label>
            <div className="px-3 py-2 border border-border rounded-lg bg-muted/50 text-sm">
              {carName}
            </div>
            <p className="text-xs text-muted-foreground">
              Car cannot be changed after creation
            </p>
          </div>

          {/* Build Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Build Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Street Racing Setup, Track Day Special"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your build setup, tuning philosophy, or notes"
              rows={4}
            />
          </div>

          {/* Creator Selection (Admin only) */}
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
                As an admin, you can change the creator of this build
              </p>
            </div>
          )}

          {/* Public Toggle */}
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
      <Tabs defaultValue="upgrades" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upgrades" type="button">
            <Wrench className="h-4 w-4 mr-2" />
            Upgrades & Parts
          </TabsTrigger>
          <TabsTrigger value="tuning" type="button">
            <Settings className="h-4 w-4 mr-2" />
            Tuning Settings
          </TabsTrigger>
        </TabsList>

        {/* Upgrades Tab */}
        <TabsContent value="upgrades">
          <BuildUpgradesTab
            selectedUpgrades={selectedUpgrades}
            onUpgradeChange={handleUpgradeChange}
          />
        </TabsContent>

        {/* Tuning Tab */}
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
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation Error</DialogTitle>
            <DialogDescription>
              Please enter a build name before saving.
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
