'use client'

import { useEffect, useState } from 'react'
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
import { MapPin, Car, Plus, List, Trash2, Power } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper, PageHeader, EmptyState, SearchBar } from '@/components/layout'
import Link from 'next/link'

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
  const router = useRouter()
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [deletingRaceId, setDeletingRaceId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

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
        alert(data.error || 'Failed to delete race')
        return
      }

      // Refresh the races list
      await fetchRaces()
    } catch (error) {
      console.error('Error deleting race:', error)
      alert('Failed to delete race')
    } finally {
      setDeletingRaceId(null)
      setPendingDeleteId(null)
    }
  }

  const getDisplayName = (race: Race): string => {
    if (race.name) return race.name

    const trackName = race.track?.name || 'Unknown Track'
    const firstCar = race.RaceCar?.[0]?.car
    const carName = firstCar ? `${firstCar.manufacturer} ${firstCar.name}` : 'Unknown Car'

    return `${trackName} + ${carName}`
  }

  const toggleActiveRace = async (raceId: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/races/${raceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to update race')
        return
      }

      // Optimistically update the UI
      setRaces(races.map(race =>
        race.id === raceId ? { ...race, isActive: !currentState } : race
      ))
    } catch (error) {
      console.error('Error toggling race active status:', error)
      alert('Failed to update race')
    }
  }

  const filteredRaces = races.filter((race) => {
    const displayName = getDisplayName(race).toLowerCase()
    const matchesSearch = displayName.includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (filter === 'active') return race.isActive
    if (filter === 'inactive') return !race.isActive
    return true
  })

  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading races..." />
      </PageWrapper>
    )
  }

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
                className={`shrink-0 h-11 w-11 sm:h-9 sm:w-9 ${
                  race.isActive
                    ? 'gt-hover-icon-btn-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={race.isActive ? 'Deactivate race' : 'Activate race'}
              >
                <Power className="h-4 w-4" />
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
    </PageWrapper>
  )
}
