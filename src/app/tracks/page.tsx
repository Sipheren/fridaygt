'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, MapPin } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'

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
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <LoadingSection text="Loading GT7 circuits..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">TRACKS</h1>
        <p className="text-muted-foreground font-mono text-sm">
          {filteredTracks.length} GT7 CIRCUITS AVAILABLE
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="track-search"
            name="track-search"
            placeholder="Search tracks or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat === 'all' ? 'ALL' : getCategoryDisplay(cat).toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Track Table */}
      <div className="space-y-3">
        <div className="bg-muted/30 border border-border rounded-lg px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-mono font-semibold text-muted-foreground uppercase">
            <div className="col-span-5">Track Name</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Layout</div>
            <div className="col-span-1 text-right">Length</div>
          </div>
        </div>

        {filteredTracks.map((track) => (
          <div
            key={track.id}
            onClick={() => router.push(`/tracks/${track.slug}`)}
            className="grid grid-cols-12 gap-4 px-6 py-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent/30 hover:shadow-sm hover:shadow-accent/10 transition-all cursor-pointer group"
          >
            <div className="col-span-5 font-semibold group-hover:text-accent transition-colors">
              {track.name}
            </div>
            <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="font-mono">{track.location}</span>
            </div>
            <div className="col-span-2">
              <Badge className={getCategoryColor(track.category)} variant="outline">
                {getCategoryDisplay(track.category)}
              </Badge>
            </div>
            <div className="col-span-2 text-sm text-muted-foreground font-mono">
              {track.layout && track.layout !== 'Default' ? track.layout : '-'}
            </div>
            <div className="col-span-1 text-right font-bold tabular-nums">
              {track.length ? `${track.length.toFixed(3)}` : 'N/A'}
            </div>
          </div>
        ))}
      </div>

      {filteredTracks.length === 0 && (
        <div className="border border-border rounded-lg p-12">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">NO TRACKS FOUND</p>
            <p className="text-sm text-muted-foreground font-mono">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
