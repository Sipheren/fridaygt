/**
 * LAP TIMES LISTING PAGE
 *
 * Purpose:
 * Displays user's recorded lap times with search, filtering, and management capabilities.
 * Shows personal best indicators, session type badges, and allows deletion of records.
 *
 * Key Features:
 * - Lap times listing with track/car/build information
 * - Real-time search filtering by track name, location, car name/manufacturer
 * - Personal Best (PB) badge calculation for track/car combinations
 * - Session type indicators (Qualify/Race)
 * - Conditions and notes display
 * - Delete functionality with confirmation dialog
 * - Responsive card-based layout
 *
 * Data Flow:
 * 1. On mount, fetches all user's lap times via GET /api/lap-times
 * 2. Lap times stored in state and filtered via useMemo based on search query
 * 3. Personal bests calculated on-the-fly using Map for O(1) lookups
 * 4. Delete operations update local state after successful API response
 *
 * State Management:
 * - lapTimes: Array of all lap time records
 * - searchQuery: Current search filter string
 * - filteredLapTimes: Memoized filtered results
 * - personalBestsMap: Memoized Map of track/car -> best time
 * - deleteDialogOpen: Controls delete confirmation visibility
 * - lapToDelete: Currently selected lap for deletion
 * - deletingId: ID of lap being deleted (for loading state)
 * - showErrorDialog/errorMessage: Error display state
 *
 * API Integration:
 * - GET /api/lap-times: Fetch user's lap times (requires auth)
 * - DELETE /api/lap-times/{id}: Delete specific lap time (requires ownership)
 *
 * Personal Best Logic:
 * - Key format: "{trackId}-{carId}"
 * - Calculated across all laps for each track/car combo
 * - Displayed with trophy badge when lap.timeMs === personalBest
 *
 * Error Handling:
 * - Network errors caught and logged to console
 * - Delete errors shown in error dialog
 * - Loading states prevent duplicate operations
 *
 * Styling:
 * - Uses PageWrapper for consistent layout
 * - Card-based design with hover effects (gt-hover-card)
 * - Destructive button styling for delete actions (gt-hover-icon-btn-destructive)
 * - Responsive typography and spacing
 *
 * Common Issues:
 * - Empty states handled for no results and no search matches
 * - Delete button disabled during deletion to prevent double-clicks
 * - Search is case-insensitive
 *
 * Related Files:
 * - /api/lap-times/route.ts: Lap times API endpoints
 * - /api/lap-times/[id]/route.ts: Individual lap time operations
 * - @/lib/time: formatLapTime utility
 * - @/components/layout: PageWrapper, PageHeader, SearchBar components
 * - /lap-times/new/page.tsx: Create new lap time
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
import { Plus, Clock, Trophy, Wrench, Trash2, Loader2 } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper, PageHeader, EmptyState, SearchBar } from '@/components/layout'

interface LapTime {
  id: string
  timeMs: number
  notes: string | null
  conditions: string | null
  sessionType: 'Q' | 'R' | null
  createdAt: string
  buildId: string | null
  buildName: string | null
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
}

export default function LapTimesPage() {
  const router = useRouter()
  const [lapTimes, setLapTimes] = useState<LapTime[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [lapToDelete, setLapToDelete] = useState<LapTime | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // ===========================================================================
  // DERIVED STATE - MEMOIZED FILTERING & PERSONAL BESTS
  // ===========================================================================

  // Filter lap times based on search query
  // Searches across track name, location, car name, and manufacturer
  const filteredLapTimes = useMemo(() => {
    if (!searchQuery) {
      return lapTimes
    }

    const query = searchQuery.toLowerCase()
    return lapTimes.filter(
      (lap) =>
        lap.track.name.toLowerCase().includes(query) ||
        lap.track.location.toLowerCase().includes(query) ||
        lap.car.name.toLowerCase().includes(query) ||
        lap.car.manufacturer.toLowerCase().includes(query)
    )
  }, [lapTimes, searchQuery])

  // Pre-compute personal bests for all track/car combinations
  // Uses Map for O(1) lookup when rendering individual laps
  const personalBestsMap = useMemo(() => {
    const map = new Map<string, number>()
    lapTimes.forEach((lap) => {
      const key = `${lap.track.id}-${lap.car.id}`
      const currentBest = map.get(key)
      if (!currentBest || lap.timeMs < currentBest) {
        map.set(key, lap.timeMs)
      }
    })
    return map
  }, [lapTimes])

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  // Load lap times on component mount
  useEffect(() => {
    async function loadLapTimes() {
      try {
        const response = await fetch('/api/lap-times')
        const data = await response.json()
        setLapTimes(data.lapTimes || [])
      } catch (error) {
        console.error('Error loading lap times:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLapTimes()
  }, [])

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  // Open delete confirmation dialog
  function openDeleteDialog(lap: LapTime) {
    setLapToDelete(lap)
    setDeleteDialogOpen(true)
  }

  // Confirm and execute lap time deletion
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

      // Remove from local state to update UI immediately
      setLapTimes(lapTimes.filter((lap) => lap.id !== lapToDelete!.id))
      setDeleteDialogOpen(false)
      setLapToDelete(null)
    } catch (error: any) {
      console.error('Error deleting lap time:', error)
      setErrorMessage(error.message || 'Failed to delete lap time')
      setShowErrorDialog(true)
    } finally {
      setDeletingId(null)
    }
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading lap times..." />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* ========================================================================
          PAGE HEADER
          ======================================================================== */}
      <PageHeader
        title="MY LAP TIMES"
        icon={Clock}
        description={`${lapTimes.length} ${lapTimes.length === 1 ? 'lap' : 'laps'} recorded`}
        actions={
          <Button asChild>
            <Link href="/lap-times/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Lap Time
            </Link>
          </Button>
        }
      />

      {/* ========================================================================
          SEARCH BAR
          ======================================================================== */}
      <SearchBar
        placeholder="Search by track or car..."
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {/* ========================================================================
          LAP TIMES LIST
          ======================================================================== */}
      {filteredLapTimes.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={searchQuery ? 'No lap times match your search' : 'No lap times recorded yet'}
          actions={
            !searchQuery && (
              <Button asChild>
                <Link href="/lap-times/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Lap Time
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredLapTimes.map((lap) => {
            const key = `${lap.track.id}-${lap.car.id}`
            const personalBest = personalBestsMap.get(key)
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
                        {lap.buildName && (
                          <>
                            <span className="hidden sm:inline text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              {lap.buildName}
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

      {/* ========================================================================
          DELETE CONFIRMATION DIALOG
          ======================================================================== */}
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

      {/* ========================================================================
          ERROR DIALOG
          ======================================================================== */}
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
