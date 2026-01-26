/**
 * Race Detail Page
 *
 * Purpose: Display comprehensive details of a single race
 * - Shows race information (name, track, configuration)
 * - Displays builds participating in the race
 * - Shows leaderboard with top 10 lap times
 * - Displays current user's stats (position, best time, recent laps)
 * - Shows race statistics (fastest lap, average time)
 * - Displays race members with timezone-aware timestamps
 * - Admin can remove members from race
 * - "Add Lap Time" button for quick lap entry
 *
 * **Key Features:**
 * - Race header: Name, track info, configuration badges
 * - Builds card: Grid of builds participating in race
 * - Race members: List with timezone-aware "Last Updated" display
 * - Statistics: Fastest lap, average time (from all participants)
 * - Leaderboard: Top 10 fastest laps with user, car, build info
 * - Your stats: Current user's position, best time, recent laps
 * - Add lap time: Quick link to /lap-times/new
 * - Edit race: Link to /races/[id]/edit
 *
 * **Data Flow:**
 * 1. Page loads → params.id extracted → fetchRaceData() called
 * 2. API call: GET /api/races/[id] → Returns race, leaderboard, userStats, statistics
 * 3. Additional call: GET /api/auth/session → Get current user info
 * 4. Data stored in state → Rendered in components
 * 5. User can click edit → Navigate to /races/[id]/edit
 * 6. User can add lap time → Navigate to /lap-times/new
 *
 * **State Management:**
 * - params: URL params (race ID)
 * - race: Race object with track, RaceCar[], createdBy
 * - leaderboard: Array of top 10 LeaderboardEntry[]
 * - userStats: Current user's stats (position, best time, recent laps)
 * - statistics: Overall race statistics (fastest, average)
 * - loading: Loading state during fetch
 * - currentUser: Current user info (id, role)
 *
 * **Leaderboard Display:**
 * - Top 10: Fastest laps from all participants
 * - Columns: Position (circle badge), User, Car/Build, Time, Laps
 * - Position: Filled circle with primary color and number
 * - User name: Bold text with email fallback
 * - Car: Car manufacturer and name
 * - Build: Build name with Wrench icon (if available)
 * - Time: Formatted as MM:SS.mmm (monospace font)
 * - Laps: Total number of laps submitted
 * - Empty state: "No lap times yet" message
 *
 * **User Stats Display:**
 * - Position: User's ranking in leaderboard (#1, #2, etc.)
 * - Best time: Fastest lap formatted as MM:SS.mmm
 * - Average time: Average of all laps formatted as MM:SS.mmm
 * - Recent laps: Last 5 laps with time, build, date
 * - Add Lap Time button: Link to /lap-times/new
 * - Only shown: If user has submitted laps for this race
 *
 * **Statistics Display:**
 * - Fastest Lap: Best time across all participants
 * - Average Time: Average of all laps across all participants
 * - Data source: statistics from API (aggregated from leaderboard)
 * - Icons: Target (fastest), TrendingUp (average)
 * - Colors: Purple (target), Orange (trending up)
 * - Only shown: If statistics exist
 *
 * **Builds Display:**
 * - Grid: 2-column on mobile, 3-column on desktop
 * - Each build: Car image, name, build name, year, category
 * - Build removed: Shows "Build removed" badge if build deleted
 * - Link: Click to navigate to build detail page
 * - Opacity: 60% if build removed
 * - Hover: gt-hover-card effect
 *
 * **Race Members:**
 * - Component: RaceMemberList
 * - Display: List of users with their builds
 * - Features:
 *   - "Last Updated" column with timezone conversion
 *   - User filter dropdown
 *   - Remove member button (admin only)
 *   - Mobile-responsive design
 * - Props: raceId, isAdmin (boolean)
 *
 * **Race Header:**
 * - Name: race.name or generated from track + builds
 * - Track: MapPin icon, link to track detail, category badge, location
 * - Configuration: Laps badge, Weather badge
 * - Description: Optional text below header
 * - Edit button: Top-right corner
 *
 * **API Integration:**
 * - GET /api/races/[id]: Fetch race details
 *   - Response: { race, leaderboard[], userStats, statistics }
 * - GET /api/auth/session: Fetch current user info
 *   - Response: { user: { id, role } }
 * - Data structure:
 *   - leaderboard: Top 10 fastest laps per user/car/build combination
 *   - userStats: Current user's aggregated stats for this race
 *   - statistics: Overall race statistics (fastest, average)
 *
 * **Access Control:**
 * - Authenticated: User must be logged in
 * - View: Any authenticated user can view race
 * - Edit: Any authenticated user can edit race
 * - Remove members: Only admin can remove members
 *
 * **Page Layout:**
 * - PageWrapper: Standard container with padding
 * - Back button: Navigates to /races
 * - Header: Race name, track info, badges, edit button
 * - Builds: Grid of build cards
 * - Race members: Full-width component with member list
 * - Statistics: 2-column grid (fastest, average)
 * - Leaderboard: Card with top 10 entries
 * - User stats: Card with position, best, average, recent laps
 *
 * **Styling:**
 * - Cards: Bordered with shadow, rounded corners
 * - Buttons: min-h-[44px] for touch targets
 * - Badges: Various variants (default, secondary, outline)
 * - Icons: MapPin (track), Trophy (leaderboard), Award (stats)
 * - Position badges: Circular with primary background
 * - Time display: Monospace font for alignment
 * - Responsive: Mobile-first, stacked on mobile
 *
 * **Navigation:**
 * - Back: /races (from back button)
 * - Edit: /races/[id]/edit (from edit button)
 * - Track: /tracks/[slug] (from track link)
 * - Build: /builds/[id] (from build card)
 * - Add Lap Time: /lap-times/new (from button in user stats)
 *
 * **Error Handling:**
 * - Fetch error: Console log, show "Race not found"
 * - Build removed: Show "Build removed" badge, 60% opacity
 * - No leaderboard: Show "No lap times yet" message
 * - No user stats: Don't show user stats section
 *
 * **Formatting Functions:**
 * - formatLapTime: Convert milliseconds to MM:SS.mmm format
 * - Date formatting: Month day (e.g., "Jan 15")
 *
 * **Timezone Handling:**
 * - Race members display "Last Updated" with timezone conversion
 * - Displayed in user's local timezone
 * - Shows relative time (e.g., "2 hours ago")
 *
 * **Related Files:**
 * - @/app/races/page.tsx: Races listing page
 * - @/app/races/new/page.tsx: Create new race page
 * - @/app/races/[id]/edit/page.tsx: Edit race page
 * - @/components/race-members/race-member-list: Race members component
 * - @/app/api/races/[id]/route.ts: Race details API endpoint
 * - @/lib/time: formatLapTime helper function
 * - @/components/ui: Card, Button, Badge components
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
  Plus,
  Edit,
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper } from '@/components/layout'
import { formatLapTime } from '@/lib/time'
import { RaceMemberList } from '@/components/race-members/race-member-list'

// ============================================================
// TYPES
// ============================================================
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
  laps: number | null
  weather: string | null
  createdAt: string
  updatedAt: string
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
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  RaceCar: RaceCar[]
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
  buildId: string | null
  buildName: string | null
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

export default function RaceDetailPage() {
  // ============================================================
  // STATE
  // ============================================================
  const params = useParams()
  const [race, setRace] = useState<Race | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)

  // ============================================================
  // DATA FETCHING
  // ============================================================
  // Fetch race data and current user on mount
  useEffect(() => {
    fetchRaceData()
    fetchCurrentUser()
  }, [params.id])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setCurrentUser({ id: data.user.id, role: data.user.role })
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchRaceData = async () => {
    try {
      const response = await fetch(`/api/races/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setRace(data.race || null)
        setLeaderboard(data.leaderboard || [])
        setUserStats(data.userStats || null)
        setStatistics(data.statistics || null)
      } else {
        console.error('Error fetching race:', data.error)
      }
    } catch (error) {
      console.error('Error fetching race data:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading race..." />
      </PageWrapper>
    )
  }

  // Show not found message if race doesn't exist
  if (!race) {
    return (
      <PageWrapper>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Race not found</h1>
          <Link href="/races">
            <Button className="min-h-[44px]">Go Back</Button>
          </Link>
        </div>
      </PageWrapper>
    )
  }

  // ============================================================
  // PAGE RENDER
  // ============================================================
  return (
    <PageWrapper>
      {/* Header */}
      {/* - Back button: Navigates to /races */}
      {/* - Race name: race.name or generated from track + builds */}
      {/* - Track info: MapPin icon, link to track, badges */}
      {/* - Edit button: Top-right corner */}
      <div>
        <Link href="/races" className="inline-block mb-4">
          <Button
            variant="ghost"
            className="h-11 px-4 sm:h-9"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="space-y-4">
          {/* Race Name */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">
              {race.name || `${race.track.name} - ${race.RaceCar.length} build${race.RaceCar.length > 1 ? 's' : ''}`}
            </h1>
            <Link href={`/races/${race.id}/edit`} className="shrink-0">
              <Button variant="ghostBordered" size="sm" className="min-h-[44px]">
                <Edit className="h-4 w-4 mr-2" />
                Edit Race
              </Button>
            </Link>
          </div>

          {/* Track Info */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0" />
              <Link href={`/tracks/${race.track.slug}`} className="gt-hover-text-link">
                {race.track.name}
                {race.track.layout && ` - ${race.track.layout}`}
              </Link>
            </div>
            <Badge variant="outline">{race.track.category}</Badge>
            {race.track.location && (
              <span>{race.track.location}</span>
            )}
            {race.track.length && (
              <span>{race.track.length}m</span>
            )}
            {/* Race Configuration Badges */}
            {race.laps && (
              <Badge variant="secondary">{race.laps} laps</Badge>
            )}
            {race.weather && (
              <Badge variant="secondary">{race.weather}</Badge>
            )}
          </div>

          {/* Description */}
          {race.description && (
            <p className="text-muted-foreground">{race.description}</p>
          )}
        </div>
      </div>

      {/* Builds in this race */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Builds ({race.RaceCar.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {race.RaceCar.map((raceCar) => {
              const car = raceCar.car
              return (
                <Link
                  key={raceCar.id}
                  href={raceCar.build ? `/builds/${raceCar.buildId}` : '/builds'}
                  className="block h-full"
                >
                  <Card className={`gt-hover-card h-full min-h-[140px] ${!raceCar.build ? 'opacity-60' : ''}`}>
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
                          {raceCar.build ? (
                            <p className="text-sm text-primary font-medium flex items-center gap-1">
                              <Wrench className="h-3.5 w-3.5" />
                              {raceCar.build.name}
                            </p>
                          ) : (
                            <Badge variant="outline" className="mt-1 text-muted-foreground">
                              Build removed
                            </Badge>
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

      {/* Race Members */}
      <RaceMemberList raceId={race.id} isAdmin={currentUser?.role === 'ADMIN'} />

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Fastest Lap</p>
                  <p className="text-lg sm:text-2xl font-bold font-mono">
                    {statistics.fastestTime ? formatLapTime(statistics.fastestTime) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Avg Time</p>
                  <p className="text-lg sm:text-2xl font-bold font-mono">
                    {statistics.averageTime ? formatLapTime(statistics.averageTime) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Race Leaderboard - Top 10
          </CardTitle>
          <CardDescription>Fastest laps from builds in this race at {race.track.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No lap times yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={`${entry.userId}-${entry.carId}-${entry.buildId || 'none'}`}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 gt-hover-card"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-primary shrink-0">
                    {entry.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">{entry.userName}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{entry.carName}</p>
                    {entry.buildName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        <span className="truncate">{entry.buildName}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-sm sm:text-base">{formatLapTime(entry.bestTime)}</p>
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
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Stats
              </CardTitle>
              <Link href="/lap-times/new">
                <Button size="sm" className="gap-2 w-full sm:w-auto min-h-[44px]">
                  <Plus className="h-4 w-4" />
                  Add Lap Time
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Position</p>
                  <p className="text-xl sm:text-2xl font-bold">#{userStats.position || '-'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Best</p>
                  <p className="text-lg sm:text-2xl font-bold font-mono">{formatLapTime(userStats.bestTime)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average</p>
                  <p className="text-lg sm:text-2xl font-bold font-mono">{formatLapTime(userStats.averageTime)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Recent Laps</p>
                <div className="space-y-1">
                  {userStats.recentLaps.slice(0, 5).map((lap) => (
                    <div key={lap.id} className="flex items-center justify-between text-sm p-2 rounded gt-hover-card">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-bold text-xs sm:text-sm">{formatLapTime(lap.timeMs)}</span>
                        {lap.buildName && (
                          <span className="text-muted-foreground ml-2 flex items-center gap-1 text-xs">
                            <Wrench className="h-3 w-3" />
                            <span className="truncate">{lap.buildName}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {new Date(lap.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </PageWrapper>
  )
}
