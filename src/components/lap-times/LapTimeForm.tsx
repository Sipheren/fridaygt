/**
 * Lap Time Form Component
 *
 * Purpose: Form for recording lap times with track, build, time, conditions, and session type
 * - Captures all essential lap time data in a single form
 * - Time parsing/validation with live preview (mm:ss.sss or ss.sss format)
 * - Build selection with inline creation (QuickBuildModal integration)
 * - Conditions dropdown (Dry, Wet, Mixed, Not specified)
 * - Session type selection (Race or Qualifying)
 * - Client-side validation with error display
 *
 * **Key Features:**
 * - Track selection: SearchableComboBox with grouping by location
 * - Build selection: BuildSelector with create new build option
 * - Time input: Parses mm:ss.sss or ss.sss format, shows live preview
 * - Time validation: 10 seconds minimum, 30 minutes maximum
 * - Conditions: Optional dropdown (Dry, Wet, Mixed, Not specified)
 * - Session type: Radio buttons (R = Race, Q = Qualifying)
 * - Notes: Optional textarea for additional details
 * - Quick build creation: Opens modal to create build inline
 *
 * **Data Flow:**
 * 1. Mount: Fetch tracks and builds via parallel API calls
 * 2. User fills form: Selects track, build, enters time, conditions, session type, notes
 * 3. User submits: Validate form data (track, build, time required)
 * 4. Parse time: Convert mm:ss.sss or ss.sss to milliseconds
 * 5. Validate time: Check range (10s - 30min), format validity
 * 6. POST to /api/lap-times with { trackId, carId, buildId, timeMs, notes, conditions, sessionType }
 * 7. Success: Redirect to /lap-times page and refresh
 * 8. Error: Display error message, keep form open
 *
 * **State:**
 * - tracks: Array of DbTrack objects (for track dropdown)
 * - allBuilds: Array of Build objects (for build selector)
 * - buildsLoading: Builds API call in progress
 * - loading: Form submission in progress
 * - error: Validation or API error message
 * - showBuildModal: QuickBuildModal open state
 * - Form fields: trackId, buildIds (array), timeInput, notes, conditions, sessionType
 *
 * **Build Creation Flow:**
 * - User clicks "Create New Build" in BuildSelector
 * - QuickBuildModal opens (preselects track/car if applicable)
 * - User creates build with minimal setup (car + name + description)
 * - Modal closes, calls handleBuildCreated callback
 * - Fetch new build details from API and add to allBuilds array
 * - Set buildIds to [newBuildId] (auto-select newly created build)
 * - User can proceed with form submission
 *
 * **Time Parsing:**
 * - Formats accepted: "mm:ss.sss" (1:23.456) or "ss.sss" (83.456)
 * - Parsed by: parseLapTime() helper from @/lib/time
 * - Returns: milliseconds (number) or null if invalid
 * - Validation: isValidLapTime() checks 10s - 30min range
 * - Live preview: Shows formatted time (mm:ss.sss) when input is valid
 *
 * **Conditions:**
 * - Options: Not specified (default), Dry, Wet, Mixed Conditions
 * - Storage: "not-specified" stored as null in database
 * - Purpose: Track weather conditions during lap time
 * - Optional: User can leave as "Not specified"
 *
 * **Session Type:**
 * - R (Race): Race session (primary color)
 * - Q (Qualifying): Qualifying session (secondary color)
 * - Storage: Stored as single character ('R' or 'Q')
 * - Required: User must select one
 * - Display: Radio buttons with visual distinction
 *
 * **Validation Rules:**
 * - trackId: Required (must not be empty string)
 * - buildIds: Required (array must have at least one element)
 * - timeInput: Required (must parse to valid time in range)
 * - notes: Optional (can be empty string)
 * - conditions: Optional (can be "not-specified")
 * - sessionType: Required (must be 'R' or 'Q')
 *
 * **API Integration:**
 * - POST /api/lap-times: Create new lap time
 * - Request body: { trackId, carId, buildId, timeMs, notes?, conditions?, sessionType }
 * - Response: { id, ...lapTimeData }
 * - Success: Redirect to /lap-times (router.push + router.refresh)
 * - Error: Display error message with details if available
 *
 * **Parallel Data Fetching:**
 * - Tracks: /api/tracks (all active tracks)
 * - Builds: /api/builds?myBuilds=true (user's builds only)
 * - Promise.all: Fetch both simultaneously on mount
 * - Single-pass: Load data once, no refetch on re-renders
 *
 * **Error Handling:**
 * - Validation errors: Show message above form (AlertCircle icon + red background)
 * - API errors: Parse response for error.details (append to error.message)
 * - Network errors: Generic "Failed to save lap time" message
 * - Keep form open: Don't reset on error, let user fix and retry
 *
 * **Navigation:**
 * - Success: router.push('/lap-times') + router.refresh()
 * - Cancel: router.back() (go to previous page)
 * - Disabled during loading: Prevents double submission
 *
 * **Debugging Tips:**
 * - Tracks not loading: Check /api/tracks response
 * - Builds not loading: Check /api/builds?myBuilds=true response
 * - Build creation not working: Verify QuickBuildModal onBuildCreated callback
 * - Time parsing failing: Check parseLapTime() accepts format
 * - Time validation failing: Check isValidLapTime() range (10s - 30min)
 * - Submit blocked: Check validation rules (trackId, buildIds, timeInput all required)
 * - Redirect not working: Check router.push('/lap-times') is correct path
 * - CarId extraction: Verify selectedBuild.car.id exists
 *
 * **Common Issues:**
 * - Time format rejected: Ensure mm:ss.sss or ss.sss format (e.g., "1:23.456" or "83.456")
 * - Build not selected: Check buildIds array has at least one element
 * - CarId missing: Verify selectedBuild.car.id is populated
 * - Modal not opening: Check showBuildModal state is set to true
 * - New build not selected: Check handleBuildCreated callback sets buildIds
 * - Error not showing: Check error state is displayed in UI above form
 *
 * **Related Files:**
 * - /api/lap-times/route.ts: POST endpoint for creating lap times
 * - /api/tracks/route.ts: Fetch all active tracks
 * - /api/builds/route.ts: Fetch user's builds (myBuilds=true filter)
 * - @/lib/time.ts: parseLapTime, formatLapTime, isValidLapTime helpers
 * - @/lib/dropdown-helpers.ts: formatTrackOptions helper for SearchableComboBox
 * - @/components/builds/BuildSelector.tsx: Build selection component
 * - @/components/builds/QuickBuildModal.tsx: Quick build creation modal
 * - @/types/database.ts: DbTrack type definition
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableComboBox } from '@/components/ui/searchable-combobox'
import { BuildSelector } from '@/components/builds/BuildSelector'
import { QuickBuildModal } from '@/components/builds/QuickBuildModal'
import { parseLapTime, formatLapTime, isValidLapTime } from '@/lib/time'
import { formatTrackOptions } from '@/lib/dropdown-helpers'
import { Clock, Car as CarIcon, MapPin, AlertCircle } from 'lucide-react'
import type { DbTrack } from '@/types/database'

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  car: {
    id: string
    name: string
    slug: string
    manufacturer: string
  }
}

// ============================================================
// MAIN COMPONENT - LapTimeForm
// ============================================================
// Form for recording lap times with track, build, time, conditions, session type
//
// Component Flow:
// 1. Mount: Fetch tracks and builds via parallel API calls
// 2. User fills form: Selects track, build, enters time, conditions, session type, notes
// 3. User submits: Validate form data, parse time, POST to API
// 4. Success: Redirect to /lap-times page, refresh data
// 5. Error: Display error message, keep form open for retry
//
// Form Fields:
// - Track (required): SearchableComboBox with grouping by location
// - Build (required): BuildSelector with inline creation
// - Time (required): Text input with live preview, parsed to milliseconds
// - Conditions (optional): Dropdown (Dry, Wet, Mixed, Not specified)
// - Session Type (required): Radio buttons (R = Race, Q = Qualifying)
// - Notes (optional): Textarea for additional details
//
// Build Creation:
// - User can click "Create New Build" in BuildSelector
// - Opens QuickBuildModal for inline build creation
// - New build is fetched and added to allBuilds array
// - Auto-selects newly created build in form
//
// Time Parsing:
// - Accepts: "mm:ss.sss" (1:23.456) or "ss.sss" (83.456)
// - Parsed to: milliseconds (number)
// - Validated: 10 seconds minimum, 30 minutes maximum
// - Preview: Shows formatted time when input is valid
// ============================================================

export function LapTimeForm() {
  const router = useRouter()

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  // tracks: Array of all tracks (for track dropdown)
  // allBuilds: Array of user's builds (for build selector)
  // buildsLoading: Builds API call in progress (show loading spinner)
  // loading: Form submission in progress (disable submit button)
  // error: Validation or API error message (displayed above form)
  // showBuildModal: QuickBuildModal open state (controlled)

  const [tracks, setTracks] = useState<DbTrack[]>([])
  const [allBuilds, setAllBuilds] = useState<Build[]>([])
  const [buildsLoading, setBuildsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBuildModal, setShowBuildModal] = useState(false)

  // ============================================================
  // FORM STATE
  // ============================================================
  // trackId: Selected track UUID (required)
  // buildIds: Array of selected build IDs (only first element used for lap time)
  // timeInput: Raw time input string (mm:ss.sss or ss.sss format)
  // notes: Optional notes about the lap (free text)
  // conditions: Weather conditions (Dry, Wet, Mixed, Not specified)
  // sessionType: Session type ('R' = Race, 'Q' = Qualifying)

  const [trackId, setTrackId] = useState('')
  const [buildIds, setBuildIds] = useState<string[]>([])
  const [timeInput, setTimeInput] = useState('')
  const [notes, setNotes] = useState('')
  const [conditions, setConditions] = useState('')
  const [sessionType, setSessionType] = useState<'Q' | 'R'>('R')

  // ============================================================
  // DATA FETCHING - Tracks and Builds
  // ============================================================
  // Fetch tracks and user's builds on component mount
  // Parallel API calls with Promise.all for performance
  //
  // API Calls:
  // - Tracks: /api/tracks (all active tracks)
  // - Builds: /api/builds?myBuilds=true (user's builds only)
  //
  // Why Parallel?
  // - Tracks and builds are independent data
  // - Promise.all fetches both simultaneously
  // - Reduces total load time vs sequential calls
  //
  // Why Empty Deps Array?
  // - Only fetch once on mount
  // - Tracks and builds don't change during form lifecycle
  // - Prevents unnecessary re-fetches on re-renders
  //
  // Error Handling:
  // - Try-catch wraps API calls
  // - Error state displayed to user above form
  // - Loading state cleared in finally block
  //
  // Debugging Tips:
  // - Tracks empty: Check /api/tracks response
  // - Builds empty: Check /api/builds?myBuilds=true response
  // - Error shown: Check browser console for network errors
  // ============================================================

  useEffect(() => {
    async function loadData() {
      try {
        setBuildsLoading(true)
        const [tracksRes, buildsRes] = await Promise.all([
          fetch('/api/tracks'),
          fetch('/api/builds?myBuilds=true'),
        ])

        const tracksData = await tracksRes.json()
        const buildsData = await buildsRes.json()

        setTracks(tracksData.tracks || [])
        setAllBuilds(buildsData.builds || [])
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load tracks and builds')
      } finally {
        setBuildsLoading(false)
      }
    }

    loadData()
  }, [])

  // ============================================================
  // DERIVED STATE - Track Options
  // ============================================================
  // Format tracks for SearchableComboBox component
  // Memoized to avoid re-formatting on every render
  //
  // formatTrackOptions returns:
  // - Group by: location (e.g., "Japan", "United Kingdom")
  // - Label: Track name (with layout suffix if applicable)
  // - Search terms: Combined fields for fuzzy search
  //
  // Why Memoize?
  // - formatTrackOptions creates new array on every call
  // - tracks reference only changes on data fetch (rare)
  // - Avoids unnecessary re-creation of options array
  // ============================================================

  const trackOptions = useMemo(() => formatTrackOptions(tracks), [tracks])

  // ============================================================
  // BUILD CREATION CALLBACK
  // ============================================================
  // Called when QuickBuildModal successfully creates a build
  // Fetches new build details and adds to allBuilds array
  // Auto-selects newly created build in form
  //
  // Flow:
  // 1. QuickBuildModal calls onBuildCreated(newBuildId) after successful creation
  // 2. Fetch build details from /api/builds/${newBuildId}
  // 3. Add new build to allBuilds array
  // 4. Set buildIds to [newBuildId] (auto-select in BuildSelector)
  //
  // Why Fetch Build Details?
  // - QuickBuildModal only returns build ID
  // - Need full build object (with car relationship) for form
  // - Ensures data consistency (fresh from database)
  //
  // Debugging Tips:
  // - Build not added: Check API response is ok
  // - Build not selected: Verify setBuildIds is called
  // - Missing car data: Check build.car object exists in response
  // ============================================================

  const handleBuildCreated = async (newBuildId: string) => {
    // Fetch the newly created build to add it to the list
    try {
      const response = await fetch(`/api/builds/${newBuildId}`)
      if (response.ok) {
        const newBuild = await response.json()
        setAllBuilds((prev) => [...prev, newBuild])
      }
    } catch (err) {
      console.error('Error fetching new build:', err)
    }

    // Auto-select the newly created build
    setBuildIds([newBuildId])
  }

  // ============================================================
  // FORM SUBMISSION - Create Lap Time
  // ============================================================
  // Validate form data, parse time, POST to API, handle response
  //
  // Validation Steps:
  // 1. Check trackId is not empty (required field)
  // 2. Check buildIds array has at least one element (required field)
  // 3. Parse timeInput to milliseconds using parseLapTime()
  // 4. Check parsed time is not null (valid format)
  // 5. Check time is in valid range (10s - 30min) using isValidLapTime()
  // 6. Set error message if validation fails
  //
  // API Call:
  // - Endpoint: POST /api/lap-times
  // - Extract carId from selected build (builds[0].car.id)
  // - Use buildIds[0] as buildId (only first build used for lap time)
  // - Body: { trackId, carId, buildId, timeMs, notes?, conditions?, sessionType }
  // - Conditions: "not-specified" converted to null
  // - Notes: Empty string converted to null
  //
  // Success Handling:
  // - Redirect to /lap-times page (router.push)
  // - Refresh page data (router.refresh)
  // - Clear loading state
  //
  // Error Handling:
  // - Parse response JSON for error message
  // - Append error.details if available (more context)
  // - Display error message above form
  // - Keep loading state false (form remains open)
  //
  // Debugging Tips:
  // - Submit blocked: Check validation rules (trackId, buildIds, timeInput)
  // - Time parsing failing: Check parseLapTime() accepts format
  // - CarId missing: Verify selectedBuild.car.id exists
  // - API error: Check response body for error.details
  // - Redirect not working: Check router.push('/lap-times') path
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation: Check required fields
    if (!trackId) {
      setError('Please select a track')
      return
    }

    if (buildIds.length === 0) {
      setError('Please select a build')
      return
    }

    // Parse time input to milliseconds
    const timeMs = parseLapTime(timeInput)
    if (!timeMs) {
      setError('Invalid time format. Use mm:ss.sss or ss.sss (e.g., 1:23.456)')
      return
    }

    // Validate time range (10s - 30min)
    if (!isValidLapTime(timeMs)) {
      setError('Lap time must be between 10 seconds and 30 minutes')
      return
    }

    setLoading(true)

    try {
      // Get the selected build to find carId
      const selectedBuild = allBuilds.find(b => b.id === buildIds[0])
      if (!selectedBuild) {
        throw new Error('Build not found')
      }

      const response = await fetch('/api/lap-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          carId: selectedBuild.car.id,
          buildId: buildIds[0],
          timeMs,
          notes: notes || null,
          conditions: conditions && conditions !== 'not-specified' ? conditions : null,
          sessionType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('API Error:', data)
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        throw new Error(errorMsg || 'Failed to save lap time')
      }

      const result = await response.json()
      console.log('Success! Lap time created:', result)

      // Success - redirect to lap times page
      router.push('/lap-times')
      router.refresh()
    } catch (err) {
      console.error('Form error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save lap time')
      setLoading(false)
    }
  }

  // ============================================================
  // MAIN RENDER - Form
  // ============================================================
  // Form layout with vertical spacing
  // Error display above form (AlertCircle icon + red background)
  // Form fields with icons and labels
  // Submit and Cancel buttons in footer
  // QuickBuildModal rendered outside form (dialog overlay)
  // ============================================================

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ============================================================
            ERROR DISPLAY - Alert Banner
            ============================================================
            Shown: Only if error state is not null
            Icon: AlertCircle (warning icon)
            Background: Destructive/10 (red tint)
            Border: Destructive/20 (red border)
            Text: Destructive (red text)
            Padding: p-4 (rounded corners)
            Layout: Flex items-center with gap-2
        ============================================================ */}

        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* ============================================================
          TRACK SELECTION - Searchable Dropdown
          ============================================================
          Label: "Track" with MapPin icon
          Component: SearchableComboBox
          Options: trackOptions (grouped by location)
          Value: trackId (selected track UUID)
          onChange: Updates trackId state
          Placeholder: "Select a track..."
          SearchPlaceholder: "Search tracks..."
          EmptyText: "No track found."
          Features: Grouped, virtualized (handles large track list)
        ============================================================ */}

        <div className="space-y-2">
          <Label htmlFor="track" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Track
          </Label>
          <SearchableComboBox
            options={trackOptions}
            value={trackId}
            onValueChange={setTrackId}
            placeholder="Select a track..."
            searchPlaceholder="Search tracks..."
            emptyText="No track found."
            grouped
          />
        </div>

        {/* ============================================================
          BUILD SELECTION - BuildSelector Component
          ============================================================
          Label: "Build" with CarIcon
          Component: BuildSelector (custom component)
          Props:
          - selectedBuilds: buildIds array (controlled)
          - onBuildsChange: Updates buildIds state
          - onCreateNew: Opens QuickBuildModal (setShowBuildModal(true))
          - builds: allBuilds array (user's builds)
          - buildsLoading: Loading state (shows spinner)
          - allowDuplicateCars: false (one build per car)
          - placeholder: "Select a build..."

          Features:
          - Multi-select (but only first element used for lap time)
          - Create new build option (opens QuickBuildModal)
          - Searchable by build name, car name, manufacturer
          - Loading state during data fetch
        ============================================================ */}

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CarIcon className="h-4 w-4" />
            Build
          </Label>
          <BuildSelector
            selectedBuilds={buildIds}
            onBuildsChange={setBuildIds}
            onCreateNew={() => setShowBuildModal(true)}
            builds={allBuilds}
            buildsLoading={buildsLoading}
            allowDuplicateCars={false}
            placeholder="Select a build..."
          />
          <p className="text-xs text-muted-foreground">
            Select the build you used for this lap time
          </p>
        </div>

        {/* ============================================================
          TIME INPUT - Text with Live Preview
          ============================================================
          Label: "Lap Time" with Clock icon
          Component: Input (text)
          Placeholder: "1:23.456 or 83.456" (example formats)
          Value: timeInput (raw user input)
          onChange: Updates timeInput state
          Required: true (browser validation)

          Helper Text:
          - Format description: "Enter time in mm:ss.sss or ss.sss format"
          - Live preview: Shows formatted time when input is valid
          - Example: User types "83.456" → shows "= 1:23.456" in primary color

          Live Preview Logic:
          - timeInput && parseLapTime(timeInput): Check if input is valid
          - formatLapTime(parseLapTime(timeInput)!): Format to mm:ss.sss
          - Shows in primary color to indicate valid format

          Parsing:
          - "mm:ss.sss": Minutes:Seconds.Milliseconds (e.g., "1:23.456")
          - "ss.sss": Seconds.Milliseconds (e.g., "83.456")
          - Parsed by: parseLapTime() helper function
          - Returns: Milliseconds (number) or null if invalid
        ============================================================ */}

        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Lap Time
          </Label>
          <div className="space-y-1">
            <Input
              id="time"
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="1:23.456 or 83.456"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter time in mm:ss.sss or ss.sss format
              {timeInput && parseLapTime(timeInput) && (
                <span className="text-primary ml-2">
                  = {formatLapTime(parseLapTime(timeInput)!)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ============================================================
          CONDITIONS SELECTION - Dropdown
          ============================================================
          Label: "Conditions (optional)"
          Component: Select (shadcn dropdown)
          Options: Not specified (default), Dry, Wet, Mixed Conditions
          Value: conditions state
          onChange: Updates conditions state

          Storage:
          - "not-specified": Stored as null in database (clean data)
          - Other values: Stored as-is (Dry, Wet, Mixed Conditions)
          - Purpose: Track weather conditions during lap time
          - Optional: User can leave as "Not specified" if unknown
        ============================================================ */}

        <div className="space-y-2">
          <Label htmlFor="conditions">Conditions (optional)</Label>
          <Select value={conditions} onValueChange={setConditions}>
            <SelectTrigger id="conditions">
              <SelectValue placeholder="Select conditions..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not-specified">Not specified</SelectItem>
              <SelectItem value="Dry">Dry</SelectItem>
              <SelectItem value="Wet">Wet</SelectItem>
              <SelectItem value="Mixed">Mixed Conditions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ============================================================
          SESSION TYPE - Radio Buttons
          ============================================================
          Label: "Session Type *" (required)
          Options: R (Race), Q (Qualifying)
          Value: sessionType state ('R' or 'Q')

          Visual Distinction:
          - R (Race): Primary color (blue), primary border, primary focus ring
          - Q (Qualifying): Secondary color (purple), secondary border, secondary focus ring
          - Bold labels: "R" and "Q" highlighted in respective colors

          Why Session Type?
          - Helps categorize lap times by session type
          - Race: Full race session lap times
          - Qualifying: Qualifying session lap times (often faster)
          - Useful for filtering and analysis

          Required:
          - User must select one (no default)
          - Validation enforces 'R' or 'Q' value

          Helper Text:
          - Explains each session type
          - "Select whether this lap time is from a Race or Qualifying session"
        ============================================================ */}

        <div className="space-y-2">
          <Label>Session Type *</Label>
          <div className="flex gap-4">
            {/* Race (R) Option */}
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="session-r"
                name="sessionType"
                value="R"
                checked={sessionType === 'R'}
                onChange={() => setSessionType('R')}
                className="w-4 h-4 text-primary border-primary focus:ring-primary"
              />
              <Label htmlFor="session-r" className="font-normal cursor-pointer">
                <span className="font-bold text-primary">R</span> - Race
              </Label>
            </div>

            {/* Qualifying (Q) Option */}
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="session-q"
                name="sessionType"
                value="Q"
                checked={sessionType === 'Q'}
                onChange={() => setSessionType('Q')}
                className="w-4 h-4 text-secondary border-secondary focus:ring-secondary"
              />
              <Label htmlFor="session-q" className="font-normal cursor-pointer">
                <span className="font-bold text-secondary">Q</span> - Qualifying
              </Label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Select whether this lap time is from a Race or Qualifying session
          </p>
        </div>

        {/* ============================================================
          NOTES - Optional Textarea
          ============================================================
          Label: "Notes (optional)"
          Component: Textarea
          Placeholder: "Add any notes about this lap..."
          Value: notes state
          onChange: Updates notes state
          Rows: 3 (approximate height for 3 lines of text)

          Purpose:
          - Free text field for additional details
          - Can include: Tire compound, fuel level, traffic, etc.
          - Optional: User can leave blank
          - Stored as-is in database (no formatting)
        ============================================================ */}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this lap..."
            rows={3}
          />
        </div>

        {/* ============================================================
          ACTION BUTTONS - Submit and Cancel
          ============================================================
          Layout: Flex container with gap-3
          Submit button: Full width (flex-1), disabled during loading
          Cancel button: Outline variant, disabled during loading

          Submit Button:
          - Type: submit (form submission)
          - Text: "Save Lap Time" or "Saving..." (loading state)
          - Disabled: During loading (prevents double submission)
          - Full width: flex-1 (equal space with cancel button)

          Cancel Button:
          - Type: button
          - Action: router.back() (go to previous page)
          - Variant: outline (secondary style)
          - Disabled: During loading (prevents navigation during submit)

          Loading State:
          - Spinner: No explicit spinner, just text change ("Saving...")
          - Both buttons disabled: Prevents user interaction during API call
        ============================================================ */}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Lap Time'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* ============================================================
        QUICK BUILD MODAL - Inline Build Creation
        ============================================================
        Modal dialog for creating builds without leaving form
        Opens when user clicks "Create New Build" in BuildSelector
        Closes after successful creation
        Calls handleBuildCreated callback to add build to form

        Props:
        - open: showBuildModal state (controlled)
        - onOpenChange: setShowBuildModal callback
        - onBuildCreated: handleBuildCreated callback (fetches and adds build)

        Flow:
        1. User clicks "Create New Build" in BuildSelector
        2. BuildSelector calls onCreateNew() callback
        3. setShowBuildModal(true) opens modal
        4. User creates build in modal (car + name + description)
        5. Modal calls onBuildCreated(newBuildId)
        6. handleBuildCreated fetches build, adds to allBuilds, sets buildIds
        7. Modal closes, user can proceed with form submission
      ============================================================ */}

      <QuickBuildModal
        open={showBuildModal}
        onOpenChange={setShowBuildModal}
        onBuildCreated={handleBuildCreated}
      />
    </>
  )
}
