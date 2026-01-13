'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { MapPin, Car, Plus, List, Globe, Search, Trash2 } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
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

interface RunList {
  id: string
  name: string
  isPublic: boolean
}

interface Race {
  id: string
  name: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  track: Track
  RaceCar: RaceCar[]
  isActive: boolean
  runLists: RunList[]
  runListCount: number
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSection />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <List className="h-8 w-8 text-primary" />
            RACES
          </h1>
          <p className="text-muted-foreground mt-1">
            {races.length} {races.length === 1 ? 'race' : 'races'} across run lists
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search races..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
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
        <div className="text-center py-12 border border-border rounded-lg">
          <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            {races.length === 0
              ? 'No races found'
              : search || filter !== 'all'
              ? 'No races match your search or filter'
              : 'No races found'}
          </p>
          {races.length === 0 && (
            <Button asChild className="mt-4">
              <Link href="/run-lists">
                <Plus className="h-4 w-4 mr-2" />
                Go to Run Lists
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRaces.map((race) => (
            <div
              key={race.id}
              className={`group relative flex items-start gap-2 border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors ${
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

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {race.isActive ? (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    {/* Run Lists */}
                    {race.runListCount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">
                          {race.runListCount === 1
                            ? 'Used in 1 run list:'
                            : `Used in ${race.runListCount} run lists:`}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {race.runLists.slice(0, 3).map((rl) => (
                            <Badge
                              key={rl.id}
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                router.push(`/run-lists/${rl.id}`)
                              }}
                            >
                              <Globe className="h-2.5 w-2.5 mr-1" />
                              <span className="truncate max-w-[120px]">{rl.name}</span>
                            </Badge>
                          ))}
                          {race.runListCount > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{race.runListCount - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>

            {/* Delete Button */}
            <div className="p-2 sm:p-4 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  deleteRace(race.id)
                }}
                disabled={deletingRaceId === race.id}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-11 w-11 sm:h-9 sm:w-9"
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
    </div>
  )
}
