'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BuildSelector } from '@/components/builds/BuildSelector'
import { QuickBuildModal } from '@/components/builds/QuickBuildModal'
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Settings } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import Link from 'next/link'

interface Track {
  id: string
  name: string
  slug: string
  location: string | null
  category: string
  layout: string | null
  length: number | null
}

type Step = 1 | 2 | 3

export default function NewRacePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    trackId: '',
    buildIds: [] as string[],
    name: '',
    description: '',
    laps: '',
    weather: '' as 'dry' | 'wet' | '',
  })

  // Fetch tracks on mount
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setTracksLoading(true)
        const response = await fetch('/api/tracks')
        if (!response.ok) throw new Error('Failed to fetch tracks')
        const data = await response.json()
        setTracks(data.tracks || [])
      } catch (err) {
        console.error('Error fetching tracks:', err)
        setError('Failed to load tracks')
      } finally {
        setTracksLoading(false)
      }
    }

    fetchTracks()
  }, [])

  // Group tracks by category
  const tracksByCategory = tracks.reduce((acc, track) => {
    const category = track.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(track)
    return acc
  }, {} as Record<string, Track[]>)

  // Handle track selection
  const handleTrackSelect = (trackId: string) => {
    setFormData({ ...formData, trackId })
  }

  // Handle build creation callback
  const handleBuildCreated = (buildId: string) => {
    setFormData({
      ...formData,
      buildIds: [...formData.buildIds, buildId],
    })
  }

  // Validate current step
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

  // Handle next step
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

  // Handle form submission
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
      router.push(`/races/${race.id}`)
    } catch (err) {
      console.error('Error creating race:', err)
      setError(err instanceof Error ? err.message : 'Failed to create race')
    } finally {
      setLoading(false)
    }
  }

  // Get selected track info
  const selectedTrack = tracks.find((t) => t.id === formData.trackId)

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/races"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
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
                      Choose the track for this race
                    </p>
                    <Select
                      value={formData.trackId}
                      onValueChange={handleTrackSelect}
                    >
                      <SelectTrigger id="track" className="w-full">
                        <SelectValue placeholder="Select a track" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tracksByCategory).map(
                          ([category, categoryTracks]) => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                {category}
                              </div>
                              {categoryTracks.map((track) => (
                                <SelectItem key={track.id} value={track.id}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{track.name}</span>
                                    {track.layout && (
                                      <span className="text-muted-foreground">
                                        ({track.layout})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          )
                        )}
                      </SelectContent>
                    </Select>
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
                        <SelectTrigger id="weather">
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
