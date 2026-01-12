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
  Users,
  Target,
  Award,
  Activity,
  Wrench,
  Globe,
  Lock,
  List,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSection } from '@/components/ui/loading'
import { formatLapTime } from '@/lib/time'

interface RaceCar {
  id: string
  carId: string
  buildId: string | null
  car: {
    id: string
    name: string
    slug: string
    manufacturer: string
    year: number | null
    category: string | null
    imageUrl?: string
  }
  build: {
    id: string
    name: string
    description: string | null
    isPublic: boolean
  } | null
}

interface Race {
  id: string
  name: string | null
  description: string | null
  createdat: string
  updatedat: string
  track: {
    id: string
    name: string
    slug: string
    location: string | null
    length: number | null
    category: string
    layout: string | null
    imageUrl?: string
  }
  createdby: {
    id: string
    name: string | null
    email: string
  }
  raceCars: RaceCar[]
}

interface LeaderboardEntry {
  position: number
  userId: string
  userName: string | null
  userEmail: string
  carId: string
  carName: string
  buildId: string | null
  buildName: string | null
  bestTime: number
  totalLaps: number
  bestLapId: string
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
  car: {
    id: string
    name: string
    slug: string
    manufacturer: string
    year: number | null
  }
  build: {
    id: string
    name: string
    description: string | null
    isPublic: boolean
  } | null
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

interface RunListReference {
  id: string
  order: number
  notes: string | null
  runList: {
    id: string
    name: string
    isPublic: boolean
    createdById: string
  }
}

export default function RaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [race, setRace] = useState<Race | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [runLists, setRunLists] = useState<RunListReference[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRaceData()
  }, [params.id])

  const fetchRaceData = async () => {
    try {
      const response = await fetch(`/api/races/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setRace(data.race || null)
        setLeaderboard(data.leaderboard || [])
        setUserStats(data.userStats || null)
        setStatistics(data.statistics || null)
        setRunLists(data.runLists || [])
      } else {
        console.error('Error fetching race:', data.error)
      }
    } catch (error) {
      console.error('Error fetching race data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSection />
  }

  if (!race) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Race not found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-4">
          {/* Race Name */}
          <h1 className="text-3xl font-bold">
            {race.name || `${race.track.name} - ${race.raceCars.length} car${race.raceCars.length > 1 ? 's' : ''}`}
          </h1>

          {/* Track Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <Link href={`/tracks/${race.track.slug}`} className="hover:underline">
                {race.track.name}
                {race.track.layout && ` - ${race.track.layout}`}
              </Link>
            </div>
            <Badge>{race.track.category}</Badge>
            {race.track.location && (
              <span>{race.track.location}</span>
            )}
            {race.track.length && (
              <span>{race.track.length}m</span>
            )}
          </div>

          {/* Description */}
          {race.description && (
            <p className="text-muted-foreground">{race.description}</p>
          )}
        </div>
      </div>

      {/* Cars in this race */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Cars ({race.raceCars.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {race.raceCars.map((raceCar) => {
              const car = raceCar.car
              return (
                <Link key={raceCar.id} href={`/cars/${car.slug}`} className="block h-full">
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full min-h-[140px]">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {car.imageUrl && (
                          <img
                            src={car.imageUrl}
                            alt={car.name}
                            className="w-16 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {car.manufacturer} {car.name}
                          </p>
                          {raceCar.build && (
                            <p className="text-sm text-primary font-medium flex items-center gap-1">
                              <Wrench className="h-3.5 w-3.5" />
                              {raceCar.build.name}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {car.year}
                          </p>
                          {car.category && (
                            <Badge variant="secondary" className="mt-1">
                              {car.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Laps</p>
                  <p className="text-2xl font-bold">{statistics.totalLaps}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Drivers</p>
                  <p className="text-2xl font-bold">{statistics.uniqueDrivers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Fastest Lap</p>
                  <p className="text-2xl font-bold">
                    {statistics.fastestTime ? formatLapTime(statistics.fastestTime) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Time</p>
                  <p className="text-2xl font-bold">
                    {statistics.averageTime ? formatLapTime(statistics.averageTime) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>Best times per driver per car per build</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No lap times yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={`${entry.userId}-${entry.carId}-${entry.buildId || 'none'}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-primary">
                    {entry.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.userName}</p>
                    <p className="text-sm text-muted-foreground">{entry.carName}</p>
                    {entry.buildName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {entry.buildName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">{formatLapTime(entry.bestTime)}</p>
                    <p className="text-xs text-muted-foreground">{entry.totalLaps} laps</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Stats */}
      {userStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Your Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="text-2xl font-bold">#{userStats.position || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best</p>
                  <p className="text-2xl font-bold">{formatLapTime(userStats.bestTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average</p>
                  <p className="text-2xl font-bold">{formatLapTime(userStats.averageTime)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Recent Laps</p>
                <div className="space-y-1">
                  {userStats.recentLaps.slice(0, 5).map((lap) => (
                    <div key={lap.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent/50">
                      <div className="flex-1">
                        <span className="font-mono font-bold">{formatLapTime(lap.timeMs)}</span>
                        {lap.build && (
                          <span className="text-muted-foreground ml-2 flex items-center gap-1 text-xs">
                            <Wrench className="h-3 w-3" />
                            {lap.build.name}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(lap.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Lists using this race */}
      {runLists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Used in Run Lists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runLists.map((ref) => (
                <Link
                  key={ref.id}
                  href={`/run-lists/${ref.runList.id}`}
                  className="block"
                >
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{ref.runList.name}</span>
                          {ref.runList.isPublic ? (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {ref.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{ref.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
