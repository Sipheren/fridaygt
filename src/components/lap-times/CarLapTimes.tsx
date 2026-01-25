/**
 * Car Lap Times Component
 *
 * Displays all lap times for a specific car, grouped by track.
 * Shows statistics, personal bests, and recent laps.
 *
 * Debugging Tips:
 * - Fetches from /api/cars/[carSlug]/lap-times?userOnly=true
 * - Groups lap times by track with personal best calculation
 * - Trophy icon indicates personal best lap time for that track
 * - Shows build name (Wrench icon) if buildId exists on lap time
 * - Statistics: total laps, unique tracks, fastest time across all tracks
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Trophy, Plus, MapPin, Target, Wrench } from 'lucide-react'
import Link from 'next/link'
import { formatLapTime, formatDate } from '@/lib/time'
import type {
  ComponentTrack,
  ComponentLapTime,
  TrackLapData,
  LapTimeStatistics,
  CarLapTimesProps,
} from '@/types/components'

export function CarLapTimes({ carSlug, carName }: CarLapTimesProps) {
  const [lapTimesByTrack, setLapTimesByTrack] = useState<TrackLapData[]>([])
  const [statistics, setStatistics] = useState<LapTimeStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchLapTimes()
  }, [carSlug])

  const fetchLapTimes = async () => {
    try {
      const response = await fetch(`/api/cars/${carSlug}/lap-times?userOnly=true`)
      const data = await response.json()

      setLapTimesByTrack(data.lapTimesByTrack || [])
      setStatistics(data.statistics || null)
    } catch (error) {
      console.error('Error fetching lap times:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="h-6 bg-muted/20 rounded w-48 animate-pulse"></div>
          <div className="h-32 bg-muted/20 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-bold">
            YOUR LAP TIMES
            {statistics && statistics.totalLaps > 0 && (
              <Badge variant="outline" className="ml-2 text-secondary border-secondary/30">
                {statistics.totalLaps} {statistics.totalLaps === 1 ? 'LAP' : 'LAPS'}
              </Badge>
            )}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/lap-times/new')}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Lap Time
          </Button>
          <Button
            onClick={() => router.push('/lap-times')}
            size="sm"
            variant="outline"
            className="gt-hover-link-btn"
          >
            View All Your Lap Times
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && statistics.totalLaps > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Total Laps</p>
            <p className="text-2xl font-bold tabular-nums">{statistics.totalLaps}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Tracks Driven</p>
            <p className="text-2xl font-bold tabular-nums">{lapTimesByTrack.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Fastest Time</p>
            <p className="text-2xl font-bold font-mono text-secondary">
              {statistics.fastestTime ? formatLapTime(statistics.fastestTime) : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* No Lap Times Message */}
      {lapTimesByTrack.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <Clock className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">NO LAP TIMES YET</p>
            <p className="text-sm text-muted-foreground">
              You haven't recorded any lap times with the {carName} yet.
            </p>
          </div>
          <Button
            onClick={() => router.push('/lap-times/new')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Record Your First Lap
          </Button>
        </div>
      )}

      {/* Lap Times by Track */}
      {lapTimesByTrack.length > 0 && (
        <div className="space-y-4">
          {lapTimesByTrack.map((trackData) => (
            <div
              key={trackData.track.id}
              className="border border-border rounded-lg p-4 space-y-3 gt-hover-card"
            >
              {/* Track Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 space-y-1">
                  <Link
                    href={`/tracks/${trackData.track.slug}`}
                    className="text-lg font-bold hover:text-secondary gt-hover-heading"
                  >
                    {trackData.track.name}
                  </Link>
                  {trackData.track.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="font-mono">{trackData.track.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono uppercase">Personal Best</p>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-secondary" />
                      <p className="text-xl font-bold font-mono text-secondary">
                        {formatLapTime(trackData.personalBest)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="text-xs text-center">
                      {trackData.totalLaps} {trackData.totalLaps === 1 ? 'LAP' : 'LAPS'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Recent Lap Times */}
              {trackData.recentLapTimes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-mono uppercase">Recent Laps</p>
                  <div className="space-y-1">
                    {trackData.recentLapTimes.map((lapTime) => (
                      <div
                        key={lapTime.id}
                        className="flex items-center justify-between gap-4 p-2 bg-muted/20 rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {lapTime.timeMs === trackData.personalBest && (
                            <Trophy className="h-3 w-3 text-secondary" />
                          )}
                          <span className="font-mono font-bold">
                            {formatLapTime(lapTime.timeMs)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {lapTime.buildName && (
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span>{lapTime.buildName}</span>
                            </span>
                          )}
                          {lapTime.conditions && (
                            <Badge variant="outline" className="text-xs">
                              {lapTime.conditions}
                            </Badge>
                          )}
                          <span className="font-mono">{formatDate(lapTime.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
