/**
 * Build Detail Page
 *
 * Purpose: Display comprehensive details of a single car build
 * - Shows build information (name, description, creator, visibility)
 * - Displays associated car details with link to car page
 * - Shows installed upgrades grouped by category
 * - Shows tuning settings grouped by section (including gear ratios)
 * - Displays performance statistics (total laps, fastest time, average time, tracks)
 * - Provides edit, clone, and delete functionality
 * - Public/private visibility badge
 *
 * **Key Features:**
 * - Build header: Name, visibility badge, description, action buttons
 * - Car info: Manufacturer, name, year, link to car detail page
 * - Creator info: Name/email, created/updated dates
 * - Statistics card: Total laps, fastest lap, average lap, unique tracks (if data available)
 * - Upgrades display: Grouped by category with part names and values
 * - Tuning settings: Grouped by section with custom values and gear ratios
 * - Gear ratios: Special handling for transmission (gears 1-20 + final drive)
 * - Clone functionality: Create a copy of the build
 * - Edit functionality: Navigate to edit page
 * - Delete functionality: Delete with confirmation dialog
 *
 * **Data Flow:**
 * 1. Page loads → params.id extracted → fetchBuild(buildId) called
 * 2. API call: GET /api/builds/[id] → Returns build with upgrades, settings, statistics
 * 3. API call: GET /api/tuning-settings → Returns metadata for formatting settings
 * 4. Build data stored in state → groupedUpgrades and groupedSettings computed
 * 5. User can click edit → Navigate to /builds/[id]/edit
 * 6. User can click clone → POST /api/builds/[id]/clone → Navigate to new build
 * 7. User can delete → Confirm dialog → DELETE /api/builds/[id] → Navigate to /builds
 *
 * **State Management:**
 * - id: Build ID from URL params
 * - build: Build object with all details
 * - loading: Loading state during fetch
 * - deleting: Loading state during delete
 * - cloning: Loading state during clone
 * - showDeleteDialog: Delete confirmation dialog visibility
 * - showErrorDialog: Error dialog visibility
 * - errorMessage: Error message to display
 * - tuningSettingsMetadata: Map of setting ID → metadata (input type, unit, etc.)
 *
 * **Upgrades Display:**
 * - Grouped by: upgrade.category (Engine, Drivetrain, etc.)
 * - Each upgrade shows: Part name, value badge (orange)
 * - Part format: Can be string (legacy) or Part object (new)
 * - Value display: Upgrade value or "Installed" if no value
 * - Layout: 2-column grid for upgrades within each category
 * - Category header: Formatted name (kebab-case to Title Case)
 *
 * **Tuning Settings Display:**
 * - Grouped by: setting.section (Suspension, Brakes, Transmission, etc.)
 * - Each setting shows: Setting name, formatted value with unit
 * - Setting format: Can be string (legacy) or TuningSetting object (new)
 * - Special handling for transmission: Gears 1-20 + final drive (single column, 50% width)
 * - Value formatting: Based on metadata (text, number, dual, ratio)
 * - Dual values: Front/Rear displayed as two lines (e.g., spring rates)
 * - Ratio values: Front/Rear displayed as two lines (e.g., brake balance)
 * - Regular values: Orange badge with value and unit
 * - Layout: 2-column grid for settings within each section (except Transmission)
 * - Section header: Formatted name (kebab-case to Title Case)
 *
 * **Gear Ratios Handling:**
 * - Direct fields: gear1...gear20, finalDrive (stored as text to preserve formatting)
 * - Transmission section: Gears sorted in order (1st, 2nd, 3rd, etc.), final drive at end
 * - Ordinal suffixes: 1st, 2nd, 3rd, 4th, 5th, 6th, etc.
 * - Only show: Gears with non-null values
 * - Layout: Single column at 50% width on desktop (same width as grid items)
 * - Sorting: Gears in numerical order, final drive last
 *
 * **Statistics Display:**
 * - Total laps: Sum of all lap times for this build
 * - Fastest lap: Best lap time formatted as MM:SS.mmm
 * - Average lap: Average of all lap times formatted as MM:SS.mmm
 * - Unique tracks: Count of different tracks this build has been used on
 * - Condition: Only shown if statistics.totalLaps > 0
 * - Data source: build.statistics from API
 *
 * **Clone Flow:**
 * 1. User clicks clone → handleClone() called
 * 2. Sets cloning state → Shows loading on clone button
 * 3. POST /api/builds/[id]/clone → Creates copy of build
 * 4. Response: { id: string } (new build ID)
 * 5. Navigate to new build: /builds/[new-id]
 * 6. Error: Show error dialog, user stays on page
 *
 * **Delete Flow:**
 * 1. User clicks delete → handleDelete() called
 * 2. Sets showDeleteDialog → Shows delete confirmation dialog
 * 3. User confirms → confirmDelete() called
 * 4. DELETE /api/builds/[id] → Sets deleting state
 * 5. On success → Navigate to /builds
 * 6. On error → Show error dialog, user stays on page
 *
 * **API Integration:**
 * - GET /api/builds/[id]: Fetch build details
 *   - Response: Build object with upgrades[], settings[], gear1...gear20, statistics
 * - GET /api/tuning-settings: Fetch tuning settings metadata
 *   - Response: { settings: TuningSettingMetadata[] }
 * - POST /api/builds/[id]/clone: Clone build
 *   - Response: { id: string } (new build ID)
 * - DELETE /api/builds/[id]: Delete build
 *   - Response: Success/error
 *
 * **Access Control:**
 * - Authenticated: User must be logged in
 * - View: Any user can view if build is public or they own it
 * - Edit: Only creator can edit
 * - Delete: Only creator can delete
 * - Clone: Any user can clone public builds
 *
 * **Page Layout:**
 * - PageWrapper: Standard container with padding
 * - Back button: Navigates to /builds
 * - Build header: Name, badge, description, action buttons (Clone, Edit, Delete)
 * - Car info: Manufacturer, name (link to car), creator, dates
 * - Statistics: Grid of 4 stat cards (if data available)
 * - Upgrades card: Grouped by category, 2-column grid
 * - Tuning settings card: Grouped by section, 2-column grid (transmission single column)
 * - Empty state: "No upgrades or tuning settings configured"
 * - Dialogs: Delete confirmation, error display
 *
 * **Styling:**
 * - Cards: Bordered with shadow, rounded corners
 * - Buttons: min-h-[44px] for touch targets
 * - Badges: Orange (#FF7115) for values, outline for labels
 * - Links: gt-hover-text-link for hover effects
 * - Responsive: Mobile-first, stacked on mobile
 * - Gear ratios: Special styling for dual/ratio values (Front/Rear)
 *
 * **Navigation:**
 * - Back: /builds (from back button)
 * - Edit: /builds/[id]/edit (from edit button)
 * - Car: /cars/[slug] (from car name link)
 * - Clone: /builds/[new-id] (after clone)
 *
 * **Error Handling:**
 * - Fetch error: Show error dialog, navigate to /builds
 * - Clone error: Show error dialog, user stays on page
 * - Delete error: Show error dialog, user stays on page
 * - Build not found: Show "Build not found" message, back button
 *
 * **Optimizations:**
 * - useMemo: Grouped upgrades and settings memoized to avoid re-grouping on every render
 * - Parallel fetch: Build and tuning settings metadata fetched in parallel
 * - Lazy loading: Only fetch when page loads
 *
 * **Formatting Functions:**
 * - formatCategoryName: Convert kebab-case to Title Case (e.g., "engine-parts" → "Engine Parts")
 * - formatSettingName: Same as formatCategoryName for settings
 * - formatSettingValue: Format value based on metadata (dual, ratio, or regular)
 * - formatLapTime: Convert milliseconds to MM:SS.mmm format
 *
 * **Related Files:**
 * - @/app/builds/page.tsx: Builds listing page
 * - @/app/builds/new/page.tsx: Create new build page
 * - @/app/builds/[id]/edit/page.tsx: Edit build page
 * - @/app/api/builds/[id]/route.ts: Build details API endpoint
 * - @/app/api/builds/[id]/clone/route.ts: Clone build API endpoint
 * - @/lib/time: formatLapTime helper function
 * - @/components/ui: Card, Button, Badge, Dialog components
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import {
  Wrench,
  ArrowLeft,
  Globe,
  Lock,
  Copy,
  Trash2,
  Edit,
  Trophy,
  Settings,
} from 'lucide-react'
import { ToeInIcon, ToeOutIcon, ToeStraightIcon } from '@/components/icons/ToeIcons'
import { formatLapTime } from '@/lib/time'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper } from '@/components/layout'

// ============================================================
// TYPES
// ============================================================
// Part interface (for new format upgrades)
// - id: Part ID
// - name: Part display name
// - categoryId: Category ID (e.g., "engine-parts")
// - description: Optional part description
// - isActive: Whether part is active/available
interface Part {
  id: string
  name: string
  categoryId: string
  description?: string
  isActive: boolean
}

// BuildUpgrade interface (from API)
// - Can be string (legacy) or Part object (new format)
// - partId is included in new format for lookups
interface BuildUpgrade {
  id: string
  category: string
  part: string | Part  // Can be string (legacy) or Part object (new)
  partId?: string
  value: string | null
}

// TuningSetting interface (from API)
// - Can be string (legacy) or TuningSetting object (new format)
// - settingId is included in new format for lookups
interface TuningSetting {
  id: string
  name: string
  sectionId: string
  description?: string
  defaultValue?: string
  isActive: boolean
}

interface BuildSetting {
  id: string
  section: string
  setting: string | TuningSetting  // Can be string (legacy) or TuningSetting object (new)
  settingId?: string
  value: string
}

interface TuningSettingMetadata {
  id: string
  name: string
  inputType?: string
  unit?: string | null
  minValue?: number | null
  maxValue?: number | null
  step?: number | null
  displayOrder?: number | null
}

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  car: {
    id: string
    name: string
    slug: string
    manufacturer: string
    year: number | null
    category: string
    driveType: string | null
    maxPower: number | null
    weight: number | null
    pp: number | null
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
  statistics?: {
    totalLaps: number
    fastestTime: number | null
    averageTime: number | null
    uniqueTracks: number
  }
}

export default function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ============================================================
  // STATE
  // ============================================================
  // - router: Next.js router for navigation
  // - id: Build ID from URL params
  // - build: Build object from API
  // - loading: Loading state during fetch
  // - deleting: Loading state during delete
  // - cloning: Loading state during clone
  // - showDeleteDialog: Delete confirmation dialog visibility
  // - showErrorDialog: Error dialog visibility
  // - errorMessage: Error message to display
  // - tuningSettingsMetadata: Map of setting ID → metadata (for formatting)
  //
  // Why this state?
  // - build: Store fetched build for display
  // - loading: Show spinner while fetching
  // - deleting/cloning: Show loading state on buttons during operations
  // - tuningSettingsMetadata: Format setting values correctly (units, dual/ratio values)
  // ============================================================

  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [build, setBuild] = useState<Build | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [tuningSettingsMetadata, setTuningSettingsMetadata] = useState<Record<string, TuningSettingMetadata>>({})

  // ============================================================
  // DATA FETCHING
  // ============================================================
  // Fetch build and tuning settings metadata on mount
  // - Parallel fetch: Build and settings metadata fetched together
  // - Build response: Contains upgrades[], settings[], gear1...gear20, statistics
  // - Settings metadata: For formatting setting values (units, input types)
  // - Error handling: Show error dialog, redirect to /builds
  useEffect(() => {
    params.then((p) => {
      setId(p.id)
      fetchBuild(p.id)
    })
  }, [])

  const fetchBuild = async (buildId: string) => {
    try {
      const [buildRes, settingsRes] = await Promise.all([
        fetch(`/api/builds/${buildId}`),
        fetch('/api/tuning-settings?nocache=true')
      ])

      if (!buildRes.ok) {
        throw new Error('Failed to fetch build')
      }

      const data = await buildRes.json()
      setBuild(data)

      // Fetch tuning settings metadata for display formatting
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        const metadataMap: Record<string, TuningSettingMetadata> = {}
        settingsData.settings?.forEach((setting: TuningSettingMetadata) => {
          metadataMap[setting.id] = setting
        })
        setTuningSettingsMetadata(metadataMap)
      }
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
  // ACTION HANDLERS - DELETE
  // ============================================================
  // Delete build with confirmation dialog
  // - Step 1: User clicks delete → handleDelete() called
  // - Step 2: Show dialog → User confirms → confirmDelete() called
  // - Step 3: Delete API call → Redirect to /builds on success
  const handleDelete = async () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    setShowDeleteDialog(false)
    setDeleting(true)

    try {
      const response = await fetch(`/api/builds/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete build')
      }

      router.push('/builds')
    } catch (error) {
      console.error('Error deleting build:', error)
      setErrorMessage('Failed to delete build')
      setShowErrorDialog(true)
      setDeleting(false)
    }
  }

  // ============================================================
  // ACTION HANDLERS - CLONE
  // ============================================================
  // Clone build to create a copy
  // - Sets loading state → Shows "Cloning..." on button
  // - POST /api/builds/[id]/clone → Creates copy
  // - Response: { id: string } (new build ID)
  // - Success: Navigate to new build
  // - Error: Show error dialog, user stays on page
  const handleClone = async () => {
    setCloning(true)
    try {
      const response = await fetch(`/api/builds/${id}/clone`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to clone build')
      }

      const data = await response.json()
      router.push(`/builds/${data.id}`)
    } catch (error) {
      console.error('Error cloning build:', error)
      setErrorMessage('Failed to clone build')
      setShowErrorDialog(true)
      setCloning(false)
    }
  }

  // ============================================================
  // DERIVED STATE - GROUPED DATA
  // ============================================================
  // Group upgrades by category - memoized to avoid re-grouping on every render
  // - Creates: Record<category, BuildUpgrade[]>
  // - Filters: Conditional Wing parts only shown when Wing = "Custom"
  // - Performance: Memoized to avoid re-group on every render
  const groupedUpgrades = useMemo(() => {
    if (!build?.upgrades) return {}

    // Find Wing value to determine conditional display
    const wingUpgrade = build.upgrades.find(u => {
      const partName = typeof u.part === 'string' ? u.part : u.part?.name
      return partName === 'Wing'
    })
    const wingValue = wingUpgrade?.value
    const showConditionalWingParts = wingValue === 'Custom'

    return build.upgrades.reduce((acc, upgrade) => {
      const partName = typeof upgrade.part === 'string' ? upgrade.part : upgrade.part?.name

      // Filter out conditional Wing parts when Wing != "Custom"
      if (partName === 'Wing Height' || partName === 'Wing Endplate') {
        if (!showConditionalWingParts) {
          return acc
        }
      }

      if (!acc[upgrade.category]) {
        acc[upgrade.category] = []
      }
      acc[upgrade.category].push(upgrade)
      return acc
    }, {} as Record<string, BuildUpgrade[]>)
  }, [build?.upgrades])

  // Group settings by section - memoized to avoid re-grouping on every render
  const groupedSettings = useMemo(() => {
    if (!build?.settings) return {}

    const grouped: Record<string, BuildSetting[]> = {}

    // First, group by section (filter out settings with null/empty/zero values)
    build.settings.forEach((setting) => {
      const value = setting.value

      // Skip settings with null, undefined, or empty values
      if (!value || value.trim() === '') {
        return
      }

      // Check if this is a dual/sliderDual/toeAngle input (front:rear format)
      const metadata = setting.settingId ? tuningSettingsMetadata[setting.settingId] : undefined
      const inputType = metadata?.inputType
      const isDualFormat = value.includes(':') && (inputType === 'dual' || inputType === 'ratio' || inputType === 'sliderDual' || inputType === 'toeAngle')

      if (isDualFormat) {
        // For dual inputs, filter out if BOTH sides are "0" or "-0.00"
        const [front, rear] = value.split(':')
        const isFrontZero = front === '0' || front === '-0.00' || front === '0.00'
        const isRearZero = rear === '0' || rear === '-0.00' || rear === '0.00'

        if (isFrontZero && isRearZero) {
          return // Skip if both front and rear are zero
        }
      } else {
        // For single values, filter out "0", "0.00", "-0.00"
        const isZero = value === '0' || value === '0.00' || value === '-0.00'
        if (isZero) {
          return
        }
      }

      if (!grouped[setting.section]) {
        grouped[setting.section] = []
      }
      grouped[setting.section].push(setting)
    })

    // Add gears from direct fields to Transmission section
    if (build) {
      const gearSettings: BuildSetting[] = []
      // Add gears 1-20 (only if they have values)
      for (let i = 1; i <= 20; i++) {
        const gearKey = `gear${i}` as const
        const gearValue = (build as unknown as Record<string, string | null>)[gearKey]
        if (gearValue !== null && gearValue !== undefined) {
          const ordinal = i === 1 ? '1st' : i === 2 ? '2nd' : i === 3 ? '3rd' :
                         i === 4 ? '4th' : i === 5 ? '5th' : i === 6 ? '6th' :
                         i === 7 ? '7th' : i === 8 ? '8th' : i === 9 ? '9th' :
                         i === 10 ? '10th' : i === 11 ? '11th' : i === 12 ? '12th' :
                         i === 13 ? '13th' : i === 14 ? '14th' : i === 15 ? '15th' :
                         i === 16 ? '16th' : i === 17 ? '17th' : i === 18 ? '18th' :
                         i === 19 ? '19th' : '20th'
          gearSettings.push({
            id: `gear-${i}`,
            section: 'Transmission',
            setting: `${ordinal} Gear`,
            value: gearValue,
          })
        }
      }
      // Add final drive if it has a value
      if (build.finalDrive !== null && build.finalDrive !== undefined) {
        gearSettings.push({
          id: 'final-drive',
          section: 'Transmission',
          setting: 'Final Drive',
          value: build.finalDrive,
        })
      }

      // Sort gears in order, final drive at the end
      gearSettings.sort((a, b) => {
        const aIsFinal = a.setting === 'Final Drive' || (typeof a.setting === 'string' && a.setting.includes('Final'))
        const bIsFinal = b.setting === 'Final Drive' || (typeof b.setting === 'string' && b.setting.includes('Final'))
        if (aIsFinal) return 1
        if (bIsFinal) return -1
        return 0
      })

      grouped['Transmission'] = [...gearSettings, ...(grouped['Transmission'] || [])]
    }

    // Sort settings within each section
    Object.keys(grouped).forEach((section) => {
      if (section === 'Transmission') {
        // Already sorted above (gears first, then other settings)
        // No additional sorting needed
      } else {
        // For other sections, sort by displayOrder (GT7 menu order)
        grouped[section].sort((a, b) => {
          const aOrder = a.settingId ? (tuningSettingsMetadata[a.settingId]?.displayOrder ?? 999) : 999
          const bOrder = b.settingId ? (tuningSettingsMetadata[b.settingId]?.displayOrder ?? 999) : 999
          return aOrder - bOrder
        })
      }
    })

    return grouped
  }, [build?.settings, build, tuningSettingsMetadata])

  // ============================================================
  // FORMATTING HELPERS
  // ============================================================
  // Format category name from kebab-case to Title Case
  // - Example: "engine-parts" → "Engine Parts"
  // - Splits on hyphen, capitalizes first letter of each word
  const formatCategoryName = (category: string) => {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Format setting name from kebab-case to Title Case
  // - Handles both string and TuningSetting object formats
  // - Example: "spring-rate" → "Spring Rate"
  const formatSettingName = (setting: string | TuningSetting) => {
    // Handle both legacy string format and new object format
    const settingName = typeof setting === 'string' ? setting : setting.name
    return settingName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Format setting value based on metadata
  // - Dual values: Front/Rear displayed as two lines (e.g., spring rates, brake balance)
  // - Regular values: Orange badge with value and unit
  // - Custom color: #FF7115 (GT orange)
  const formatSettingValue = (setting: BuildSetting, metadata: TuningSettingMetadata | undefined) => {
    const value = setting.value
    const inputType = metadata?.inputType || 'text'
    const unit = metadata?.unit
    const customOrange = '#FF7115' // R255 G113 B21

    // Handle dual inputs (front:rear format)
    if (inputType === 'dual' && value.includes(':')) {
      const [front, rear] = value.split(':')
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-semibold" style={{ color: customOrange }}>Front: <span className="font-mono text-base">{front}</span>{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}</span>
          <span className="text-sm font-semibold" style={{ color: customOrange }}>Rear: <span className="font-mono text-base">{rear}</span>{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}</span>
        </div>
      )
    }

    // Handle ratio inputs (front:rear format)
    if (inputType === 'ratio' && value.includes(':')) {
      const [front, rear] = value.split(':')
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-semibold" style={{ color: customOrange }}>Front: <span className="font-mono text-base">{front}</span>{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}</span>
          <span className="text-sm font-semibold" style={{ color: customOrange }}>Rear: <span className="font-mono text-base">{rear}</span>{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}</span>
        </div>
      )
    }

    // Handle sliderDual inputs (centered sliders for suspension)
    // Same format as dual: front:rear with unit
    if (inputType === 'sliderDual' && value.includes(':')) {
      const [front, rear] = value.split(':')
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-semibold" style={{ color: customOrange }}>Front: <span className="font-mono text-base">{front}</span>{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}</span>
          <span className="text-sm font-semibold" style={{ color: customOrange }}>Rear: <span className="font-mono text-base">{rear}</span>{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}</span>
        </div>
      )
    }

    // Handle toeAngle inputs (signed front:rear format)
    // Negative = Out, Positive = In, Zero = Straight
    if (inputType === 'toeAngle' && value.includes(':')) {
      const [frontStr, rearStr] = value.split(':')
      const front = parseFloat(frontStr) || 0
      const rear = parseFloat(rearStr) || 0

      const getToeData = (val: number) => {
        const abs = Math.abs(val).toFixed(3)
        if (val > 0.0005) return { value: abs, direction: 'In', Icon: ToeInIcon }
        if (val < -0.0005) return { value: abs, direction: 'Out', Icon: ToeOutIcon }
        return { value: abs, direction: '', Icon: ToeStraightIcon }
      }

      const frontToe = getToeData(front)
      const rearToe = getToeData(rear)

      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-semibold flex items-center gap-1" style={{ color: customOrange }}>
            Front:
            <frontToe.Icon size={16} className="text-current" aria-hidden="true" />
            <span className="font-mono text-base">{frontToe.value}</span>
            {frontToe.direction && <span className="text-xs">{frontToe.direction}</span>}
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </span>
          <span className="text-sm font-semibold flex items-center gap-1" style={{ color: customOrange }}>
            Rear:
            <rearToe.Icon size={16} className="text-current" aria-hidden="true" />
            <span className="font-mono text-base">{rearToe.value}</span>
            {rearToe.direction && <span className="text-xs">{rearToe.direction}</span>}
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </span>
        </div>
      )
    }

    // Handle Ballast Positioning - show position label (Front/Center/Rear)
    const settingName = typeof setting.setting === 'string' ? setting.setting : setting.setting.name
    if (settingName === 'Ballast Positioning') {
      const numValue = parseFloat(value || '0')

      let positionLabel = 'Center'
      let displayValue = '0'

      if (numValue < 0) {
        positionLabel = 'Front'
        displayValue = value || '0'  // Already has - sign
      } else if (numValue > 0) {
        positionLabel = 'Rear'
        displayValue = `+${value}`  // Add + sign for display
      }

      return (
        <Badge
          variant="secondary"
          className="text-base font-mono px-3 py-1"
          style={{
            backgroundColor: customOrange,
            color: 'white',
            border: 'none'
          }}
        >
          {displayValue} {positionLabel}
        </Badge>
      )
    }

    // Regular value with orange badge
    return (
      <Badge
        variant="secondary"
        className="text-base font-mono px-3 py-1"
        style={{
          backgroundColor: customOrange,
          color: 'white',
          border: 'none'
        }}
      >
        {value}
        {unit && <span className="ml-1 text-sm opacity-90">{unit}</span>}
      </Badge>
    )
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Show loading spinner while fetching build
  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading build..." />
      </PageWrapper>
    )
  }

  // Show not found message if build doesn't exist
  if (!build) {
    return (
      <PageWrapper>
        <div className="text-center py-12 border border-border rounded-lg">
          <p className="text-lg font-semibold">Build not found</p>
        </div>
      </PageWrapper>
    )
  }

  // ============================================================
  // PAGE RENDER
  // ============================================================
  // Main page layout with back button, header, stats, upgrades, tuning
  return (
    <PageWrapper>
      {/* Back Button */}
      {/* - Navigates to /builds */}
      {/* - Icon: ArrowLeft */}
      <Button variant="ghost" onClick={() => router.push('/builds')} className="h-11 px-4 sm:h-9">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Builds
      </Button>

      {/* Build Header */}
      {/* - Name: Large bold text */}
      {/* - Badge: Public (Globe icon) or Private (Lock icon) */}
      {/* - Description: Optional text below name */}
      {/* - Actions: Clone, Edit, Delete buttons */}
      <div className="border border-border rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-3xl font-bold">{build.name}</h1>
              <Badge
                variant={build.isPublic ? 'default' : 'outline'}
                className="flex items-center gap-1 w-fit"
              >
                {build.isPublic ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Private
                  </>
                )}
              </Badge>
            </div>
            {build.description && (
              <p className="text-muted-foreground">{build.description}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="ghostBordered"
              size="sm"
              onClick={handleClone}
              disabled={cloning}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <Copy className="h-4 w-4 mr-2" />
              {cloning ? 'Cloning...' : 'Clone'}
            </Button>
            <Button
              variant="ghostBordered"
              size="sm"
              onClick={() => router.push(`/builds/${id}/edit`)}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Car Info */}
        {/* - CAR: Link to car detail page */}
        {/* - CREATOR: User name or email */}
        {/* - CREATED/UPDATED: Formatted dates */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-mono text-xs">CAR</p>
            <Link
              href={`/cars/${build.car.slug}`}
              className="font-semibold hover:text-primary gt-hover-heading"
            >
              {build.car.manufacturer} {build.car.name}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground font-mono text-xs">CREATOR</p>
            <p className="font-semibold">{build.user.name || build.user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-mono text-xs">CREATED</p>
            <p className="font-semibold">
              {new Date(build.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground font-mono text-xs">UPDATED</p>
            <p className="font-semibold">
              {new Date(build.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Card */}
      {/* - Only shown if build has statistics (totalLaps > 0) */}
      {/* - TOTAL LAPS: Sum of all laps */}
      {/* - FASTEST LAP: Best time formatted as MM:SS.mmm */}
      {/* - AVERAGE LAP: Average of all laps formatted as MM:SS.mmm */}
      {/* - TRACKS: Unique tracks this build has been used on */}
      {build.statistics && build.statistics.totalLaps > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Statistics
            </CardTitle>
            <CardDescription>
              Performance data from {build.statistics.totalLaps} laps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-muted-foreground text-xs font-mono">TOTAL LAPS</p>
                <p className="text-xl sm:text-2xl font-bold">{build.statistics.totalLaps}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-mono">FASTEST LAP</p>
                <p className="text-xl sm:text-2xl font-bold text-primary font-mono">
                  {build.statistics.fastestTime
                    ? formatLapTime(build.statistics.fastestTime)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-mono">AVERAGE LAP</p>
                <p className="text-xl sm:text-2xl font-bold font-mono">
                  {build.statistics.averageTime
                    ? formatLapTime(build.statistics.averageTime)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-mono">TRACKS</p>
                <p className="text-xl sm:text-2xl font-bold">{build.statistics.uniqueTracks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrades Card */}
      {/* - Grouped by category (Engine, Drivetrain, etc.) */}
      {/* - 2-column grid for upgrades within each category */}
      {/* - Shows part name and value badge (orange) */}
      {Object.keys(groupedUpgrades).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Upgrades & Parts
            </CardTitle>
            <CardDescription>
              {build.upgrades.length} parts installed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedUpgrades).map(([category, upgrades]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-primary mb-2">
                  {formatCategoryName(category)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {upgrades.map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="flex items-center justify-between px-3 py-2.5 border border-border rounded text-sm min-h-[72px]"
                    >
                      <span className="truncate flex-1">
                        {typeof upgrade.part === 'string' ? upgrade.part : upgrade.part.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-base font-mono shrink-0 ml-2 px-3 py-1"
                        style={{ backgroundColor: '#FF7115', color: 'white', border: 'none' }}
                      >
                        {upgrade.value || 'Installed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tuning Settings Card */}
      {/* - Grouped by section (Suspension, Brakes, Transmission, etc.) */}
      {/* - 2-column grid for settings within each section */}
      {/* - Transmission: Single column at 50% width (special handling for gears) */}
      {/* - Shows setting name and formatted value (with unit, dual/ratio values) */}
      {Object.keys(groupedSettings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Tuning Settings
            </CardTitle>
            <CardDescription>
              {build.settings.length} settings configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedSettings).map(([category, settings]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-primary mb-2">
                  {formatCategoryName(category)}
                </h3>
                {/* Transmission: single column at 50% width on desktop (same width as grid items), full width on mobile */}
                {/* Other sections: 2 column grid */}
                <div className={category === 'Transmission'
                  ? 'sm:w-1/2 space-y-2'
                  : 'grid grid-cols-1 sm:grid-cols-2 gap-2'
                }>
                  {settings.map((settingItem) => {
                    const metadata = settingItem.settingId ? tuningSettingsMetadata[settingItem.settingId] : undefined
                    return (
                      <div
                        key={settingItem.id}
                        className="flex items-center justify-between px-3 py-2.5 border border-border rounded text-sm min-h-[72px]"
                      >
                        <span className="truncate flex-1">{formatSettingName(settingItem.setting)}</span>
                        {formatSettingValue(settingItem, metadata)}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {/* - Shown when build has no upgrades or tuning settings */}
      {Object.keys(groupedUpgrades).length === 0 &&
        Object.keys(groupedSettings).length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No upgrades or tuning settings configured
              </p>
            </CardContent>
          </Card>
        )}

      {/* Delete Confirmation Dialog */}
      {/* - Warning: "This action cannot be undone" */}
      {/* - Shows build name and car info */}
      {/* - Actions: Cancel (outline), Delete (destructive) */}
      {/* - Loading: Shows spinner during delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Build?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this build?
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="font-medium">{build?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {build?.car.manufacturer} {build?.car.name}
                </p>
              </div>
              <p className="text-destructive text-sm mt-2">
                This action cannot be undone.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      {/* - Shows error message from API or generic message */}
      {/* - Action: Close button (outline variant) */}
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
    </PageWrapper>
  )
}
