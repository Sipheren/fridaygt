'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BuildSelector } from '@/components/builds/BuildSelector'
import { QuickBuildModal } from '@/components/builds/QuickBuildModal'
import { ArrowLeft, Loader2, MapPin, Save } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
  year?: number
}

interface Build {
  id: string
  name: string
  description: string | null
  car: Car
  isPublic: boolean
}

interface AllBuild {
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

interface Track {
  id: string
  name: string
  slug: string
  location: string | null
  category: string
  layout: string | null
  length: number | null
}

interface RaceData {
  id: string
  name: string | null
  description: string | null
  laps: number | null
  weather: string | null
  isActive: boolean
  track: Track
  RaceCar: {
    id: string
    carId: string
    buildId: string
    build: Build
  }[]
}

export default function EditRacePage() {
  const router = useRouter()
  const params = useParams()
  const raceId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [raceData, setRaceData] = useState<RaceData | null>(null)
  const [allBuilds, setAllBuilds] = useState<AllBuild[]>([])
  const [buildsLoading, setBuildsLoading] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    buildIds: [] as string[],
    laps: '',
    weather: '' as 'dry' | 'wet' | '',
    isActive: false,
  })

  // Fetch race data and builds on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setBuildsLoading(true)

        const [raceRes, buildsRes] = await Promise.all([
          fetch(`/api/races/${raceId}`),
          fetch('/api/builds')
        ])

        if (!raceRes.ok) throw new Error('Failed to fetch race')
        if (!buildsRes.ok) throw new Error('Failed to fetch builds')

        const raceData = await raceRes.json()
        const buildsData = await buildsRes.json()

        setRaceData(raceData.race)
        setAllBuilds(buildsData.builds || [])
        setFormData({
          name: raceData.race.name || '',
          description: raceData.race.description || '',
          buildIds: raceData.race.RaceCar?.map((rc: { buildId: string }) => rc.buildId) || [],
          laps: raceData.race.laps?.toString() || '',
          weather: raceData.race.weather || '',
          isActive: raceData.race.isActive || false,
        })
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data')
      } finally {
        setLoading(false)
        setBuildsLoading(false)
      }
    }

    fetchData()
  }, [raceId])

  // Handle build creation callback
  const handleBuildCreated = async (buildId: string) => {
    // Fetch the newly created build to add it to the list
    try {
      const response = await fetch(`/api/builds/${buildId}`)
      if (response.ok) {
        const newBuild = await response.json()
        setAllBuilds((prev) => [...prev, newBuild])
      }
    } catch (err) {
      console.error('Error fetching new build:', err)
    }

    setFormData({
      ...formData,
      buildIds: [...formData.buildIds, buildId],
    })
  }

  // Validate form
  const validateForm = (): boolean => {
    setError(null)

    if (!formData.name.trim()) {
      setError('Please enter a race name')
      return false
    }

    const laps = parseInt(formData.laps)
    if (formData.laps && (isNaN(laps) || laps < 1)) {
      setError('Laps must be a positive number')
      return false
    }

    return true
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return

    setError(null)
    setSaving(true)

    try {
      const response = await fetch(`/api/races/${raceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          buildIds: formData.buildIds,
          laps: formData.laps ? parseInt(formData.laps) : null,
          weather: formData.weather || null,
          isActive: formData.isActive,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update race')
      }

      router.push(`/races/${raceId}`)
    } catch (err) {
      console.error('Error updating race:', err)
      setError(err instanceof Error ? err.message : 'Failed to update race')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-center py-12">
          <LoadingSection />
        </div>
      </div>
    )
  }

  if (!raceData) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Race not found</p>
          <Link href="/races" className="gt-hover-text-link">
            Back to Races
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/races/${raceId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gt-hover-text-link mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Race
        </Link>
        <h1 className="text-3xl font-bold">Edit Race</h1>
        <p className="text-muted-foreground mt-2">
          Update race configuration and builds
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Race Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Track (Immutable) */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <Label className="text-sm text-muted-foreground">Track</Label>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{raceData.track.name}</span>
              {raceData.track.layout && (
                <span className="text-muted-foreground">
                  ({raceData.track.layout})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Track cannot be changed after race creation
            </p>
          </div>

          {/* Race Name */}
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

          {/* Description */}
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

          {/* Builds */}
          <div>
            <Label>Builds</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select builds for this race. Multiple builds from the same car are allowed.
            </p>
            <BuildSelector
              selectedBuilds={formData.buildIds}
              onBuildsChange={(buildIds) =>
                setFormData({ ...formData, buildIds })
              }
              onCreateNew={() => setShowBuildModal(true)}
              builds={allBuilds}
              buildsLoading={buildsLoading}
              allowDuplicateCars={true}
              placeholder="Select builds..."
            />
          </div>

          {/* Active Race Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="text-base font-semibold">
                Active Race
              </Label>
              <p className="text-sm text-muted-foreground">
                Show this race on the Tonight page
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
          </div>

          {/* Laps and Weather */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="laps">Laps</Label>
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
              <Label htmlFor="weather">Weather</Label>
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghostBordered"
              onClick={() => router.replace(`/races/${raceId}`)}
              disabled={saving}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="min-h-[44px]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
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
