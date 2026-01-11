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
    trackId: string
    cars: Array<{
      carId: string
    }>
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

      // Filter run lists to only those that include this race
      const matchingRunLists = data.runLists.filter((runList: RunList) => {
        return runList.entries.some(entry => {
          // Match if track matches
          if (entry.trackId !== trackId) {
            return false
          }
          // Match if entry has no cars (open choice) OR includes this car
          if (!entry.cars || entry.cars.length === 0) {
            return true
          }
          return entry.cars.some(carEntry => carEntry.carId === carId)
        })
      })

      setRunLists(matchingRunLists)
    } catch (error) {
      console.error('Error fetching run lists for race:', error)
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
        <LoadingSection text="Loading race data..." />
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
        <div className="border-2 border-border/50 rounded-lg p-16 bg-gradient-to-br from-muted/10 to-transparent">
          <div className="text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/10 rounded-full" />
              <Target className="h-12 w-12 text-muted-foreground/40 mx-auto pt-6 relative z-10" />
            </div>
            <div>
              <p className="text-xl font-bold text-muted-foreground">RACE NOT FOUND</p>
              <p className="text-sm text-muted-foreground mt-2">
                The requested race could not be found
              </p>
            </div>
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

      {/* Race Title */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="flex items-center gap-2 text-sm font-semibold tracking-widest text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>RACE</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Car Info */}
          <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg hover:shadow-accent/10 transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent">
                  <Car className="h-5 w-5" />
                  <CardTitle className="text-sm uppercase tracking-wider">Vehicle</CardTitle>
                </div>
                {car.category && (
                  <Badge variant="outline" className="border-accent/50 text-accent text-xs">
                    {car.category}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-3xl font-bold text-foreground mt-2">
                {car.name}
              </CardDescription>
              <p className="text-sm text-muted-foreground font-mono">{car.manufacturer}</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex flex-wrap gap-2">
                {car.year && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {car.year}
                  </Badge>
                )}
                {car.driveType && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {car.driveType}
                  </Badge>
                )}
                {car.pp && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {car.pp} PP
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {car.maxPower && (
                  <span>{car.maxPower} HP</span>
                )}
                {car.weight && (
                  <span>{car.weight} kg</span>
                )}
              </div>
              <Link
                href={`/cars/${car.slug}`}
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline font-medium"
              >
                View Car Details
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </CardContent>
          </Card>

          {/* Track Info */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg hover:shadow-primary/10 transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <MapPin className="h-5 w-5" />
                  <CardTitle className="text-sm uppercase tracking-wider">Circuit</CardTitle>
                </div>
                {track.category && (
                  <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                    {track.category}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-3xl font-bold text-foreground mt-2">
                {track.name}
              </CardDescription>
              {track.layout && (
                <p className="text-sm text-muted-foreground italic">{track.layout}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {track.location && (
                <p className="text-sm text-muted-foreground font-mono">{track.location}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {track.length && (
                  <span>{track.length.toFixed(1)} km</span>
                )}
                {track.corners && (
                  <span>{track.corners} corners</span>
                )}
              </div>
              <Link
                href={`/tracks/${track.slug}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              >
                View Track Details
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase tracking-wide">Total Laps</p>
                </div>
                <p className="text-4xl font-bold tabular-nums">{statistics.totalLaps}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase tracking-wide">Drivers</p>
                </div>
                <p className="text-4xl font-bold tabular-nums">{statistics.uniqueDrivers}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Trophy className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase tracking-wide">World Record</p>
                </div>
                <p className="text-3xl font-bold font-mono text-primary">
                  {statistics.fastestTime ? formatLapTime(statistics.fastestTime) : '--:--.---'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-xs font-mono uppercase tracking-wide">Average</p>
                </div>
                <p className="text-3xl font-bold font-mono">
                  {statistics.averageTime ? formatLapTime(statistics.averageTime) : '--:--.---'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Performance */}
      <Card className="border-2 border-secondary/30 bg-gradient-to-br from-secondary/10 to-secondary/5">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-secondary" />
              <CardTitle className="text-lg">YOUR PERFORMANCE</CardTitle>
            </div>
            {userStats && userStats.position && (
              <Badge className="bg-secondary text-secondary-foreground text-sm px-3 py-1">
                #{userStats.position} on Leaderboard
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {userStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Total Laps</p>
                <p className="text-3xl font-bold tabular-nums">{userStats.totalLaps}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Personal Best</p>
                <p className="text-3xl font-bold font-mono text-secondary">
                  {formatLapTime(userStats.bestTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Average Time</p>
                <p className="text-3xl font-bold font-mono">
                  {formatLapTime(userStats.averageTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Gap to #1</p>
                <p className="text-3xl font-bold font-mono text-muted-foreground">
                  {statistics?.fastestTime
                    ? `+${formatLapTime(userStats.bestTime - statistics.fastestTime)}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-full" />
                <Award className="h-10 w-10 mx-auto text-muted-foreground/40 relative z-10 pt-3" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">No performance data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Record a lap time to track your performance!</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid - Leaderboard and Recent Laps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card className="border-2 border-border/50">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle>LEADERBOARD</CardTitle>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {leaderboard.length} {leaderboard.length === 1 ? 'Driver' : 'Drivers'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full animate-pulse" />
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 relative z-10 pt-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">No times recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to set a time on this race!</p>
                </div>
                <Button onClick={() => router.push('/lap-times/new')} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Lap Time
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between gap-4 p-4 rounded-lg transition-all ${
                      entry.userId === userStats?.userId
                        ? 'bg-gradient-to-r from-secondary/20 to-secondary/10 border-2 border-secondary/40 shadow-sm'
                        : 'bg-gradient-to-r from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/40 border border-border/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 text-center">
                        {getPositionIcon(entry.position) || (
                          <span className={`text-lg font-bold ${
                            entry.position <= 3 ? 'text-muted-foreground' : 'text-muted-foreground/60'
                          }`}>
                            {entry.position}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-base">
                          {entry.userName || entry.userEmail.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.totalLaps} {entry.totalLaps === 1 ? 'lap' : 'laps'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg">{formatLapTime(entry.bestTime)}</p>
                      {entry.position > 1 && statistics?.fastestTime && (
                        <p className="text-xs text-muted-foreground font-mono">
                          +{formatLapTime(entry.bestTime - statistics.fastestTime)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {leaderboard.length > 10 && (
                  <div className="text-center pt-3">
                    <p className="text-xs text-muted-foreground">
                      + {leaderboard.length - 10} more drivers
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User's Recent Laps */}
        <Card className="border-2 border-border/50">
          <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              <CardTitle>YOUR RECENT LAPS</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {userStats && userStats.recentLaps.length > 0 ? (
              <div className="space-y-2">
                {userStats.recentLaps.map((lap) => (
                <div
                  key={lap.id}
                  className={`flex items-center justify-between gap-4 p-4 rounded-lg transition-all ${
                    lap.timeMs === userStats.bestTime
                      ? 'bg-gradient-to-r from-secondary/20 to-secondary/10 border border-secondary/30'
                      : 'bg-gradient-to-r from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/40 border border-border/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {lap.timeMs === userStats.bestTime && (
                      <Trophy className="h-4 w-4 text-secondary flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-base">{formatLapTime(lap.timeMs)}</p>
                        {lap.sessionType && (
                          <Badge
                            variant={lap.sessionType === 'Q' ? 'secondary' : 'default'}
                            className="text-xs font-bold"
                          >
                            {lap.sessionType}
                          </Badge>
                        )}
                      </div>
                      {lap.notes && <p className="text-xs text-muted-foreground mt-1">{lap.notes}</p>}
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
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-full animate-pulse" />
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/40 relative z-10 pt-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">No lap times yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Record your first lap to see your progress!</p>
                </div>
                <Button onClick={() => router.push('/lap-times/new')} size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Lap Time
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Run Lists & Builds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-border/50">
          <CardHeader className="bg-gradient-to-r from-muted/5 to-transparent">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4" />
                RUN LISTS
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs transition-all hover:shadow-lg hover:shadow-primary/30 hover:border-primary hover:text-primary"
                onClick={() => router.push('/run-lists/new')}
              >
                <Plus className="h-3 w-3" />
                Create
              </Button>
            </div>
            {runLists.length > 0 && (
              <CardDescription>
                {runLists.length} {runLists.length === 1 ? 'list' : 'lists'} featuring this race
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {runLists.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-muted/20 to-muted/5 flex items-center justify-center">
                  <List className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    This race hasn't been added to any run lists yet
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 transition-all hover:shadow-lg hover:shadow-primary/30 hover:border-primary hover:text-primary"
                  onClick={() => router.push('/run-lists/new')}
                >
                  <Plus className="h-3 w-3" />
                  Create the First Run List
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {runLists.slice(0, 3).map((runList) => (
                  <Link
                    key={runList.id}
                    href={`/run-lists/${runList.id}`}
                    className="block p-4 border border-border/50 rounded-lg bg-gradient-to-r from-muted/20 to-transparent hover:from-muted/40 hover:border-primary/30 transition-all group"
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
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
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

        <Card className="border-2 border-border/50">
          <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                SUGGESTED BUILDS
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs transition-all hover:shadow-lg hover:shadow-accent/30 hover:border-accent hover:text-accent"
                onClick={() => router.push(`/builds/new?carId=${car.id}`)}
              >
                <Plus className="h-3 w-3" />
                Create
              </Button>
            </div>
            {builds.length > 0 && (
              <CardDescription>
                {builds.length} {builds.length === 1 ? 'build' : 'builds'} used on this race
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {builds.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-accent/60" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    No builds have been used for this race yet
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 transition-all hover:shadow-lg hover:shadow-accent/30 hover:border-accent hover:text-accent"
                  onClick={() => router.push(`/builds/new?carId=${car.id}`)}
                >
                  <Plus className="h-3 w-3" />
                  Create the First Build
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {builds.slice(0, 3).map((build) => (
                  <Link
                    key={build.id}
                    href={`/builds/${build.id}`}
                    className="block p-4 border border-border/50 rounded-lg bg-gradient-to-r from-muted/20 to-transparent hover:from-muted/40 hover:border-accent/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-sm group-hover:text-accent transition-colors">
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
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
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
