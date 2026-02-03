/**
 * Track Lap Times Component
 *
 * Purpose: Display user's lap times for a specific track, grouped by car
 * - Shows lap times grouped by car with personal best calculation
 * - Displays car information with personal best times
 * - Recent laps list with Trophy icons for personal best
 * - Empty state when no laps recorded for this track
 *
 * **Key Features:**
 * - Car-grouped display: Lap times organized by car used
 * - Personal best: Fastest time per car highlighted with Trophy icon
 * - Statistics: Total laps, unique cars driven, fastest time overall
 * - Recent laps: Shows 3 most recent laps per car with Trophy icons
 * - Show more/less: Limit to 3 cars by default, expandable
 * - Navigation: Links to car details, all lap times page
 *
 * **Data Flow:**
 * 1. Mount: Fetch lap times via /api/tracks/${trackSlug}/lap-times?userOnly=true
 * 2. Receive: Grouped by car with personal best + statistics
 * 3. Render: Display statistics grid + car cards OR empty state
 * 4. Navigation: Car cards link to car details
 *
 * **Props:**
 * - trackSlug: URL slug of track (e.g., "fuji-speedway")
 * - trackName: Display name of track (for empty state message)
 *
 * **State:**
 * - lapTimesByCar: Array of grouped lap times by car
 *   - Each element: { car, personalBest, totalLaps, recentLapTimes }
 * - statistics: Statistics object (totalLaps, fastestTime)
 * - loading: API call in progress
 * - showAll: Boolean to show all cars (default: show 3)
 *
 * **API Response Format:**
 * ```json
 * {
 *   "lapTimesByCar": [
 *     {
 *       "car": { "id": "...", "name": "...", "manufacturer": "..." },
 *       "personalBest": 123456 (milliseconds),
 *       "totalLaps": 5,
 *       "recentLapTimes: [
 *         { "id": "...", "timeMs": 123456, "createdAt": "...", ... }
 *       ]
 *     }
 *   ],
 *   "statistics": {
 *     "totalLaps": 10,
 *     "fastestTime": 123456
 *   }
 * }
 * ```
 *
 * **Statistics Display:**
 * - Total Laps: Total lap times across all cars for this track
 * - Cars Driven: Number of unique cars driven (lapTimesByCar.length)
 * - Fastest Time: Fastest time across all cars for this track
 * - Shown: Only if statistics.totalLaps > 0
 *
 * **Empty State:**
 * - Shown: When lapTimesByCar.length === 0
 * - Message: "You haven't recorded any lap times on {trackName} yet"
 * - CTA: "Add Your First Lap" button (links to /lap-times/new)
 *
 * **Car Card Layout:**
 * - Header: Car name + year badge + link to car details
 * - Personal Best: Trophy icon + formatted time (secondary color)
 * - Lap Count: Badge showing total laps for this car on this track
 * - Recent Laps: 3 most recent laps with Trophy icons for personal best
 * - Actions: "View Car Details" button (links to /cars/${car.slug})
 *
 * **Show More/Less Button:**
 * - Shown: When lapTimesByCar.length > 3
 * - Default: Show first 3 cars
 * - Expanded: Show all cars
 * - Button text: "Show {N} More Cars" or "Show Less"
 *
 * **Personal Best Detection:**
 * - Compare lap.timeMs === car.personalBest
 * - Trophy icon: Shows next to personal best times
 * - Highlighting: Secondary color (purple) for visibility
 *
 * **Recent Laps Display:**
 * - Maximum 3 recent laps per car (slice(0, 3))
 * - Time format: formatLapTime(lap.timeMs) → "mm:ss.sss"
 * - Conditions badge: Shows if lap has conditions data
 * - Build name: Shows if lap has buildName (Wrench icon)
 * - Created date: Formatted date (e.g., "Jan 26")
 *
 * **Responsive Design:**
 * - Layout: Stacked on mobile, side-by-side on desktop where applicable
 * - Statistics grid: 2 cols on mobile, 3 cols on desktop
 * - Car cards: Full width on both
 *
 * **Navigation:**
 * - Car name link: /cars/${car.slug} (car details page)
 * - View Car Details: Button links to car page
 * - Add Lap Time: Button links to /lap-times/new
 * - View All Lap Times: Button links to /lap-times
 *
 * **Loading State:**
 * - Skeleton animation: Pulse animation with same layout as content
 * - Height: Matches expected content height (prevents layout shift)
 *
 * **Debugging Tips:**
 * - Lap times not showing: Check /api/tracks/${trackSlug}/lap-times response
 * - Personal best wrong: Verify API calculates correctly (min timeMs)
 * - Cars not linking: Check car.slug is correct in API response
 * - Statistics wrong: Verify statistics.fastestTime is set
 * - Empty state shown: Check lapTimesByCar.length === 0
 * - Show more not working: Check showAll state toggle logic
 *
 * **Common Issues:**
 * - Empty lap times array: No laps recorded for this track yet (expected)
 * - Wrong track: Verify trackSlug prop matches track slug in database
 * - Personal best missing: Check lapTime.buildName exists for Wrench icon
 * - Statistics not calculating: Verify API returns statistics object
 * - Recent laps not showing: Check recentLapTimes array has data
 *
 * **Related Files:**
 * - /api/tracks/[slug]/lap-times/route.ts: Fetch lap times for track grouped by car
 * - /cars/[slug]/page.tsx: Car details page (linked from cards)
 * - /lap-times/new/page.tsx: Add lap time page (linked from buttons)
 * - src/lib/time.ts: formatLapTime, formatDate helpers
 * - src/types/components.ts: LapTimesByCarGroup, TrackLapTimesProps types
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatLapTime } from '@/lib/time'
import { Clock, Trophy, Plus, Car as CarIcon, TrendingDown } from 'lucide-react'
import type {
  ComponentCar,
  ComponentLapTime,
  LapTimesByCarGroup,
  TrackLapTimesProps,
} from '@/types/components'

// ============================================================
// MAIN COMPONENT - TrackLapTimes
// ============================================================
// Display user's lap times for a specific track, grouped by car
// Shows statistics, personal bests, and recent laps
//
// Component Flow:
// 1. Mount: Fetch lap times via /api/tracks/${trackSlug}/lap-times?userOnly=true
// 2. Receive: Grouped by car with personal best + statistics
// 3. Render: Display statistics grid + car cards OR empty state
// 4. Navigation: Car cards link to car details
//
// Why Group By Car?
// - Organizes lap times by the car used
// - Shows personal best per car (highlighted with Trophy icon)
// - Easy comparison: See which car is fastest on this track
//
// Statistics Calculation:
// - Total Laps: Sum of all lapTime.totalLaps across all cars
// - Cars Driven: Number of unique cars (lapTimesByCar.length)
// - Fastest Time: Min of all car personalBest times
//
// Why "Show More" Limit?
// - Default: Show first 3 cars (most recent or most used)
// - Expanded: Show all cars (user can compare all)
// - Performance: Limits rendered items by default
// ============================================================

export function TrackLapTimes({ trackSlug, trackName }: TrackLapTimesProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  // lapTimesByCar: Array of lap times grouped by car
  // statistics: Stats object (totalLaps, fastestTime)
  // loading: API call in progress
  // showAll: Boolean to show all cars (default: false = show 3)

  const [lapTimesByCar, setLapTimesByCar] = useState<LapTimesByCarGroup[]>([])
  const [statistics, setStatistics] = useState<{ totalLaps: number; fastestTime: number | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  // ============================================================
  // DATA FETCHING - Lap Times by Car
  // ============================================================
  // Fetch lap times grouped by car on mount and when trackSlug changes
  //
  // API Call:
  // - Endpoint: /api/tracks/${trackSlug}/lap-times?userOnly=true
  // - Response: { lapTimesByCar: [...], statistics: {...} }
  // - userOnly=true: Only fetch current user's lap times
  //
  // Response Format:
  // - lapTimesByCar: Array of { car, personalBest, totalLaps, recentLapTimes }
  // - personalBest: Fastest lap time for this car on this track (in ms)
  // - recentLapTimes: Array of recent lap times (sorted by date desc)
  // - statistics: { totalLaps, fastestTime }
  //
  // Error Handling:
  // - Try-catch wraps API call
  // - Error logged to console (no user-facing error shown)
  // - Loading state cleared in finally block
  //
  // Debugging Tips:
  // - Empty lap times: Check trackSlug matches database track slug
  // - Statistics missing: Verify API returns statistics object
  // - Wrong groupings: Check API groups by car correctly
  // ============================================================

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

  // ============================================================
  // LOADING STATE - Skeleton
  // ============================================================
  // Pulse animation while fetching lap times
  // Matches layout of actual content (prevents layout shift)
  // ============================================================

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

  // ============================================================
  // EMPTY STATE - No Lap Times Yet
  // ============================================================
  // Shown: When lapTimesByCar.length === 0
  // Message: User hasn't recorded any lap times on this track yet
  // CTA: "Add Your First Lap" button (links to /lap-times/new)
  //
  // Layout:
  // - Header with Clock icon and "YOUR LAP TIMES" title
  // - Centered content with clock icon (muted-foreground/50)
  // - Message with track name
  // - CTA button with Plus icon
  //
  // Why Empty State?
  // - User needs to record lap times first
  // - Helpful message explains what to do
  // - Direct CTA to add lap time
  // ============================================================

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
            You haven&apos;t recorded any lap times on {trackName} yet
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

  // ============================================================
  // DERIVED STATE - Displayed Cars
  // ============================================================
  // Limit displayed cars to 3 by default (showAll = false)
  // Show all cars when user clicks "Show More" button (showAll = true)
  //
  // Why Limit?
  // - Performance: Limit rendered items by default
  // - UI: Avoid overwhelming user with long list
  // - Progressive disclosure: User can expand when needed
  //
  // Toggle:
  // - showAll = false: Show first 3 cars (slice(0, 3))
  // - showAll = true: Show all cars (no slice)
  // ============================================================

  const displayedCars = showAll ? lapTimesByCar : lapTimesByCar.slice(0, 3)

  // ============================================================
  // MAIN RENDER - Statistics + Car Cards
  // ============================================================
  // Layout: Border container with rounded corners
  // - Header: Title + "Add Lap Time" button
  // - Statistics: Grid of 3 cards (total laps, cars driven, fastest time)
  // - Car Cards: Grid of cards (1 col mobile, 1 col desktop) OR empty state
  // - Footer: "View All Your Lap Times" link
  // ============================================================

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      {/* ============================================================
          HEADER - Title + Action Button
          ============================================================
          Left: Clock icon + "YOUR LAP TIMES" title
          Right: "Add Lap Time" button (links to /lap-times/new)

          Why Clock Icon?
          - Indicates time-related content
          - Consistent across all lap time components
          - Primary color (blue) for visibility
      ============================================================ */}

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

      {/* ============================================================
          STATISTICS GRID - Total Laps / Cars / Fastest Time
          ============================================================
          Layout: 3-column grid (2 cols on mobile, 3 cols on desktop)
          Background: Muted/30 for subtle contrast
          Font: Tabular nums for numeric alignment

          Shown: Only if statistics.totalLaps > 0

          Stat Cards:
          - Total Laps: Sum of all lap times across all cars
          - Cars Driven: Number of unique cars (lapTimesByCar.length)
          - Fastest Time: Minimum of all car personal best times

          Fastest Time Format:
          - formatLapTime(statistics.fastestTime) → "mm:ss.sss"
          - N/A if no fastest time (statistics.fastestTime is null)
          - Primary color (blue) for fastest time emphasis
      ============================================================*/}

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

      {/* ============================================================
          PERSONAL BESTS BY CAR - Car Cards
          ============================================================
          Section Header: Trophy icon + "Personal Best Times"
          Layout: Vertical stack of car cards

          Card Content (for each car):
          - Car Info: Manufacturer + name link + year badge (if available)
          - Personal Best: Trophy icon + formatted time (secondary color)
          - Lap Count: Badge showing total laps for this car on this track
          - Recent Laps: 3 most recent laps with Trophy icons for personal best
          - Actions: "View Car Details" button (links to car page)

          Card Layout:
          - Row 1: Car info + Personal Best + Lap Count badge
          - Row 2: Recent laps (stacked) + Actions button

          Car Info:
          - Manufacturer name + Car name (linked to car page)
          - Year badge: Shown if car.year exists
          - Link: /cars/${car.slug}

          Personal Best:
          - Trophy icon (primary color)
          - Formatted time: formatLapTime(personalBest)
          - Secondary color: Purple for differentiation
          - Large font: text-2xl for emphasis

          Recent Laps:
          - Maximum 3 recent laps per car (slice(0, 3))
          - Time format: formatLapTime(lap.timeMs)
          - Trophy icon: Shown if lap.timeMs === personalBest
          - Conditions badge: Shown if lap.conditions exists
          - Build name: Shown with Wrench icon if lap.buildName exists
          - Created date: Formatted date (formatDate)

          Actions:
          - "View Car Details" button (linkGlow variant)
          - Links to /cars/${car.slug}

          Shown: Only if displayedCars.length > 0

          Hidden: If no cars exist (show empty state instead)
      ============================================================*/}

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
                  {/* ============================================================
                      CAR INFO - Name + Year + Link
                      ============================================================
                      Layout: Flex container with gap-2
                      - Car icon (gray color)
                      - Car name + manufacturer link (to car page)
                      - Year badge (if year exists)

                      Car Name Link:
                      - Href: /cars/${car.slug}
                      - Hover: Hover text-primary (blue)
                      - Font: Semibold (600 weight)

                      Year Badge:
                      - Shown: Only if car.year exists
                      - Variant: Outline (gray border)
                      - Text: Car year (number)
                  ============================================================ */}

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

                  {/* ============================================================
                      PERSONAL BEST - Trophy Icon + Time
                      ============================================================
                      Layout: Flex items-center with gap-2
                      - Trophy icon (primary color)
                      - Formatted time (large font, secondary color)
                      - Lap count badge (secondary color)

                      Why Secondary Color?
                      - Differentiates from recent lap times
                      - Emphasizes this is the BEST time for this car
                      - Purple (secondary) stands out from blue theme

                      Why Show Lap Count?
                      - Context: How many laps contributed to this personal best
                      - Verification: User can see if time is from single lap or many laps
                      - Badge: Secondary color to match personal best styling
                  ============================================================*/}

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

                  {/* ============================================================
                      RECENT LAPS - Last 3 Laps Per Car
                      ============================================================
                      Shown: Only if recentLapTimes.length > 0

                      Layout: Vertical stack with space-y-1
                      - "Recent laps:" label (gray text)
                      - Horizontal list of lap times (flex-wrap)

                      Lap Time Entry:
                      - Time: Formatted time (mm:ss.sss format)
                      - Trophy icon: If this lap is personal best
                      - Conditions badge: If lap has conditions data
                      - Build name: With Wrench icon if lap.buildName exists
                      - Created date: Formatted date (e.g., "Jan 26")

                      Why 3 Recent Laps?
                      - Balance: Show enough data to be useful
                      - Performance: Don't overwhelm user with long list
                      - Visual: Stacked format with consistent layout

                      Trophy Icon Logic:
                      - Shown if: lap.timeMs === personalBest
                      - Color: Purple (secondary) to match personal best
                      - Position: Inline (ml-1) next to time

                      Conditions Badge:
                      - Shown if: lap.conditions exists
                      - Variant: Outline (gray border)
                      - Text: Condition name (e.g., "Dry", "Wet")

                      Build Name:
                      - Shown if: lap.buildName exists
                      - Icon: Wrench (purple)
                      - Purpose: Identifies which build/setup was used
                  ============================================================*/}

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

                {/* ============================================================
                    QUICK ACTIONS - View Car Details Button
                    ============================================================
                    Shown: Always (for each car card)

                    Button: "View Car Details"
                    - Variant: linkGlow (glow effect on hover)
                    - Size: sm (small)
                    - Link: /cars/${car.slug}
                    - Icon: None (text only button)

                    Why "View Car Details"?
                    - User can see more details about the car
                    - Navigation: Direct link to car page
                    - Context: User viewing lap times, might want to see car info
                ============================================================*/}

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

        {/* ============================================================
            SHOW MORE/LESS BUTTON - Expand/Collapse Car List
            ============================================================
            Shown: When lapTimesByCar.length > 3
            Purpose: Allow user to see all cars or limit to first 3

            Button Text:
            - showAll = false: "Show {N} More Cars" (e.g., "Show 5 More Cars")
            - showAll = true: "Show Less"

            Why Limit?
            - Performance: Don't render too many cards by default
            - UI: Avoid overwhelming user with long list
            - Progressive disclosure: User can expand when needed

            Toggle:
            - Click: Invert showAll boolean (!showAll)
            - Re-render: displayedCars recalculated based on showAll state
        ============================================================*/}

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

      {/* ============================================================
          FOOTER LINK - View All Lap Times Page
          ============================================================
          Full-width button with icon and text
          Links to: /lap-times (all user's lap times)

          Why Link to All Lap Times?
          - User might want to see lap times on other tracks
          - Quick navigation: One click to all lap times
          - Context: User currently viewing track-specific lap times
          - Icon: TrendingDown (arrow down) indicating more content

          Button:
          - Variant: linkGlow (glow effect on hover)
          - Full width: w-full (takes full width of container)
          - Icon: TrendingDown arrow
          - Text: "View All Your Lap Times"
      ============================================================*/}

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
