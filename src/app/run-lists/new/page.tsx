'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableComboBox } from '@/components/ui/searchable-combobox'
import { Plus, Trash2, GripVertical, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface Track {
  id: string
  name: string
  slug: string
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
}

interface Entry {
  tempId: string
  trackId: string
  trackName: string
  carId: string | null
  carName: string | null
  buildId: string | null
  buildName: string | null
  notes: string
}

export default function NewRunListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])

  // For the race form
  const [tracks, setTracks] = useState<Track[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [selectedCarId, setSelectedCarId] = useState('')
  const [selectedBuildId, setSelectedBuildId] = useState('')
  const [entryNotes, setEntryNotes] = useState('')

  // Load tracks and cars on mount
  useState(() => {
    const loadData = async () => {
      setLoadingData(true)
      try {
        const [tracksRes, carsRes] = await Promise.all([
          fetch('/api/tracks'),
          fetch('/api/cars'),
        ])
        const tracksData = await tracksRes.json()
        const carsData = await carsRes.json()
        setTracks(tracksData.tracks || [])
        setCars(carsData.cars || [])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  })

  // Load builds when car is selected
  const handleCarChange = async (carId: string) => {
    setSelectedCarId(carId)
    setSelectedBuildId('')
    setBuilds([])

    if (carId) {
      try {
        const res = await fetch(`/api/builds?carId=${carId}`)
        const data = await res.json()
        setBuilds(data.builds || [])
      } catch (error) {
        console.error('Error loading builds:', error)
      }
    }
  }

  const addEntry = () => {
    if (!selectedTrackId) {
      alert('Please select a track')
      return
    }

    const track = tracks.find((t) => t.id === selectedTrackId)
    const car = selectedCarId ? cars.find((c) => c.id === selectedCarId) : null
    const build = selectedBuildId ? builds.find((b) => b.id === selectedBuildId) : null

    const newEntry: Entry = {
      tempId: `temp-${Date.now()}`,
      trackId: selectedTrackId,
      trackName: track?.name || '',
      carId: selectedCarId || null,
      carName: car ? `${car.manufacturer} ${car.name}` : null,
      buildId: selectedBuildId || null,
      buildName: build?.name || null,
      notes: entryNotes,
    }

    setEntries([...entries, newEntry])

    // Reset form
    setSelectedTrackId('')
    setSelectedCarId('')
    setSelectedBuildId('')
    setEntryNotes('')
    setBuilds([])
  }

  const removeEntry = (tempId: string) => {
    setEntries(entries.filter((e) => e.tempId !== tempId))
  }

  const moveEntry = (index: number, direction: 'up' | 'down') => {
    const newEntries = [...entries]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= entries.length) return

    ;[newEntries[index], newEntries[newIndex]] = [newEntries[newIndex], newEntries[index]]
    setEntries(newEntries)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('Please enter a run list name')
      return
    }

    if (entries.length === 0) {
      alert('Please add at least one race to the run list')
      return
    }

    setLoading(true)

    try {
      // Create the run list
      const runListRes = await fetch('/api/run-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPublic,
        }),
      })

      if (!runListRes.ok) {
        throw new Error('Failed to create run list')
      }

      const { runList } = await runListRes.json()

      // Add all entries
      for (const entry of entries) {
        const entryRes = await fetch(`/api/run-lists/${runList.id}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackId: entry.trackId,
            carId: entry.carId,
            buildId: entry.buildId,
            notes: entry.notes || null,
          }),
        })

        if (!entryRes.ok) {
          throw new Error('Failed to add race')
        }
      }

      // Navigate to the new run list
      router.push(`/run-lists/${runList.id}`)
    } catch (error) {
      console.error('Error creating run list:', error)
      alert('Failed to create run list. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CREATE RUN LIST</h1>
          <p className="text-muted-foreground mt-1">
            Build your race night lineup
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/run-lists">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Run List Details */}
        <Card>
          <CardHeader>
            <CardTitle>Run List Details</CardTitle>
            <CardDescription>Basic information about your run list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Friday Night #45"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Weekly racing session with classic GT cars"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public" className="cursor-pointer">
                Make this run list public (others can view and clone)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Add Race Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Race</CardTitle>
            <CardDescription>Add track and car combinations to your run list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Track *</Label>
              <SearchableComboBox
                options={tracks.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTrackId}
                onValueChange={setSelectedTrackId}
                placeholder="Select track..."
                searchPlaceholder="Search tracks..."
                emptyText="No track found."
              />
            </div>

            <div className="space-y-2">
              <Label>Car (Optional)</Label>
              <SearchableComboBox
                options={[
                  { value: '', label: 'Any Car (Open Choice)' },
                  ...cars.map((c) => ({ value: c.id, label: `${c.manufacturer} ${c.name}` })),
                ]}
                value={selectedCarId}
                onValueChange={handleCarChange}
                placeholder="Select car or leave open..."
                searchPlaceholder="Search cars..."
                emptyText="No car found."
              />
            </div>

            {selectedCarId && builds.length > 0 && (
              <div className="space-y-2">
                <Label>Suggested Build (Optional)</Label>
                <SearchableComboBox
                  options={[
                    { value: '', label: 'No Suggested Build' },
                    ...builds.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                  value={selectedBuildId}
                  onValueChange={setSelectedBuildId}
                  placeholder="Select build..."
                  searchPlaceholder="Search builds..."
                  emptyText="No build found."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="entryNotes">Notes</Label>
              <Input
                id="entryNotes"
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                placeholder="Any special notes for this race..."
              />
            </div>

            <Button type="button" onClick={addEntry} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Race to Run List
            </Button>
          </CardContent>
        </Card>

        {/* Races List */}
        {entries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Races ({entries.length})</CardTitle>
              <CardDescription>Your race night lineup in order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entries.map((entry, index) => (
                  <div
                    key={entry.tempId}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card/50"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveEntry(index, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6"
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveEntry(index, 'down')}
                        disabled={index === entries.length - 1}
                        className="h-6 w-6"
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1">
                      <div className="font-semibold">
                        {index + 1}. {entry.trackName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.carName || 'Any Car'}
                        {entry.buildName && ` • ${entry.buildName}`}
                        {entry.notes && ` • ${entry.notes}`}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(entry.tempId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Creating...' : 'Create Run List'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
