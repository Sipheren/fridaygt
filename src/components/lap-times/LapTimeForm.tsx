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
import { parseLapTime, formatLapTime, isValidLapTime } from '@/lib/time'
import { Clock, Car as CarIcon, MapPin, AlertCircle, Wrench } from 'lucide-react'

interface Track {
  id: string
  name: string
  slug: string
  location: string
  layout: string | null
}

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
}

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
}

export function LapTimeForm() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [trackId, setTrackId] = useState('')
  const [carId, setCarId] = useState('')
  const [buildId, setBuildId] = useState<string>('')
  const [timeInput, setTimeInput] = useState('')
  const [notes, setNotes] = useState('')
  const [conditions, setConditions] = useState('')

  // Load tracks and cars
  useEffect(() => {
    async function loadData() {
      try {
        const [tracksRes, carsRes] = await Promise.all([
          fetch('/api/tracks'),
          fetch('/api/cars'),
        ])

        const tracksData = await tracksRes.json()
        const carsData = await carsRes.json()

        setTracks(tracksData.tracks || [])
        setCars(carsData.cars || [])
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load tracks and cars')
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

  // Format cars for combobox with searchable labels
  const carOptions = useMemo(() =>
    cars.map((car) => ({
      value: car.id,
      label: `${car.manufacturer} ${car.name}`,
      searchTerms: `${car.manufacturer} ${car.name}`.toLowerCase(),
    })),
    [cars]
  )

  // Load builds when car changes
  useEffect(() => {
    if (!carId) {
      setBuilds([])
      setBuildId('')
      return
    }

    async function loadBuilds() {
      try {
        const response = await fetch(`/api/builds?carId=${carId}`)
        const data = await response.json()
        setBuilds(data.builds || [])
      } catch (err) {
        console.error('Error loading builds:', err)
        setBuilds([])
      }
    }

    loadBuilds()
  }, [carId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!trackId) {
      setError('Please select a track')
      return
    }

    if (!carId) {
      setError('Please select a car')
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
      const response = await fetch('/api/lap-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          carId,
          buildId: buildId || null,
          timeMs,
          notes: notes || null,
          conditions: conditions && conditions !== 'not-specified' ? conditions : null,
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

      {/* Car Selection */}
      <div className="space-y-2">
        <Label htmlFor="car" className="flex items-center gap-2">
          <CarIcon className="h-4 w-4" />
          Car
        </Label>
        <SearchableComboBox
          options={carOptions}
          value={carId}
          onValueChange={setCarId}
          placeholder="Select a car..."
          searchPlaceholder="Search cars..."
          emptyText="No car found."
        />
      </div>

      {/* Build Selection */}
      {carId && builds.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="build" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Build (optional)
          </Label>
          <Select value={buildId} onValueChange={setBuildId}>
            <SelectTrigger id="build">
              <SelectValue placeholder="No build / Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No build / Stock</SelectItem>
              {builds.map((build) => (
                <SelectItem key={build.id} value={build.id}>
                  {build.name}
                  {build.description && ` - ${build.description.substring(0, 30)}${build.description.length > 30 ? '...' : ''}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the build you used for this lap (if any)
          </p>
        </div>
      )}

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
  )
}
