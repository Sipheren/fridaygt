'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrackLapTimes } from '@/components/lap-times/TrackLapTimes'
import { TrackBuilds } from '@/components/builds/TrackBuilds'
import { MapPin, ArrowLeft, Route, Navigation } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'

interface Track {
  id: string
  name: string
  slug: string
  baseName: string | null
  layout: string | null
  location: string | null
  length: number | null
  corners: number | null
  imageUrl: string | null
  category: string
  isReverse: boolean
  baseTrackId: string | null
}

export default function TrackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrack()
  }, [params.slug])

  const fetchTrack = async () => {
    try {
      const response = await fetch(`/api/tracks/${params.slug}`)
      const data = await response.json()
      setTrack(data.track || null)
    } catch (error) {
      console.error('Error fetching track:', error)
    } finally {
      setLoading(false)
    }
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
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <LoadingSection text="Loading track..." />
      </div>
    )
  }

  if (!track) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/tracks')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tracks
        </Button>
        <div className="border border-border rounded-lg p-12">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">TRACK NOT FOUND</p>
            <p className="text-sm text-muted-foreground font-mono">
              The requested track could not be found
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/tracks')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tracks
      </Button>

      {/* Track Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">{track.name}</h1>
            {track.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="font-mono text-lg">{track.location}</span>
              </div>
            )}
          </div>
          <Badge
            className={`${getCategoryColor(track.category)} text-sm`}
            variant="outline"
          >
            {getCategoryDisplay(track.category)}
          </Badge>
        </div>

        {/* Track Image Placeholder */}
        <div className="relative w-full h-64 bg-muted/30 rounded-lg border border-border flex items-center justify-center">
          <div className="text-center space-y-2">
            <Route className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground font-mono">Track Layout</p>
          </div>
        </div>
      </div>

      {/* Track Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Length */}
        <div className="border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Navigation className="h-4 w-4" />
            <span className="text-sm font-mono uppercase">Length</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {track.length ? `${track.length.toFixed(3)} km` : 'N/A'}
          </p>
        </div>

        {/* Corners */}
        <div className="border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Route className="h-4 w-4" />
            <span className="text-sm font-mono uppercase">Corners</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {track.corners || 'N/A'}
          </p>
        </div>

        {/* Layout */}
        <div className="border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Route className="h-4 w-4" />
            <span className="text-sm font-mono uppercase">Layout</span>
          </div>
          <p className="text-2xl font-bold">
            {track.layout && track.layout !== 'Default' ? track.layout : 'Standard'}
          </p>
          {track.isReverse && (
            <Badge variant="secondary" className="text-xs">
              Reverse
            </Badge>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold">TRACK INFORMATION</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-mono uppercase">Base Name</p>
            <p className="font-semibold">{track.baseName || track.name}</p>
          </div>
          {track.layout && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono uppercase">Configuration</p>
              <p className="font-semibold">{track.layout}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lap Times Section */}
      <TrackLapTimes trackSlug={track.slug} trackName={track.name} />

      {/* Builds Section */}
      <TrackBuilds trackId={track.id} trackName={track.name} />

      {/* Placeholder for future: Run History */}
      <div className="border border-border rounded-lg p-6">
        <h3 className="font-bold mb-2">RUN HISTORY</h3>
        <p className="text-sm text-muted-foreground">Coming soon...</p>
      </div>
    </div>
  )
}
