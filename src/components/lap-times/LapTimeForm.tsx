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
import { Clock, Car as CarIcon, MapPin, AlertCircle } from 'lucide-react'

interface Track {
  id: string
  name: string
  slug: string
  location: string
  layout: string | null
}

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  car: {
    id: string
    name: string
    manufacturer: string
  }
}

export function LapTimeForm() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [allBuilds, setAllBuilds] = useState<Build[]>([])
  const [buildsLoading, setBuildsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBuildModal, setShowBuildModal] = useState(false)

  // Form state
  const [trackId, setTrackId] = useState('')
  const [buildIds, setBuildIds] = useState<string[]>([])
  const [timeInput, setTimeInput] = useState('')
  const [notes, setNotes] = useState('')
  const [conditions, setConditions] = useState('')
  const [sessionType, setSessionType] = useState<'Q' | 'R'>('R')

  // Load tracks and builds
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

  // Format tracks for combobox with searchable labels
  const trackOptions = useMemo(() =>
    tracks.map((track) => ({
      value: track.id,
      label: `${track.name}${track.layout ? ` - ${track.layout}` : ''} (${track.location})`,
      searchTerms: `${track.name} ${track.layout || ''} ${track.location}`.toLowerCase(),
    })),
    [tracks]
  )

  // Handle build creation callback
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

    setBuildIds([newBuildId])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!trackId) {
      setError('Please select a track')
      return
    }

    if (buildIds.length === 0) {
      setError('Please select a build')
      return
    }

    const timeMs = parseLapTime(timeInput)
    if (!timeMs) {
      setError('Invalid time format. Use mm:ss.sss or ss.sss (e.g., 1:23.456)')
      return
    }

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

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Track Selection */}
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
          />
        </div>

        {/* Build Selection */}
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

        {/* Time Input */}
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

        {/* Conditions */}
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

        {/* Session Type */}
        <div className="space-y-2">
          <Label>Session Type *</Label>
          <div className="flex gap-4">
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

        {/* Notes */}
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

        {/* Actions */}
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

      {/* Quick Build Modal */}
      <QuickBuildModal
        open={showBuildModal}
        onOpenChange={setShowBuildModal}
        onBuildCreated={handleBuildCreated}
      />
    </>
  )
}
