'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, MapPin } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import Link from 'next/link'

interface Track {
  id: string
  name: string
  slug: string
  baseName: string
  layout: string
  category: string
  location: string
  length: number
}

export default function TracksPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const categories = ['all', 'CIRCUIT', 'CITY_COURSE', 'DIRT', 'OVAL']

  useEffect(() => {
    fetchTracks()
  }, [])

  useEffect(() => {
    filterTracks()
  }, [search, selectedCategory, tracks])

  const fetchTracks = async () => {
    try {
      const response = await fetch('/api/tracks')
      const data = await response.json()
      setTracks(data.tracks || [])
      setFilteredTracks(data.tracks || [])
    } catch (error) {
      console.error('Error fetching tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTracks = () => {
    let filtered = tracks

    if (search) {
      filtered = filtered.filter(track =>
        track.name.toLowerCase().includes(search.toLowerCase()) ||
        track.location.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(track => track.category === selectedCategory)
    }

    // Sort by country, then baseName, then layout to group track variants together
    filtered.sort((a, b) => {
      if (a.location !== b.location) {
        return a.location.localeCompare(b.location)
      }
      if (a.baseName !== b.baseName) {
        return a.baseName.localeCompare(b.baseName)
      }
      const layoutA = a.layout || ''
      const layoutB = b.layout || ''
      return layoutA.localeCompare(layoutB)
    })

    setFilteredTracks(filtered)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CIRCUIT':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'CITY_COURSE':
        return 'bg-accent/10 text-accent border-accent/20'
      case 'DIRT':
        return 'bg-secondary/10 text-secondary border-secondary/20'
      case 'OVAL':
        return 'bg-chart-4/10 text-chart-4 border-chart-4/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getCategoryDisplay = (category: string) => {
    switch (category) {
      case 'CIRCUIT':
        return 'Road Course'
      case 'CITY_COURSE':
        return 'City Course'
      case 'DIRT':
        return 'Dirt'
      case 'OVAL':
        return 'Oval'
      default:
        return category
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading GT7 circuits..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            TRACKS
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'} available
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              size="sm"
              className="min-h-[44px] text-xs"
            >
              {cat === 'all' ? 'ALL TRACKS' : getCategoryDisplay(cat).toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Tracks List */}
      {filteredTracks.length === 0 ? (
        <div className="border border-border rounded-lg py-12">
          <div className="text-center space-y-4">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">NO TRACKS FOUND</p>
              <p className="text-sm text-muted-foreground font-mono">
                {search || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No tracks available'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTracks.map((track) => (
            <Link
              key={track.id}
              href={`/tracks/${track.slug}`}
              className="block"
            >
              <div className="border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer group">
                <div className="p-3 sm:p-4">
                  <div className="space-y-2">
                    {/* Track Name */}
                    <div className="min-w-0">
                      <span className="font-semibold text-base sm:text-lg block truncate">
                        {track.name}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{track.location}</span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {/* Category */}
                      <Badge className={getCategoryColor(track.category)} variant="outline">
                        {getCategoryDisplay(track.category)}
                      </Badge>

                      {/* Layout */}
                      {track.layout && track.layout !== 'Default' && (
                        <span className="text-muted-foreground">
                          {track.layout}
                        </span>
                      )}

                      {/* Length */}
                      {track.length && (
                        <span className="text-muted-foreground font-mono">
                          {track.length.toFixed(3)}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
