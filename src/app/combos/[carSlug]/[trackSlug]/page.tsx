'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Car,
  MapPin,
  Trophy,
  Clock,
  TrendingUp,
  Plus,
  Users,
  Target,
  Award,
  Activity,
  Wrench,
  Globe,
  Lock,
  User,
  List
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSection } from '@/components/ui/loading'

interface CarData {
  id: string
  name: string
  slug: string
  manufacturer: string
  year: number | null
  category: string | null
  driveType: string | null
  maxPower: number | null
  weight: number | null
  pp: number | null
}

interface TrackData {
  id: string
  name: string
  slug: string
  location: string | null
  length: number | null
  corners: number | null
  category: string
  layout: string | null
}

interface LeaderboardEntry {
  position: number
  userId: string
  userName: string | null
  userEmail: string
  bestTime: number
  totalLaps: number
  lastImprovement: string
}

interface LapTime {
  id: string
  timeMs: number
  notes: string | null
  conditions: string | null
  sessionType: 'Q' | 'R' | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface UserStats {
  userId: string
  totalLaps: number
  bestTime: number
  averageTime: number
  position: number | null
  recentLaps: LapTime[]
}

interface Statistics {
  totalLaps: number
  uniqueDrivers: number
  fastestTime: number | null
  averageTime: number | null
  worldRecord: LeaderboardEntry | null
}

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
  stats?: {
    lapCount: number
    bestTime: number | null
  }
}

interface RunList {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  entries: Array<{
    id: string
    order: number
    carId: string | null
    trackId: string
  }>
}

export default function ComboDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [car, setCar] = useState<CarData | null>(null)
  const [track, setTrack] = useState<TrackData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [recentActivity, setRecentActivity] = useState<LapTime[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [runLists, setRunLists] = useState<RunList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComboData()
  }, [params.carSlug, params.trackSlug])

  const fetchComboData = async () => {
    try {
      const response = await fetch(
        `/api/combos/${params.carSlug}/${params.trackSlug}`
      )
      const data = await response.json()

      if (response.ok) {
        setCar(data.car || null)
        setTrack(data.track || null)
        setLeaderboard(data.leaderboard || [])
        setUserStats(data.userStats || null)
        setStatistics(data.statistics || null)
        setRecentActivity(data.recentActivity || [])

        // Fetch builds and run lists for this combo
        if (data.car && data.track) {
          fetchBuildsForCombo(data.car.id, data.track.id)
          fetchRunListsForCombo(data.car.id, data.track.id)
        }
      }
    } catch (error) {
      console.error('Error fetching combo data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBuildsForCombo = async (carId: string, trackId: string) => {
    try {
      // First, get lap times for this combo to find builds
      const lapTimesResponse = await fetch(`/api/combos/${params.carSlug}/${params.trackSlug}`)
      const lapTimesData = await lapTimesResponse.json()

      if (!lapTimesData.allLapTimes) {
        return
      }

      // Extract unique buildIds and calculate stats
      const buildIds = new Set<string>()
      const buildStats = new Map<string, { lapCount: number; bestTime: number | null }>()

      lapTimesData.allLapTimes.forEach((lapTime: any) => {
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

      if (buildIds.size === 0) {
        return
      }

      // Fetch build details
      const buildPromises = Array.from(buildIds).map(buildId =>
        fetch(`/api/builds/${buildId}`)
          .then(res => res.json())
          .catch(() => null)
      )

      const buildResponses = await Promise.all(buildPromises)
      const buildsData = buildResponses
        .filter(buildData => buildData && !buildData.error)
        .map(buildData => ({
          ...buildData,
          stats: buildStats.get(buildData.id)
        }))

      setBuilds(buildsData)
    } catch (error) {
      console.error('Error fetching builds for combo:', error)
    }
  }

  const fetchRunListsForCombo = async (carId: string, trackId: string) => {
    try {
      // Fetch all public run lists and user's own run lists
      const response = await fetch('/api/run-lists')
      const data = await response.json()

      if (!data.runLists) {
        return
      }

      // Filter run lists to only those that include this combo
      const matchingRunLists = data.runLists.filter((runList: RunList) => {
        return runList.entries.some(entry => {
          // Match if track matches and (car matches or car is null/open choice)
          return entry.trackId === trackId && (entry.carId === carId || entry.carId === null)
        })
      })

      setRunLists(matchingRunLists)
    } catch (error) {
      console.error('Error fetching run lists for combo:', error)
    }
  }

  const formatLapTime = (timeMs: number): string => {
    const totalSeconds = timeMs / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const milliseconds = timeMs % 1000

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(3, '0')}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'text-yellow-500'
      case 2:
        return 'text-gray-400'
      case 3:
        return 'text-orange-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const getPositionIcon = (position: number) => {
    if (position <= 3) {
      return <Trophy className={`h-4 w-4 ${getPositionColor(position)}`} />
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <LoadingSection text="Loading combo data..." />
      </div>
    )
  }

  if (!car || !track) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <Button variant="ghost" onClick={() => router.push('/')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
        <div className="border border-border rounded-lg p-12">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">COMBO NOT FOUND</p>
            <p className="text-sm text-muted-foreground font-mono">
              The requested car/track combination could not be found
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" onClick={() => router.push('/')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => router.push('/lap-times/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lap Time
        </Button>
      </div>

      {/* Combo Title */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
          <Target className="h-4 w-4" />
          <span>CAR + TRACK COMBINATION</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Car Info */}
          <Card className="border-l-4 border-l-accent">
            <CardHeader>
              <div className="flex items-center gap-2 text-accent mb-2">
                <Car className="h-5 w-5" />
                <CardTitle className="text-sm uppercase tracking-wider">Vehicle</CardTitle>
              </div>
              <CardDescription className="text-2xl font-bold text-foreground">
                {car.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-mono">{car.manufacturer}</span>
                {car.year && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {car.year}
                  </Badge>
                )}
              </div>
              <Link
                href={`/cars/${car.slug}`}
                className="text-sm text-accent hover:underline font-mono"
              >
                View Car Details →
              </Link>
            </CardContent>
          </Card>

          {/* Track Info */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary mb-2">
                <MapPin className="h-5 w-5" />
                <CardTitle className="text-sm uppercase tracking-wider">Circuit</CardTitle>
              </div>
              <CardDescription className="text-2xl font-bold text-foreground">
                {track.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {track.location && (
                <p className="text-sm text-muted-foreground font-mono">{track.location}</p>
              )}
              {track.length && (
                <p className="text-sm text-muted-foreground">
                  {track.length.toFixed(3)} km · {track.corners} corners
                </p>
              )}
              <Link
                href={`/tracks/${track.slug}`}
                className="text-sm text-primary hover:underline font-mono"
              >
                View Track Details →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase">Total Laps</p>
                </div>
                <p className="text-3xl font-bold tabular-nums">{statistics.totalLaps}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase">Drivers</p>
                </div>
                <p className="text-3xl font-bold tabular-nums">{statistics.uniqueDrivers}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase">World Record</p>
                </div>
                <p className="text-2xl font-bold font-mono text-primary">
                  {statistics.fastestTime ? formatLapTime(statistics.fastestTime) : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase">Average</p>
                </div>
                <p className="text-2xl font-bold font-mono">
                  {statistics.averageTime ? formatLapTime(statistics.averageTime) : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Stats (if available) */}
      {userStats && (
        <Card className="border-secondary/50 bg-secondary/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-secondary" />
                <CardTitle>YOUR PERFORMANCE</CardTitle>
              </div>
              {userStats.position && (
                <Badge className="bg-secondary text-secondary-foreground">
                  #{userStats.position} on Leaderboard
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase">Total Laps</p>
                <p className="text-2xl font-bold tabular-nums">{userStats.totalLaps}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase">Personal Best</p>
                <p className="text-2xl font-bold font-mono text-secondary">
                  {formatLapTime(userStats.bestTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase">Average Time</p>
                <p className="text-2xl font-bold font-mono">
                  {formatLapTime(userStats.averageTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase">Gap to #1</p>
                <p className="text-2xl font-bold font-mono">
                  {statistics?.fastestTime
                    ? `+${formatLapTime(userStats.bestTime - statistics.fastestTime)}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle>LEADERBOARD</CardTitle>
              <Badge variant="outline">{leaderboard.length} Drivers</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No times recorded yet</p>
                <Button onClick={() => router.push('/lap-times/new')} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Be the First!
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between gap-4 p-3 rounded-lg ${
                      entry.userId === userStats?.userId
                        ? 'bg-secondary/10 border border-secondary/30'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center">
                        {getPositionIcon(entry.position) || (
                          <span className="text-sm font-bold text-muted-foreground">
                            {entry.position}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {entry.userName || entry.userEmail.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.totalLaps} {entry.totalLaps === 1 ? 'lap' : 'laps'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">{formatLapTime(entry.bestTime)}</p>
                      {entry.position > 1 && statistics?.fastestTime && (
                        <p className="text-xs text-muted-foreground font-mono">
                          +{formatLapTime(entry.bestTime - statistics.fastestTime)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {leaderboard.length > 10 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    + {leaderboard.length - 10} more drivers
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              <CardTitle>RECENT ACTIVITY</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((lap) => (
                  <div
                    key={lap.id}
                    className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {lap.user.name || lap.user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(lap.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <p className="font-mono font-bold">{formatLapTime(lap.timeMs)}</p>
                        {lap.sessionType && (
                          <Badge
                            variant={lap.sessionType === 'Q' ? 'secondary' : 'default'}
                            className="text-xs font-bold"
                          >
                            {lap.sessionType}
                          </Badge>
                        )}
                      </div>
                      {lap.conditions && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {lap.conditions}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User's Recent Laps */}
      {userStats && userStats.recentLaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>YOUR RECENT LAPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userStats.recentLaps.map((lap) => (
                <div
                  key={lap.id}
                  className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {lap.timeMs === userStats.bestTime && (
                      <Trophy className="h-4 w-4 text-secondary" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold">{formatLapTime(lap.timeMs)}</p>
                        {lap.sessionType && (
                          <Badge
                            variant={lap.sessionType === 'Q' ? 'secondary' : 'default'}
                            className="text-xs font-bold"
                          >
                            {lap.sessionType}
                          </Badge>
                        )}
                      </div>
                      {lap.notes && <p className="text-xs text-muted-foreground">{lap.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {lap.conditions && (
                      <Badge variant="outline" className="text-xs">
                        {lap.conditions}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(lap.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Lists & Builds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <List className="h-4 w-4" />
              RUN LISTS
            </CardTitle>
            {runLists.length > 0 && (
              <CardDescription>
                {runLists.length} {runLists.length === 1 ? 'list' : 'lists'} featuring this combo
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {runLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This combo hasn't been added to any run lists yet
              </p>
            ) : (
              <div className="space-y-3">
                {runLists.slice(0, 3).map((runList) => (
                  <Link
                    key={runList.id}
                    href={`/run-lists/${runList.id}`}
                    className="block p-3 border border-border rounded hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {runList.name}
                      </h4>
                      <Badge
                        variant={runList.isPublic ? 'default' : 'outline'}
                        className="text-xs shrink-0"
                      >
                        {runList.isPublic ? (
                          <>
                            <Globe className="h-2 w-2 mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-2 w-2 mr-1" />
                            Private
                          </>
                        )}
                      </Badge>
                    </div>
                    {runList.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {runList.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{runList.createdBy.name || runList.createdBy.email.split('@')[0]}</span>
                      </div>
                      <span>•</span>
                      <span>{runList.entries.length} {runList.entries.length === 1 ? 'entry' : 'entries'}</span>
                      <span>•</span>
                      <span>{formatDate(runList.createdAt)}</span>
                    </div>
                  </Link>
                ))}
                {runLists.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push('/run-lists')}
                  >
                    View All {runLists.length} Lists
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              SUGGESTED BUILDS
            </CardTitle>
            {builds.length > 0 && (
              <CardDescription>
                {builds.length} {builds.length === 1 ? 'build' : 'builds'} used on this combo
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {builds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No builds have been used for this combo yet
              </p>
            ) : (
              <div className="space-y-3">
                {builds.slice(0, 3).map((build) => (
                  <Link
                    key={build.id}
                    href={`/builds/${build.id}`}
                    className="block p-3 border border-border rounded hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {build.name}
                      </h4>
                      <Badge
                        variant={build.isPublic ? 'default' : 'outline'}
                        className="text-xs shrink-0"
                      >
                        {build.isPublic ? (
                          <>
                            <Globe className="h-2 w-2 mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-2 w-2 mr-1" />
                            Private
                          </>
                        )}
                      </Badge>
                    </div>
                    {build.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {build.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{build.user.name || build.user.email.split('@')[0]}</span>
                      </div>
                      {build.stats && (
                        <>
                          <span>•</span>
                          <span>{build.stats.lapCount} {build.stats.lapCount === 1 ? 'lap' : 'laps'}</span>
                          {build.stats.bestTime && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{formatLapTime(build.stats.bestTime)}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                ))}
                {builds.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/builds?carId=${car?.id}`)}
                  >
                    View All {builds.length} Builds
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
