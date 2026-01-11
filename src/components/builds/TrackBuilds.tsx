'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Globe, Lock, User, Calendar, Trophy } from 'lucide-react'
import Link from 'next/link'
import { formatLapTime } from '@/lib/time'

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  car: {
    id: string
    name: string
    slug: string
    manufacturer: string
  }
  stats?: {
    lapCount: number
    bestTime: number | null
  }
}

interface TrackBuildsProps {
  trackId: string
  trackName: string
}

export function TrackBuilds({ trackId, trackName }: TrackBuildsProps) {
  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchBuilds()
  }, [trackId])

  const fetchBuilds = async () => {
    try {
      // Fetch lap times for this track to find builds used
      const lapTimesResponse = await fetch(`/api/tracks/${trackId}/lap-times`)
      const lapTimesData = await lapTimesResponse.json()

      // Extract unique buildIds from lap times
      const buildIds = new Set<string>()
      const buildStats = new Map<string, { lapCount: number; bestTime: number | null }>()

      if (lapTimesData.lapTimes) {
        lapTimesData.lapTimes.forEach((lapTime: any) => {
          if (lapTime.buildId) {
            buildIds.add(lapTime.buildId)

            const current = buildStats.get(lapTime.buildId) || { lapCount: 0, bestTime: null }
            current.lapCount++
            if (!current.bestTime || lapTime.timeMs < current.bestTime) {
              current.bestTime = lapTime.timeMs
            }
            buildStats.set(lapTime.buildId, current)
          }
        })
      }

      if (buildIds.size === 0) {
        setLoading(false)
        return
      }

      // Fetch build details for each buildId
      const buildPromises = Array.from(buildIds).map(buildId =>
        fetch(`/api/builds/${buildId}`)
          .then(res => res.json())
          .catch(() => null)
      )

      const buildResponses = await Promise.all(buildPromises)
      const buildsData = buildResponses
        .filter(data => data && !data.error)
        .map(data => ({
          ...data,
          stats: buildStats.get(data.id)
        }))

      setBuilds(buildsData)
    } catch (error) {
      console.error('Error fetching builds:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">
            BUILDS USED ON THIS TRACK
            {builds.length > 0 && (
              <Badge variant="outline" className="ml-2 text-primary border-primary/30">
                {builds.length} {builds.length === 1 ? 'BUILD' : 'BUILDS'}
              </Badge>
            )}
          </h2>
        </div>
        <Button
          onClick={() => router.push('/builds')}
          size="sm"
          variant="outline"
          className="transition-all hover:shadow-lg hover:shadow-primary/30 hover:border-primary hover:text-primary"
        >
          View All Builds
        </Button>
      </div>

      {/* No Builds Message */}
      {builds.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <Wrench className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">NO BUILDS USED YET</p>
            <p className="text-sm text-muted-foreground">
              No builds have been used for lap times on {trackName} yet.
            </p>
          </div>
        </div>
      )}

      {/* Builds Grid */}
      {builds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builds.map((build) => (
            <Link
              key={build.id}
              href={`/builds/${build.id}`}
              className="border border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors group"
            >
              {/* Build Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                    {build.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {build.car.manufacturer} {build.car.name}
                  </p>
                  {build.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {build.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={build.isPublic ? 'default' : 'outline'}
                  className="flex items-center gap-1 text-xs"
                >
                  {build.isPublic ? (
                    <>
                      <Globe className="h-3 w-3" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      Private
                    </>
                  )}
                </Badge>
              </div>

              {/* Track Stats */}
              {build.stats && (
                <div className="flex items-center gap-4 p-2 bg-muted/30 rounded">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-mono uppercase">Laps on this Track</p>
                    <p className="text-lg font-bold">{build.stats.lapCount}</p>
                  </div>
                  {build.stats.bestTime && (
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-mono uppercase">Best Time</p>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-secondary" />
                        <p className="text-lg font-bold font-mono text-secondary">
                          {formatLapTime(build.stats.bestTime)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Build Info */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{build.user.name || build.user.email.split('@')[0]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className="font-mono">{formatDate(build.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
