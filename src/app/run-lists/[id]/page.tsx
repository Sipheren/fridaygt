'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SearchableComboBox } from '@/components/ui/searchable-combobox'
import { LoadingSection } from '@/components/ui/loading'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Copy,
  Globe,
  Lock,
  User,
  Calendar,
  List,
  GripVertical,
  Radio,
} from 'lucide-react'

interface RunList {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    email: string
    name: string | null
  }
  entries: Array<{
    id: string
    order: number
    notes: string | null
    raceid: string | null
    track: {
      id: string
      name: string
      slug: string
      layout: string | null
    }
    cars: Array<{
      id: string
      carId: string
      buildId: string | null
      car: {
        id: string
        name: string
        slug: string
        manufacturer: string
      }
      build: {
        id: string
        name: string
        description: string | null
      } | null
    }>
  }>
}

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

interface SortableRaceItemProps {
  entry: RunList['entries'][0]
  index: number
  isOwner: boolean
  onRemove: (id: string) => void
  onClick: () => void
  deletingRaceId: string | null
}

function SortableRaceItem({ entry, index, isOwner, onRemove, onClick, deletingRaceId }: SortableRaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 border border-border rounded-lg hover:border-primary/30 transition-colors group"
    >
      {isOwner && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div
        className="font-mono text-lg font-bold text-muted-foreground w-8"
      >
        {index}
      </div>
      <div className="flex-1 cursor-pointer" onClick={onClick}>
        <div className="font-semibold group-hover:text-primary transition-colors">
          {entry.track.name}
          {entry.track.layout && ` - ${entry.track.layout}`}
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          {entry.cars && entry.cars.length > 0 ? (
            entry.cars.map((carEntry) => (
              <div key={carEntry.id}>
                {carEntry.car.manufacturer} {carEntry.car.name}
                {carEntry.build && ` • Build: ${carEntry.build.name}`}
              </div>
            ))
          ) : (
            <div>Any Car</div>
          )}
          {entry.notes && <div className="italic">{entry.notes}</div>}
        </div>
      </div>
      {isOwner && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(entry.id)
          }}
          disabled={deletingRaceId === entry.id}
          className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {deletingRaceId === entry.id ? (
            <LoadingSection variant="spinner" className="h-4 w-4" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}

export default function RunListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [runList, setRunList] = useState<RunList | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingRace, setAddingRace] = useState(false)
  const [deletingRaceId, setDeletingRaceId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Edit mode state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [editIsActive, setEditIsActive] = useState(false)

  // Add race state
  const [tracks, setTracks] = useState<Track[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [selectedCars, setSelectedCars] = useState<Array<{ carId: string; buildId: string }>>([])
  const [selectedCarId, setSelectedCarId] = useState('')
  const [selectedBuildId, setSelectedBuildId] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [carBuilds, setCarBuilds] = useState<Record<string, Build[]>>({})

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchRunList()
    fetchCurrentUser()
    loadFormData()
  }, [id])

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/session')
      const session = await res.json()
      setCurrentUserId(session?.user?.id || null)
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const loadFormData = async () => {
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
      console.error('Error loading form data:', error)
    }
  }

  const fetchRunList = async () => {
    try {
      const res = await fetch(`/api/run-lists/${id}`)
      if (!res.ok) throw new Error('Failed to fetch run list')
      const data = await res.json()
      setRunList(data)
      setEditName(data.name)
      setEditDescription(data.description || '')
      setEditIsPublic(data.isPublic)
      setEditIsActive(data.isActive || false)
    } catch (error) {
      console.error('Error fetching run list:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBuildsForCar = async (carId: string): Promise<Build[]> => {
    // Return cached builds if already loaded
    if (carBuilds[carId]) {
      return carBuilds[carId]
    }

    if (!carId) return []

    try {
      const res = await fetch(`/api/builds?carId=${carId}`)
      const data = await res.json()
      const builds = data.builds || []
      // Cache the builds for this car
      setCarBuilds(prev => ({ ...prev, [carId]: builds }))
      return builds
    } catch (error) {
      console.error('Error loading builds:', error)
      return []
    }
  }

  const handleCarChange = async (carId: string) => {
    setSelectedCarId(carId)
    setSelectedBuildId('')
    setBuilds([])

    if (carId) {
      const builds = await loadBuildsForCar(carId)
      setBuilds(builds)
    }
  }

  const updateCarBuild = async (carId: string, buildId: string) => {
    setSelectedCars(selectedCars.map(c =>
      c.carId === carId ? { ...c, buildId } : c
    ))
  }

  const addCarToSelection = () => {
    if (!selectedCarId) return
    if (selectedCars.some(c => c.carId === selectedCarId)) {
      alert('This car is already added')
      return
    }
    setSelectedCars([...selectedCars, { carId: selectedCarId, buildId: selectedBuildId }])

    // Preload builds for this car if not already loaded
    if (!carBuilds[selectedCarId]) {
      loadBuildsForCar(selectedCarId)
    }

    setSelectedCarId('')
    setSelectedBuildId('')
    setBuilds([])
  }

  const removeCarFromSelection = (carId: string) => {
    setSelectedCars(selectedCars.filter(c => c.carId !== carId))
  }

  const addEntry = async () => {
    if (!selectedTrackId) {
      alert('Please select a track')
      return
    }

    if (selectedCars.length === 0) {
      alert('Please add at least one car')
      return
    }

    setAddingRace(true)

    try {
      const res = await fetch(`/api/run-lists/${id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: selectedTrackId,
          cars: selectedCars,
          notes: entryNotes || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to add race')

      // Reset form
      setSelectedTrackId('')
      setSelectedCars([])
      setSelectedCarId('')
      setSelectedBuildId('')
      setEntryNotes('')
      setBuilds([])

      // Refresh run list
      await fetchRunList()
    } catch (error) {
      console.error('Error adding race:', error)
      alert('Failed to add race')
    } finally {
      setAddingRace(false)
    }
  }

  const removeEntry = async (entryId: string) => {
    setPendingDeleteId(entryId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return

    setDeletingRaceId(pendingDeleteId)
    setShowDeleteDialog(false)

    try {
      const res = await fetch(`/api/run-lists/${id}/entries/${pendingDeleteId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to remove race')

      await fetchRunList()
    } catch (error) {
      console.error('Error removing race:', error)
      alert('Failed to remove race')
    } finally {
      setDeletingRaceId(null)
      setPendingDeleteId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !runList) {
      return
    }

    const oldIndex = runList.entries.findIndex((e) => e.id === active.id)
    const newIndex = runList.entries.findIndex((e) => e.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistically update UI
    const newEntries = arrayMove(runList.entries, oldIndex, newIndex)
    setRunList({ ...runList, entries: newEntries })

    try {
      // Update order on server (don't wait for success, fire and forget)
      fetch(`/api/run-lists/${id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: active.id,
          newOrder: newIndex + 1,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          console.error('Failed to reorder races')
          // Revert on error
          fetchRunList()
          alert('Failed to reorder races')
        }
        // On success, we keep the optimistic UI - no need to refresh
      }).catch((error) => {
        console.error('Error reordering races:', error)
        // Revert on error
        fetchRunList()
        alert('Failed to reorder races')
      })
    } catch (error) {
      console.error('Error reordering races:', error)
      // Revert on error
      fetchRunList()
      alert('Failed to reorder races')
    }
  }

  const saveChanges = async () => {
    if (!editName.trim()) {
      alert('Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/run-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          isPublic: editIsPublic,
          isActive: editIsActive,
        }),
      })

      if (!res.ok) throw new Error('Failed to save changes')

      setIsEditing(false)
      fetchRunList()
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditName(runList?.name || '')
    setEditDescription(runList?.description || '')
    setEditIsPublic(runList?.isPublic || true)
    setEditIsActive(runList?.isActive || false)
  }

  const deleteRunList = async () => {
    if (!confirm('Are you sure you want to delete this run list? This cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/run-lists/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete run list')

      router.push('/run-lists')
    } catch (error) {
      console.error('Error deleting run list:', error)
      alert('Failed to delete run list')
    }
  }

  if (loading) {
    return <LoadingSection text="Loading run list..." />
  }

  if (!runList) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold">Run list not found</p>
        <Button asChild className="mt-4">
          <Link href="/run-lists">Back to Run Lists</Link>
        </Button>
      </div>
    )
  }

  const isOwner = currentUserId === runList.createdBy.id

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/run-lists">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Run Lists
          </Link>
        </Button>
        <div className="flex gap-2">
          {isOwner && !isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={deleteRunList} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button onClick={saveChanges} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Run List Details */}
      <Card>
        <CardHeader>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-public"
                  checked={editIsPublic}
                  onCheckedChange={setEditIsPublic}
                />
                <Label htmlFor="edit-public">Public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
                <Label htmlFor="edit-active" className="flex items-center gap-2">
                  <Radio className={`h-4 w-4 ${editIsActive ? 'text-secondary animate-pulse' : ''}`} />
                  Active Run List
                </Label>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{runList.name}</CardTitle>
                <Badge variant={runList.isPublic ? 'default' : 'outline'}>
                  {runList.isPublic ? (
                    <>
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </>
                  )}
                </Badge>
                {runList.isActive && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Active
                  </Badge>
                )}
              </div>
              {runList.description && (
                <CardDescription className="text-base">{runList.description}</CardDescription>
              )}
            </>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{runList.createdBy.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {new Date(runList.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <List className="h-4 w-4" />
              <span>{runList.entries.length} races</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Races */}
      <Card>
        <CardHeader>
          <CardTitle>Races ({runList.entries.length})</CardTitle>
          <CardDescription>
            {isOwner ? 'Drag to reorder • Click to view race details' : 'Race night lineup'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runList.entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No races yet. {isOwner && 'Add your first race below.'}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={runList.entries.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {runList.entries.map((entry, index) => (
                      <SortableRaceItem
                        key={entry.id}
                        entry={entry}
                        index={index + 1}
                        isOwner={isOwner}
                        onRemove={removeEntry}
                        onClick={() => {
                          // Navigate to race detail page if raceId exists
                          if (entry.raceid) {
                            router.push(`/races/${entry.raceid}`)
                          }
                        }}
                        deletingRaceId={deletingRaceId}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add Race (Owner Only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Add Race</CardTitle>
            <CardDescription>Add a new race to the run list</CardDescription>
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

            <div className="space-y-3">
              <Label>Cars *</Label>
              <div className="space-y-2">
                <SearchableComboBox
                  options={cars.map((c) => ({ value: c.id, label: `${c.manufacturer} ${c.name}` }))}
                  value={selectedCarId}
                  onValueChange={handleCarChange}
                  placeholder="Select car..."
                  searchPlaceholder="Search cars..."
                  emptyText="No car found."
                />
                {selectedCarId && builds.length > 0 && (
                  <SearchableComboBox
                    options={[
                      { value: '', label: 'No Build' },
                      ...builds.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                    value={selectedBuildId}
                    onValueChange={setSelectedBuildId}
                    placeholder="Select build (optional)..."
                    searchPlaceholder="Search builds..."
                    emptyText="No build found."
                  />
                )}
                <Button
                  type="button"
                  onClick={addCarToSelection}
                  disabled={!selectedCarId}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Car
                </Button>
              </div>

              {selectedCars.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">
                    Selected Cars ({selectedCars.length})
                  </Label>
                  <div className="space-y-3">
                    {selectedCars.map((carSelection) => {
                      const car = cars.find(c => c.id === carSelection.carId)
                      if (!car) return null
                      const availableBuilds = carBuilds[carSelection.carId] || []
                      return (
                        <div
                          key={carSelection.carId}
                          className="p-3 border border-border rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {car.manufacturer} {car.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCarFromSelection(carSelection.carId)}
                              className="text-destructive hover:text-destructive h-7 w-7 p-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Build:</span>
                            <SearchableComboBox
                              options={[
                                { value: '', label: 'None' },
                                ...availableBuilds.map((b) => ({ value: b.id, label: b.name })),
                              ]}
                              value={carSelection.buildId || ''}
                              onValueChange={(buildId) => updateCarBuild(carSelection.carId, buildId)}
                              placeholder="Select build..."
                              searchPlaceholder="Search builds..."
                              emptyText="No builds found for this car"
                              className="flex-1"
                            />
                            {availableBuilds.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">
                                No builds available
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                placeholder="Any special notes..."
              />
            </div>

            <Button type="button" onClick={addEntry} disabled={addingRace} className="w-full">
              {addingRace ? (
                <>
                  <LoadingSection variant="spinner" className="h-4 w-4 mr-2" />
                  Adding Race...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Race
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Race from Run List?</DialogTitle>
            <DialogDescription>
              This will remove the race from the run list. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false)
              setPendingDeleteId(null)
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove Race
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
