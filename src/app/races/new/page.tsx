/**
 * Create New Race Page
 *
 * Purpose: Multi-step wizard for creating a new race
 * - 3-step process: Select track → Select builds → Configure race
 * - Track selection with grouped dropdown (by country)
 * - Build selection with multi-select (allow duplicate cars)
 * - Race configuration: Name, description, laps, weather
 * - Quick build creation modal (create builds on the fly)
 * - Progress indicator showing current step
 *
 * **Key Features:**
 * - 3-step wizard: Track, Builds, Configure
 * - Track selection: Grouped by country with search
 * - Build selection: Multi-select with QuickBuildModal
 * - Allow duplicate cars: Multiple builds from same car allowed
 * - Quick build: Create builds without leaving the page
 * - Validation: Step-by-step validation before proceeding
 * - Progress: Visual indicator of current step
 * - Success: Redirect to /races/[id] on create
 *
 * **Wizard Flow:**
 * 1. Step 1 (Select Track): User selects track → Validate → Click Next
 * 2. Step 2 (Select Builds): User selects builds → Validate → Click Next
 * 3. Step 3 (Configure): User fills race info → Validate → Click Create Race
 * 4. Submit: POST /api/races → Redirect to /races/[id]
 * 5. Error: Show error message, user stays on current step
 *
 * **Step 1: Select Track**
 * - Dropdown: Grouped by country (formatTrackOptions helper)
 * - Search: Real-time filter as user types
 * - Preview: Show selected track with details (location, category, length)
 * - Validation: Track must be selected
 * - Next: Enable only when track is selected
 *
 * **Step 2: Select Builds**
 * - BuildSelector: Multi-select component with search
 * - Allow duplicates: Multiple builds from same car allowed
 * - Quick build: "Create new build" button opens QuickBuildModal
 * - Callback: Add newly created build to selection
 * - Reminder: Show selected track name at bottom
 * - Validation: At least 1 build must be selected
 * - Next: Enable only when 1+ builds selected
 *
 * **Step 3: Configure**
 * - Race name: Required text input
 * - Description: Optional textarea
 * - Laps: Optional number input (min: 1)
 * - Weather: Optional select (Dry/Wet)
 * - Summary: Show track name and build count
 * - Validation: Name is required, laps must be positive number
 * - Create: Enable only when validation passes
 *
 * **State Management:**
 * - step: Current wizard step (1 | 2 | 3)
 * - loading: Loading state during form submit
 * - tracks: Available tracks from API
 * - tracksLoading: Loading state during track fetch
 * - builds: Available builds from API
 * - buildsLoading: Loading state during build fetch
 * - showBuildModal: QuickBuildModal visibility
 * - error: Error message to display
 * - formData: Form data object (trackId, buildIds, name, description, laps, weather)
 *
 * **Data Fetching:**
 * - Tracks: GET /api/tracks on mount
 * - Builds: GET /api/builds?myBuilds=true on mount
 * - Parallel fetch: Both fetched simultaneously with Promise.all
 * - New build: On build created, fetch build details and add to list
 *
 * **Quick Build Flow:**
 * 1. User clicks "Create new build" → Opens QuickBuildModal
 * 2. User creates build in modal → QuickBuildModal calls onBuildCreated
 * 3. Handle build created: Fetch build details → Add to builds list → Add to selection
 * 4. Modal closes → User sees newly created build in selection
 *
 * **Validation:**
 * - Step 1: trackId must be set
 * - Step 2: buildIds.length must be > 0
 * - Step 3: name must be non-empty, laps must be positive number (if set)
 * - validateStep(): Returns boolean, sets error message
 * - Error message: Displayed above step content
 *
 * **Navigation:**
 * - Next: validateStep() → Increment step
 * - Previous: Decrement step (no validation needed)
 * - Back to races: Link in header
 *
 * **Progress Indicator:**
 * - 3 circles: Numbered 1, 2, 3
 * - Active step: Filled with primary color
 * - Completed steps: Show checkmark icon
 * - Inactive steps: Gray with muted text
 * - Lines: Connect steps with horizontal lines
 *
 * **API Integration:**
 * - GET /api/tracks: Fetch available tracks
 * - GET /api/builds?myBuilds=true: Fetch user's builds
 * - GET /api/builds/[id]: Fetch newly created build details
 * - POST /api/races: Create new race
 *   - Request body: { trackId, buildIds[], name, description, laps, weather }
 *   - Response: { id: string } (new race ID)
 * - Success: router.replace('/races/[id]')
 *
 * **Error Handling:**
 * - Fetch tracks/builds: Set error state, show error message
 * - Submit: Show error message from API or generic message
 * - Validation: Show error message above step content
 * - User stays: Can retry after error
 *
 * **Page Layout:**
 * - Header: Title "Create New Race", back link, description
 * - Progress: 3-step indicator with icons and lines
 * - Error: Alert box with error message (if any)
 * - Card: Step content with navigation buttons
 * - Modal: QuickBuildModal (conditionally rendered)
 *
 * **Styling:**
 * - Container: max-w-4xl centered
 * - Progress: Flex layout with responsive sizing
 * - Cards: Bordered with shadow
 * - Buttons: min-h-[44px] for touch targets
 * - Track preview: Muted background with border
 * - Summary: Muted background with icon highlights
 *
 * **Helper Functions:**
 * - formatTrackOptions: Format tracks for SearchableComboBox (grouped by country)
 * - handleTrackSelect: Update formData.trackId
 * - handleBuildsChange: Update formData.buildIds
 * - handleBuildCreated: Add new build to list and selection
 * - validateStep: Validate current step, return boolean
 * - handleNext: Validate and advance to next step
 * - handlePrevious: Go back to previous step
 * - handleSubmit: Create race and redirect
 *
 * **BuildSelector Component:**
 * - Multi-select: SearchableComboBox with multi-select
 * - Search: Real-time filter as user types
 * - On create new: Opens QuickBuildModal
 * - Selected: Shows badges for selected builds
 * - Loading: Shows spinner during fetch
 *
 * **QuickBuildModal Component:**
 * - Modal: Dialog with form to create build
 * - Callback: onBuildCreated(buildId) when build is created
 * - Close: User can cancel and close modal
 *
 * **Related Files:**
 * - @/app/races/page.tsx: Races listing page
 * - @/app/races/[id]/page.tsx: Race detail page
 * - @/components/builds/BuildSelector: Build selection component
 * - @/components/builds/QuickBuildModal: Quick build creation modal
 * - @/lib/dropdown-helpers: formatTrackOptions helper
 * - @/app/api/races/route.ts: Create race API endpoint
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BuildSelector } from '@/components/builds/BuildSelector'
import { QuickBuildModal } from '@/components/builds/QuickBuildModal'
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Settings } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import Link from 'next/link'
import { formatTrackOptions } from '@/lib/dropdown-helpers'
import type { DbTrack } from '@/types/database'

// ============================================================
// TYPES
// ============================================================
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

type Step = 1 | 2 | 3

export default function NewRacePage() {
  // ============================================================
  // STATE
  // ============================================================
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [tracks, setTracks] = useState<DbTrack[]>([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [builds, setBuilds] = useState<Build[]>([])
  const [buildsLoading, setBuildsLoading] = useState(false)
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================
  // DATA FETCHING
  // ============================================================
  // Fetch tracks and builds on mount
  // Form data object with race configuration
  const [formData, setFormData] = useState({
    trackId: '',
    buildIds: [] as string[],
    name: '',
    description: '',
    laps: '',
    weather: '' as 'dry' | 'wet' | '',
  })

  // Fetch tracks and builds on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setTracksLoading(true)
        setBuildsLoading(true)

        // Fetch both tracks and builds in parallel
        const [tracksRes, buildsRes] = await Promise.all([
          fetch('/api/tracks'),
          fetch('/api/builds?myBuilds=true')
        ])

        if (!tracksRes.ok) throw new Error('Failed to fetch tracks')
        if (!buildsRes.ok) throw new Error('Failed to fetch builds')

        const tracksData = await tracksRes.json()
        const buildsData = await buildsRes.json()

        setTracks(tracksData.tracks || [])
        setBuilds(buildsData.builds || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data')
      } finally {
        setTracksLoading(false)
        setBuildsLoading(false)
      }
    }

    fetchData()
  }, [])

  // ============================================================
  // DROPDOWN OPTIONS & EVENT HANDLERS
  // ============================================================
  // Format track options for SearchableComboBox
  const trackOptions = useMemo(() => formatTrackOptions(tracks), [tracks])

  // Handle track selection
  const handleTrackSelect = (trackId: string) => {
    setFormData({ ...formData, trackId })
  }

  // Handle build creation callback from QuickBuildModal
  // - Fetch build details
  // - Add to builds list
  // - Add to selection
  const handleBuildCreated = async (buildId: string) => {
    // Fetch the newly created build to add it to the list
    try {
      const response = await fetch(`/api/builds/${buildId}`)
      if (response.ok) {
        const newBuild = await response.json()
        setBuilds((prev) => [...prev, newBuild])
      }
    } catch (err) {
      console.error('Error fetching new build:', err)
    }

    setFormData({
      ...formData,
      buildIds: [...formData.buildIds, buildId],
    })
  }

  // ============================================================
  // VALIDATION & NAVIGATION
  // ============================================================
  // Validate current step before proceeding
  // - Step 1: Track must be selected
  // - Step 2: At least 1 build must be selected
  // - Step 3: Name must be set, laps must be positive number
  // - Returns: true if valid, false if invalid
  // - Sets: error message if invalid
  const validateStep = (): boolean => {
    setError(null)

    if (step === 1 && !formData.trackId) {
      setError('Please select a track')
      return false
    }

    if (step === 2 && formData.buildIds.length === 0) {
      setError('Please select at least one build')
      return false
    }

    if (step === 3) {
      if (!formData.name.trim()) {
        setError('Please enter a race name')
        return false
      }

      const laps = parseInt(formData.laps)
      if (formData.laps && (isNaN(laps) || laps < 1)) {
        setError('Laps must be a positive number')
        return false
      }
    }

    return true
  }

  // Handle next step button click
  // - Validate current step
  // - Advance to next step if valid
  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1 as Step)
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    setError(null)
    setStep(step - 1 as Step)
  }

  // Handle form submission (Create Race)
  // - Validate step 3
  // - POST /api/races with form data
  // - Redirect to /races/[id] on success
  const handleSubmit = async () => {
    if (!validateStep()) return

    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: formData.trackId,
          buildIds: formData.buildIds,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          laps: formData.laps ? parseInt(formData.laps) : null,
          weather: formData.weather || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create race')
      }

      const race = await response.json()
      router.replace(`/races/${race.id}`)
    } catch (err) {
      console.error('Error creating race:', err)
      setError(err instanceof Error ? err.message : 'Failed to create race')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  // Get selected track info for preview
  const selectedTrack = tracks.find((t) => t.id === formData.trackId)

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/races"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gt-hover-text-link mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Races
        </Link>
        <h1 className="text-3xl font-bold">Create New Race</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new race with track, builds, and configuration
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= 1
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted bg-muted text-muted-foreground'
              }`}
            >
              {step > 1 ? <Check className="h-5 w-5" /> : '1'}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  step >= 1 ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Select Track
              </p>
            </div>
          </div>

          <div className="flex-1 h-0.5 bg-muted mx-4" />

          <div className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= 2
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted bg-muted text-muted-foreground'
              }`}
            >
              {step > 2 ? <Check className="h-5 w-5" /> : '2'}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  step >= 2 ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Select Builds
              </p>
            </div>
          </div>

          <div className="flex-1 h-0.5 bg-muted mx-4" />

          <div className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= 3
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted bg-muted text-muted-foreground'
              }`}
            >
              3
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  step >= 3 ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Configure
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {tracksLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSection />
            </div>
          ) : (
            <>
              {/* Step 1: Select Track */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="track">Track *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose the track for this race (grouped by country)
                    </p>
                    <SearchableComboBox
                      options={trackOptions}
                      value={formData.trackId}
                      onValueChange={handleTrackSelect}
                      placeholder="Select a track"
                      searchPlaceholder="Search tracks..."
                      disabled={loading}
                      isLoading={tracksLoading}
                      grouped
                    />
                  </div>

                  {/* Selected Track Preview */}
                  {selectedTrack && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{selectedTrack.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedTrack.location}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{selectedTrack.category}</Badge>
                            {selectedTrack.length && (
                              <Badge variant="outline">
                                {selectedTrack.length.toLocaleString()}m
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Builds */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>Builds *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select builds for this race. Multiple builds from the same car are allowed.
                    </p>
                    <BuildSelector
                      selectedBuilds={formData.buildIds}
                      onBuildsChange={(buildIds) =>
                        setFormData({ ...formData, buildIds })
                      }
                      onCreateNew={() => setShowBuildModal(true)}
                      builds={builds}
                      buildsLoading={buildsLoading}
                      allowDuplicateCars={true}
                      placeholder="Select builds..."
                    />
                  </div>

                  {/* Selected Track Reminder */}
                  {selectedTrack && (
                    <div className="p-3 bg-muted/30 rounded-lg border">
                      <p className="text-sm">
                        <span className="font-medium">Track:</span> {selectedTrack.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Configure */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Race Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Friday Night Nürburgring"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="min-h-[44px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Add details about this race..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="min-h-[44px]"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="laps">Laps (Optional)</Label>
                      <Input
                        id="laps"
                        type="number"
                        min="1"
                        placeholder="e.g., 5"
                        value={formData.laps}
                        onChange={(e) =>
                          setFormData({ ...formData, laps: e.target.value })
                        }
                        className="min-h-[44px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="weather">Weather (Optional)</Label>
                      <Select
                        value={formData.weather}
                        onValueChange={(value: 'dry' | 'wet') =>
                          setFormData({ ...formData, weather: value })
                        }
                      >
                        <SelectTrigger id="weather" className="w-full min-h-[44px]">
                          <SelectValue placeholder="Select weather" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dry">Dry</SelectItem>
                          <SelectItem value="wet">Wet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Track:</span>
                      <span>{selectedTrack?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Builds:</span>
                      <span>{formData.buildIds.length} selected</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={step === 1 || loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {step < 3 ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Race
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Build Modal */}
      <QuickBuildModal
        open={showBuildModal}
        onOpenChange={setShowBuildModal}
        onBuildCreated={handleBuildCreated}
      />
    </div>
  )
}
