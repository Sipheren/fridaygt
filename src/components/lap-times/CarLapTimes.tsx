/**
 * Car Lap Times Component
 *
 * Purpose: Display all lap times for a specific car, grouped by track
 * - Shows user's lap times organized by track
 * - Displays personal best for each track
 * - Shows statistics (total laps, tracks driven, fastest time)
 * - Build association (wrench icon) for each lap
 * - Conditions tracking (weather, tire type)
 *
 * **Key Features:**
 * - Track grouping: Lap times organized by track with personal best
 * - Statistics display: Total laps, unique tracks, fastest time across all tracks
 * - Build association: Shows build name (Wrench icon) if buildId exists on lap time
 * - Conditions display: Weather and tire conditions for each lap
 * - Trophy icon: Indicates personal best lap time for that track
 * - Recent laps: Shows most recent laps for each track
 * - Empty state: Helpful message when no lap times recorded
 * - Navigation links: Add lap time, view all lap times, track detail pages
 *
 * **Data Flow:**
 * 1. On mount: Fetch lap times from `/api/cars/[carSlug]/lap-times?userOnly=true`
 * 2. API returns: { lapTimesByTrack: TrackLapData[], statistics: LapTimeStatistics }
 * 3. TrackLapData: { track: ComponentTrack, personalBest: number, totalLaps: number, recentLapTimes: ComponentLapTime[] }
 * 4. Statistics: { totalLaps: number, fastestTime: number | null }
 * 5. Display: Group lap times by track with personal best and recent laps
 *
 * **State Management:**
 * - lapTimesByTrack: Array of TrackLapData objects (grouped by track)
 * - statistics: Lap time statistics (total laps, tracks driven, fastest time)
 * - loading: Loading state for skeleton display
 *
 * **API Integration:**
 * - Fetch: GET `/api/cars/[carSlug]/lap-times?userOnly=true`
 * - Query param: userOnly=true filters to current user's lap times
 * - Response: Grouped and aggregated lap time data by track
 * - Error handling: Console error on fetch failure
 *
 * **Display Logic:**
 * - Statistics: Shows when totalLaps > 0 (total laps, tracks driven, fastest time)
 * - Track grouping: Each track shows personal best, total laps, and recent laps
 * - Recent laps: Shows most recent lap times with build, conditions, and date
 * - Trophy icon: Displayed next to personal best lap time
 * - Wrench icon: Displayed when buildId exists on lap time
 * - Empty state: Shows when no lap times recorded for this car
 *
 * **Personal Best Calculation:**
 * - Per-track: API calculates personal best for each track
 * - Trophy icon: Indicates lap time is personal best for that track
 * - Display: Shown in track header and next to individual lap times
 *
 * **Build Association:**
 * - Build name: Shown with Wrench icon if buildId exists
 * - Source: Populated by API from Build table via buildId foreign key
 * - Purpose: Shows which build was used for the lap time
 *
 * **Conditions Display:**
 * - Conditions badge: Shows weather/tire conditions (e.g., "Dry", "Wet", "Soft Tires")
 * - Optional: Only displayed if conditions field is not null
 *
 * **Statistics Display:**
 * - Total Laps: Count of all lap times for this car
 * - Tracks Driven: Number of unique tracks with lap times
 * - Fastest Time: Best lap time across all tracks (format: mm:ss.sss)
 * - Format: Large, tabular numbers for readability
 *
 * **Navigation:**
 * - Add Lap Time: Navigate to /lap-times/new (with preselected car)
 * - View All Lap Times: Navigate to /lap-times (all cars, all tracks)
 * - Track Detail: Navigate to /tracks/[trackSlug] (click track name)
 *
 * **Responsive Design:**
 * - Statistics grid: 2 columns on mobile, 3 columns on desktop
 * - Flex wrap: Header buttons wrap on smaller screens
 * - Track cards: Maintain readability on all screen sizes
 *
 * **Error Handling:**
 * - Fetch error: Console error, shows empty state
 * - Missing statistics: Gracefully handles null statistics
 * - Missing lap times: Shows empty state with helpful message
 *
 * **Empty State:**
 * - Trigger: lapTimesByTrack.length === 0
 * - Display: Large Clock icon, "NO LAP TIMES YET" message
 * - Call to action: "Record Your First Lap" button
 *
 * **Loading State:**
 * - Skeleton: Shows pulsing placeholder while loading
 * - Maintains layout: Prevents layout shift when data loads
 *
 * **Debugging Tips:**
 * - Fetches from /api/cars/[carSlug]/lap-times?userOnly=true
 * - Groups lap times by track with personal best calculation
 * - Trophy icon indicates personal best lap time for that track
 * - Shows build name (Wrench icon) if buildId exists on lap time
 * - Statistics: total laps, unique tracks, fastest time across all tracks
 * - Check API response if lap times not grouping by track correctly
 * - Verify userOnly query param is set correctly
 * - Build name not showing: Check buildId foreign key relationship
 * - Conditions not showing: Check conditions field is not null in database
 *
 * **Common Issues:**
 * - Lap times not showing: Verify carSlug matches car in database
 * - Statistics not calculating: Check API aggregation logic
 * - Build name missing: Verify buildId foreign key relationship exists
 * - Trophy icon not showing: Check personalBest calculation in API
 * - Empty state not showing: Check lapTimesByTrack array length
 *
 * **Related Files:**
 * - @/components/lap-times/LapTimeForm.tsx: Form for adding lap times
 * - @/components/lap-times/TrackLapTimes.tsx: Track-specific lap times component
 * - @/lib/time.ts: formatLapTime(), formatDate() utilities
 * - @/types/components.ts: ComponentLapTime, ComponentTrack, TrackLapData, LapTimeStatistics types
 * - @/app/api/cars/[carSlug]/lap-times/route.ts: API endpoint for fetching lap times
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
  // ============================================================
  // STATE
  // ============================================================
  // - lapTimesByTrack: Grouped lap time data by track
  // - statistics: Aggregate statistics (total laps, tracks, fastest)
  // - loading: Loading state for skeleton display
  // ============================================================

  const [lapTimesByTrack, setLapTimesByTrack] = useState<TrackLapData[]>([])
  const [statistics, setStatistics] = useState<LapTimeStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ============================================================
  // DATA FETCHING
  // ============================================================
  // Fetch lap times on mount when carSlug changes
  // API returns grouped and aggregated data by track
  //
  // Why userOnly=true?
  // - Filter to current user's lap times (session-based)
  // - Prevents showing other users' lap times on car page
  // - More relevant: User wants to see their own performance
  //
  // Data Structure:
  // - lapTimesByTrack: Array of TrackLapData objects
  // - TrackLapData: { track, personalBest, totalLaps, recentLapTimes }
  // - statistics: { totalLaps, fastestTime }
  //
  // Debugging Tips:
  // - Lap times not loading: Check carSlug is correct
  // - Wrong lap times showing: Verify userOnly query param
  // - Statistics not showing: Check API aggregation logic
  // - Build names missing: Verify buildId foreign key relationship
  // ============================================================

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

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Skeleton placeholder while fetching data
  // - Maintains layout to prevent shift when data loads
  // - Pulsing animation indicates loading
  // ============================================================

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

  // ============================================================
  // HEADER SECTION
  // ============================================================
  // Title with lap count badge, navigation buttons
  // - Clock icon: Visual indicator for lap times section
  // - Badge: Shows total lap count (e.g., "42 LAPS")
  // - Add Lap Time: Navigate to lap time creation form
  // - View All Lap Times: Navigate to all lap times page
  // ============================================================

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

      {/* ============================================================
          STATISTICS SECTION
          ============================================================
          Displays aggregate statistics for all lap times:
          - Total Laps: Total number of lap times recorded
          - Tracks Driven: Number of unique tracks with lap times
          - Fastest Time: Best lap time across all tracks
          - Only shown when totalLaps > 0 (hide for empty state)
          - Grid layout: 2 columns mobile, 3 columns desktop
          ============================================================ */}
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

      {/* ============================================================
          EMPTY STATE
          ============================================================
          Shows when no lap times recorded for this car
          - Large Clock icon for visual interest
          - Clear message: "NO LAP TIMES YET"
          - Personalized: Mentions car name
          - Call to action: "Record Your First Lap" button
          ============================================================ */}
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

      {/* ============================================================
          LAP TIMES BY TRACK
          ============================================================
          Groups lap times by track with personal best and recent laps
          - Each track shown in separate card
          - Track header: Name, location, personal best, lap count
          - Recent laps: Most recent lap times for that track
          - Trophy icon: Indicates personal best lap time
          - Wrench icon: Shows build used for lap time
          - Conditions badge: Shows weather/tire conditions
          - Date: Shows when lap time was recorded
          ============================================================ */}
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
                  {/* Track name as link to track detail page */}
                  <Link
                    href={`/tracks/${trackData.track.slug}`}
                    className="text-lg font-bold hover:text-secondary gt-hover-heading"
                  >
                    {trackData.track.name}
                  </Link>
                  {/* Track location with MapPin icon */}
                  {trackData.track.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="font-mono">{trackData.track.location}</span>
                    </div>
                  )}
                </div>
                {/* Personal best and lap count */}
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
                        {/* Lap time with trophy icon for personal best */}
                        <div className="flex items-center gap-2">
                          {lapTime.timeMs === trackData.personalBest && (
                            <Trophy className="h-3 w-3 text-secondary" />
                          )}
                          <span className="font-mono font-bold">
                            {formatLapTime(lapTime.timeMs)}
                          </span>
                        </div>
                        {/* Lap metadata: build, conditions, date */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {/* Build name with Wrench icon */}
                          {lapTime.buildName && (
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span>{lapTime.buildName}</span>
                            </span>
                          )}
                          {/* Conditions badge */}
                          {lapTime.conditions && (
                            <Badge variant="outline" className="text-xs">
                              {lapTime.conditions}
                            </Badge>
                          )}
                          {/* Date formatted as "Jan 26" */}
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
