'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatLapTime } from '@/lib/time'
import { Plus, Search, Clock, Trophy, Wrench, Trash2, Loader2 } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'

interface LapTime {
  id: string
  timeMs: number
  notes: string | null
  conditions: string | null
  sessionType: 'Q' | 'R' | null
  createdAt: string
  track: {
    id: string
    name: string
    slug: string
    location: string
    layout: string | null
  }
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
}

export default function LapTimesPage() {
  const router = useRouter()
  const [lapTimes, setLapTimes] = useState<LapTime[]>([])
  const [filteredLapTimes, setFilteredLapTimes] = useState<LapTime[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [lapToDelete, setLapToDelete] = useState<LapTime | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load lap times
  useEffect(() => {
    async function loadLapTimes() {
      try {
        const response = await fetch('/api/lap-times')
        const data = await response.json()
        setLapTimes(data.lapTimes || [])
        setFilteredLapTimes(data.lapTimes || [])
      } catch (error) {
        console.error('Error loading lap times:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLapTimes()
  }, [])

  // Filter lap times
  useEffect(() => {
    if (!searchQuery) {
      setFilteredLapTimes(lapTimes)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = lapTimes.filter(
      (lap) =>
        lap.track.name.toLowerCase().includes(query) ||
        lap.track.location.toLowerCase().includes(query) ||
        lap.car.name.toLowerCase().includes(query) ||
        lap.car.manufacturer.toLowerCase().includes(query)
    )
    setFilteredLapTimes(filtered)
  }, [searchQuery, lapTimes])

  // Calculate personal best for each track/car race
  const getPersonalBest = (trackId: string, carId: string) => {
    const times = lapTimes.filter(
      (lap) => lap.track.id === trackId && lap.car.id === carId
    )
    if (times.length === 0) return null
    return Math.min(...times.map((t) => t.timeMs))
  }

  function openDeleteDialog(lap: LapTime) {
    setLapToDelete(lap)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!lapToDelete) return

    setDeletingId(lapToDelete.id)

    try {
      const response = await fetch(`/api/lap-times/${lapToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete lap time')
      }

      // Remove from local state
      setLapTimes(lapTimes.filter((lap) => lap.id !== lapToDelete!.id))
      setFilteredLapTimes(filteredLapTimes.filter((lap) => lap.id !== lapToDelete!.id))
      setDeleteDialogOpen(false)
      setLapToDelete(null)
    } catch (error: any) {
      console.error('Error deleting lap time:', error)
      alert(error.message || 'Failed to delete lap time')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <LoadingSection text="Loading lap times..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            MY LAP TIMES
          </h1>
          <p className="text-muted-foreground mt-1">
            {lapTimes.length} {lapTimes.length === 1 ? 'lap' : 'laps'} recorded
          </p>
        </div>
        <Button asChild>
          <Link href="/lap-times/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Lap Time
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="lap-time-search"
          name="lap-time-search"
          type="text"
          placeholder="Search by track or car..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lap Times List */}
      {filteredLapTimes.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            {searchQuery ? 'No lap times match your search' : 'No lap times recorded yet'}
          </p>
          {!searchQuery && (
            <Button asChild className="mt-4">
              <Link href="/lap-times/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lap Time
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLapTimes.map((lap) => {
            const personalBest = getPersonalBest(lap.track.id, lap.car.id)
            const isPersonalBest = lap.timeMs === personalBest

            return (
              <div
                key={lap.id}
                className="w-full h-auto p-4 border border-border rounded-lg hover:border-primary gt-hover-card"
              >
                <div className="flex items-start justify-between gap-4 w-full">
                    <div className="flex-1 space-y-2">
                      {/* Track & Car */}
                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-2">
                        <span className="font-semibold">
                          {lap.track.name}
                          {lap.track.layout && ` - ${lap.track.layout}`}
                        </span>
                        <span className="hidden sm:inline text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          {lap.car.manufacturer} {lap.car.name}
                        </span>
                        {lap.build && (
                          <>
                            <span className="hidden sm:inline text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              {lap.build.name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-3">
                        <span className="text-xl sm:text-2xl font-bold text-primary font-mono">
                          {formatLapTime(lap.timeMs)}
                        </span>
                        {lap.sessionType && (
                          <Badge
                            variant={lap.sessionType === 'Q' ? 'secondary' : 'default'}
                            className="font-bold"
                          >
                            {lap.sessionType}
                          </Badge>
                        )}
                        {isPersonalBest && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            PB
                          </Badge>
                        )}
                        {lap.conditions && (
                          <Badge variant="outline">{lap.conditions}</Badge>
                        )}
                      </div>

                      {/* Notes & Date */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {lap.notes && <p>{lap.notes}</p>}
                        <p className="text-xs text-muted-foreground">
                          {new Date(lap.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                        </p>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(lap)}
                      disabled={deletingId === lap.id}
                      className="gt-hover-icon-btn-destructive h-11 w-11 sm:h-10 sm:w-auto sm:px-3"
                    >
                      {deletingId === lap.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lap Time</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lap time?
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="font-medium">{lapToDelete?.track.name}</p>
                <p className="text-sm text-muted-foreground">
                  {lapToDelete?.car.manufacturer} {lapToDelete?.car.name}
                </p>
                <p className="text-lg font-bold text-primary font-mono mt-2">
                  {lapToDelete && formatLapTime(lapToDelete.timeMs)}
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
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
    </div>
  )
}
