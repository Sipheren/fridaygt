'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatLapTime } from '@/lib/time'
import { Clock, Trophy, Plus, Car as CarIcon, TrendingDown } from 'lucide-react'

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
  year: number | null
}

interface LapTime {
  id: string
  timeMs: number
  notes: string | null
  conditions: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  car: Car
}

interface LapTimesByCarGroup {
  car: Car
  personalBest: number
  totalLaps: number
  recentLapTimes: LapTime[]
}

interface TrackLapTimesProps {
  trackSlug: string
  trackName: string
}

export function TrackLapTimes({ trackSlug, trackName }: TrackLapTimesProps) {
  const [lapTimesByCar, setLapTimesByCar] = useState<LapTimesByCarGroup[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadLapTimes()
  }, [trackSlug])

  const loadLapTimes = async () => {
    try {
      const response = await fetch(`/api/tracks/${trackSlug}/lap-times?userOnly=true`)
      const data = await response.json()

      if (response.ok) {
        setLapTimesByCar(data.lapTimesByCar || [])
        setStatistics(data.statistics || null)
      }
    } catch (error) {
      console.error('Error loading lap times:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="h-8 bg-muted/20 rounded animate-pulse mb-4"></div>
        <div className="space-y-3">
          <div className="h-24 bg-muted/20 rounded animate-pulse"></div>
          <div className="h-24 bg-muted/20 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (lapTimesByCar.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            YOUR LAP TIMES
          </h3>
        </div>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-4">
            You haven't recorded any lap times on {trackName} yet
          </p>
          <Button asChild>
            <Link href={`/lap-times/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Lap
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const displayedCars = showAll ? lapTimesByCar : lapTimesByCar.slice(0, 3)

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          YOUR LAP TIMES
        </h3>
        <Button asChild size="sm">
          <Link href={`/lap-times/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lap Time
          </Link>
        </Button>
      </div>

      {/* Statistics */}
      {statistics && statistics.totalLaps > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Total Laps</p>
            <p className="text-2xl font-bold tabular-nums">{statistics.totalLaps}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Cars Driven</p>
            <p className="text-2xl font-bold tabular-nums">{lapTimesByCar.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Fastest Time</p>
            <p className="text-2xl font-bold font-mono text-primary">
              {statistics.fastestTime ? formatLapTime(statistics.fastestTime) : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Personal Bests by Car */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Personal Best Times
        </h4>

        <div className="space-y-3">
          {displayedCars.map(({ car, personalBest, totalLaps, recentLapTimes }) => (
            <div
              key={car.id}
              className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Car Info */}
                  <div className="flex items-center gap-2">
                    <CarIcon className="h-4 w-4 text-muted-foreground" />
                    <Link
                      href={`/cars/${car.slug}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {car.manufacturer} {car.name}
                    </Link>
                    {car.year && (
                      <Badge variant="outline" className="text-xs">
                        {car.year}
                      </Badge>
                    )}
                  </div>

                  {/* Personal Best Time */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold font-mono text-primary">
                        {formatLapTime(personalBest)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {totalLaps} {totalLaps === 1 ? 'lap' : 'laps'}
                    </Badge>
                  </div>

                  {/* Recent Lap Times */}
                  {recentLapTimes.length > 0 && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-medium">Recent laps:</p>
                      <div className="flex flex-wrap gap-2">
                        {recentLapTimes.slice(0, 3).map((lap) => (
                          <span key={lap.id} className="font-mono">
                            {formatLapTime(lap.timeMs)}
                            {lap.timeMs === personalBest && (
                              <Trophy className="h-3 w-3 inline ml-1 text-primary" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2">
                  <Button asChild variant="linkGlow" size="sm">
                    <Link href={`/cars/${car.slug}`}>
                      View Car Details
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More/Less Button */}
        {lapTimesByCar.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            {showAll ? 'Show Less' : `Show ${lapTimesByCar.length - 3} More Cars`}
          </Button>
        )}
      </div>

      {/* Link to All Lap Times */}
      <div className="pt-4 border-t border-border">
        <Button asChild variant="linkGlow" className="w-full">
          <Link href="/lap-times">
            <TrendingDown className="h-4 w-4 mr-2" />
            View All Your Lap Times
          </Link>
        </Button>
      </div>
    </div>
  )
}
