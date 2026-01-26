/**
 * Races Listing Page
 *
 * Purpose: Main page for viewing and managing races
 * - Lists all races with search and filtering capabilities
 * - Supports active/inactive races with visual badges
 * - Toggle active status for races
 * - Delete functionality with confirmation dialog
 * - Navigate to race details and creation
 *
 * **Key Features:**
 * - Search: Full-text search across race name, track name, car names
 * - Filters: All races, Active only, Inactive only
 * - Race cards: Display name, track, cars, status badges
 * - Action buttons: Toggle active, Delete (with confirmation dialog)
 * - Empty states: Contextual messages for no results
 * - Loading states: Loading spinner during data fetch
 *
 * **Data Flow:**
 * 1. Page loads → fetchRaces() called
 * 2. API call: GET /api/races
 * 3. Races stored in state → filtered by search term and active status
 * 4. User can click race → Navigate to /races/[id]
 * 5. User can toggle active → PATCH /api/races/[id] with { isActive: bool }
 * 6. User can delete → Confirm dialog → DELETE /api/races/[id]
 *
 * **State Management:**
 * - races: Array of all races from API
 * - search: Search query string
 * - filter: 'all' | 'active' | 'inactive'
 * - loading: Loading state during fetch
 * - deletingRaceId: ID of race being deleted (for loading state)
 * - showDeleteDialog: Delete confirmation dialog visibility
 * - pendingDeleteId: ID of race pending deletion
 * - showErrorDialog: Error dialog visibility
 * - errorMessage: Error message to display
 * - togglingRaceId: ID of race being toggled (for loading state)
 *
 * **Filtering Logic:**
 * - All: Shows all races
 * - Active: Only races with isActive = true
 * - Inactive: Only races with isActive = false
 * - Search: Client-side filter by display name (race name, track, cars)
 *
 * **Delete Flow:**
 * 1. User clicks delete → deleteRace(raceId) called
 * 2. Sets pendingDeleteId → Shows delete confirmation dialog
 * 3. User confirms → confirmDelete() called
 * 4. DELETE /api/races/[id] → Sets deletingRaceId
 * 5. On success → Refresh races list
 * 6. On error → Show error dialog, user stays on page
 *
 * **Toggle Active Flow:**
 * 1. User clicks power button → toggleActiveRace(raceId, currentState) called
 * 2. Sets togglingRaceId → Shows loading on button
 * 3. PATCH /api/races/[id] with { isActive: !currentState }
 * 4. On success → Update local state (no need to refresh)
 * 5. On error → Show error dialog
 *
 * **Display Name Logic:**
 * - Priority 1: race.name (if set)
 * - Priority 2: "{Track Name} + {Car Name}" (if no name)
 * - Fallback: "Unknown Track + Unknown Car"
 * - Memoized: To avoid re-computation on every render
 *
 * **Race Card Display:**
 * - Display name (large, bold)
 * - Track: MapPin icon with track name (link to track detail)
 * - Cars: Car icon with count, list of up to 3 cars
 * - Status badges: Active (default), Inactive (secondary)
 * - Configuration badges: Laps, Weather
 * - Action buttons: Toggle active (power icon), Delete (trash icon)
 *
 * **Empty State Logic:**
 * - No races: "No races found" + "Create Your First Race"
 * - Search/filter: "No races match your search or filter"
 * - Icon: List icon
 *
 * **API Integration:**
 * - GET /api/races: Fetch all races
 * - DELETE /api/races/[id]: Delete a race
 * - PATCH /api/races/[id]: Update race (toggle active)
 * - Response: { races: Race[], error?: string }
 *
 * **Access Control:**
 * - Authenticated: User must be logged in
 * - View: Any authenticated user can view races
 * - Delete: Any authenticated user can delete
 * - Toggle: Any authenticated user can toggle active
 *
 * **Page Layout:**
 * - PageWrapper: Standard container with padding
 * - PageHeader: Title "RACES", icon, description, actions
 * - SearchBar: Search input with centered icon
 * - Filter buttons: 3-column grid (All, Active, Inactive)
 * - Race cards: Stacked list with hover effects
 * - Dialogs: Delete confirmation, error display
 *
 * **Styling:**
 * - Cards: gt-hover-card class for hover effects
 * - Inactive races: opacity-50 for visual distinction
 * - Buttons: min-h-[44px] for touch targets
 * - Badges: Active (default), Inactive (secondary)
 * - Loading: LoadingSection component with spinner
 * - Toggle button: gt-hover-icon-btn-primary when active
 * - Responsive: Mobile-first, stacked on mobile
 *
 * **Navigation:**
 * - Create Race: /races/new (from header button)
 * - Race Detail: /races/[id] (from card click)
 * - Track Detail: /tracks/[slug] (from track name link)
 *
 * **Error Handling:**
 * - Fetch error: Console log, show empty state
 * - Delete error: Show error dialog with message
 * - Toggle error: Show error dialog with message
 * - API returns error: Show error dialog with data.error
 * - User stays: Can retry after error
 *
 * **Optimizations:**
 * - useMemo: Filter races and getDisplayName memoized
 * - useCallback: getDisplayName function memoized
 * - Client-side search: Faster than API calls for search
 * - Local state update: No need to refresh after toggle
 *
 * **Related Files:**
 * - @/app/races/new/page.tsx: Create new race
 * - @/app/races/[id]/page.tsx: Race detail page
 * - @/app/api/races/route.ts: Races API endpoint
 * - @/components/layout: PageWrapper, PageHeader, EmptyState, SearchBar
 */

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MapPin, Car, Plus, List, Trash2, Power, Loader2 } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper, PageHeader, EmptyState, SearchBar } from '@/components/layout'
import Link from 'next/link'

// ============================================================
// TYPES
// ============================================================
interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
}

interface RaceCar {
  id: string
  carId: string
  buildId: string | null
  car: Car
}

interface Track {
  id: string
  name: string
  slug: string
  location: string | null
  category: string
}

interface Race {
  id: string
  name: string | null
  description: string | null
  laps: number | null
  weather: string | null
  createdAt: string
  updatedAt: string
  track: Track
  RaceCar: RaceCar[]
  isActive: boolean
}

type FilterType = 'all' | 'active' | 'inactive'

export default function RacesPage() {
  // ============================================================
  // STATE
  // ============================================================
  const router = useRouter()
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [deletingRaceId, setDeletingRaceId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [togglingRaceId, setTogglingRaceId] = useState<string | null>(null)

  // ============================================================
  // DATA FETCHING
  // ============================================================
  useEffect(() => {
    fetchRaces()
  }, [])

  const fetchRaces = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/races')
      const data = await res.json()
      setRaces(data.races || [])
    } catch (error) {
      console.error('Error fetching races:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // DERIVED STATE - DISPLAY NAME & FILTERING
  // ============================================================
  // Memoize display name function to avoid re-creation
  const getDisplayName = useCallback((race: Race): string => {
    if (race.name) return race.name

    const trackName = race.track?.name || 'Unknown Track'
    const firstCar = race.RaceCar?.[0]?.car
    const carName = firstCar ? `${firstCar.manufacturer} ${firstCar.name}` : 'Unknown Car'

    return `${trackName} + ${carName}`
  }, [])

  // Memoize filtered races to avoid re-filtering on every render
  // - Filters by search query and active status
  const filteredRaces = useMemo(() => {
    return races.filter((race) => {
      const displayName = getDisplayName(race).toLowerCase()
      const matchesSearch = displayName.includes(search.toLowerCase())

      if (!matchesSearch) return false

      if (filter === 'active') return race.isActive
      if (filter === 'inactive') return !race.isActive
      return true
    })
  }, [races, search, filter, getDisplayName])

  // ============================================================
  // ACTION HANDLERS - DELETE & TOGGLE
  // ============================================================
  const deleteRace = async (raceId: string) => {
    setPendingDeleteId(raceId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return

    setDeletingRaceId(pendingDeleteId)
    setShowDeleteDialog(false)

    try {
      const res = await fetch(`/api/races/${pendingDeleteId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error || 'Failed to delete race')
        setShowErrorDialog(true)
        return
      }

      // Refresh the races list
      await fetchRaces()
    } catch (error) {
      console.error('Error deleting race:', error)
      setErrorMessage('Failed to delete race')
      setShowErrorDialog(true)
    } finally {
      setDeletingRaceId(null)
      setPendingDeleteId(null)
    }
  }

  // Toggle race active status with optimistic update
  // - Updates local state immediately (no need to refresh)
  const toggleActiveRace = async (raceId: string, currentState: boolean) => {
    setTogglingRaceId(raceId)

    try {
      const res = await fetch(`/api/races/${raceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error || 'Failed to update race')
        setShowErrorDialog(true)
        return
      }

      // Update the UI with the new state
      setRaces(races.map(race =>
        race.id === raceId ? { ...race, isActive: !currentState } : race
      ))
    } catch (error) {
      console.error('Error toggling race active status:', error)
      setErrorMessage('Failed to update race')
      setShowErrorDialog(true)
    } finally {
      setTogglingRaceId(null)
    }
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading races..." />
      </PageWrapper>
    )
  }

  // ============================================================
  // PAGE RENDER
  // ============================================================
  return (
    <PageWrapper>
      {/* Header */}
      <PageHeader
        title="RACES"
        icon={List}
        description={`${races.length} ${races.length === 1 ? 'race' : 'races'} available`}
        actions={
          <Button asChild className="gap-2 min-h-[44px]">
            <Link href="/races/new">
              <Plus className="h-4 w-4" />
              Create Race
            </Link>
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <SearchBar
          placeholder="Search races..."
          value={search}
          onChange={setSearch}
        />
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
            className="min-h-[44px] text-xs"
          >
            All Races
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            size="sm"
            className="min-h-[44px] text-xs"
          >
            Active
          </Button>
          <Button
            variant={filter === 'inactive' ? 'default' : 'outline'}
            onClick={() => setFilter('inactive')}
            size="sm"
            className="min-h-[44px] text-xs"
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Races List */}
      {filteredRaces.length === 0 ? (
        <EmptyState
          icon={List}
          title={
            races.length === 0
              ? 'No races found'
              : search || filter !== 'all'
              ? 'No races match your search or filter'
              : 'No races found'
          }
          actions={
            races.length === 0 && (
              <Button asChild>
                <Link href="/races/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Race
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRaces.map((race) => (
            <div
              key={race.id}
              className={`group relative flex items-start gap-2 gt-hover-card ${
                !race.isActive ? 'opacity-50' : ''
              }`}
            >
              <Link href={`/races/${race.id}`} className="flex-1 min-w-0">
                <div className="flex items-start gap-3 w-full p-3 sm:p-4">
                        <div className="flex-1 min-w-0 space-y-2">
                    {/* Race Name */}
                    <div className="pr-12 min-w-0">
                      <span className="font-semibold text-base sm:text-lg block truncate">
                        {getDisplayName(race)}
                      </span>
                    </div>

                    {/* Track */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{race.track?.name || 'Unknown Track'}</span>
                    </div>

                    {/* Cars */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="h-4 w-4 shrink-0" />
                        <span>
                          {race.RaceCar.length === 0
                            ? 'No cars'
                            : race.RaceCar.length === 1
                            ? '1 car'
                            : `${race.RaceCar.length} cars`}
                        </span>
                      </div>
                      {race.RaceCar.length > 0 && (
                        <div className="pl-4 sm:pl-6 space-y-0.5 text-sm text-muted-foreground">
                          {race.RaceCar.slice(0, 3).map((rc) => (
                            <div key={rc.id} className="line-clamp-1 text-xs sm:text-sm">
                              • {rc.car?.manufacturer || ''} {rc.car?.name || 'Unknown Car'}
                            </div>
                          ))}
                          {race.RaceCar.length > 3 && (
                            <div className="italic text-xs">
                              +{race.RaceCar.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Badge and Configuration */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {race.isActive ? (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {race.laps && (
                        <Badge variant="outline" className="text-xs">
                          {race.laps} laps
                        </Badge>
                      )}
                      {race.weather && (
                        <Badge variant="outline" className="text-xs">
                          {race.weather}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>

            {/* Action Buttons */}
            <div className="p-2 sm:p-4 shrink-0 flex gap-1">
              {/* Active Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleActiveRace(race.id, race.isActive)
                }}
                disabled={togglingRaceId === race.id}
                className={`shrink-0 h-11 w-11 sm:h-9 sm:w-9 ${
                  race.isActive
                    ? 'gt-hover-icon-btn-primary'
                    : 'text-muted-foreground hover:text-foreground'
                } ${togglingRaceId === race.id ? 'animate-pulse' : ''}`}
                title={race.isActive ? 'Deactivate race' : 'Activate race'}
              >
                {togglingRaceId === race.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
              </Button>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  deleteRace(race.id)
                }}
                disabled={deletingRaceId === race.id}
                className="gt-hover-icon-btn-destructive shrink-0 h-11 w-11 sm:h-9 sm:w-9"
              >
                {deletingRaceId === race.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Race?</DialogTitle>
            <DialogDescription>
              This will permanently delete this race. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setPendingDeleteId(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Race
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
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
