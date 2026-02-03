/**
 * Track Builds Component
 *
 * Purpose: Display builds used on a specific track with lap statistics
 * - Shows builds that have lap times recorded for this track
 * - Displays build cards with track-specific stats (laps, best time)
 * - Derived from lap times, not direct build-track relationship
 * - Empty state when no laps recorded for this track
 *
 * **Key Features:**
 * - Lap-derived data: Builds extracted from lap times for this track
 * - Track statistics: Laps count + best time per build
 * - Build enrichment: Car info + build details attached
 * - Batch fetching: Single API call for all builds (comma-separated IDs)
 * - Empty state: Friendly message when no laps recorded
 *
 * **Data Flow:**
 * 1. Mount: Fetch lap times for track via /api/tracks/${trackId}/lap-times
 * 2. Extract: Unique buildIds from lap times + calculate stats (lap count, best time)
 * 3. Batch fetch: Builds via /api/builds?ids=${buildIds}
 * 4. Enrich: Attach stats to each build (build.stats = { lapCount, bestTime })
 * 5. Render: Display build cards with track-specific stats
 *
 * **Props:**
 * - trackId: UUID of track to filter lap times by
 * - trackName: Name of track (for empty state message)
 *
 * **State:**
 * - builds: Array of BuildWithCarStats objects (enriched with track stats)
 * - loading: API call in progress
 *
 * **Track Stats Calculation:**
 * - lapCount: Number of lap times for this build on this track
 * - bestTime: Fastest lap time (in milliseconds) for this build on this track
 * - Null if no lap times exist (shouldn't happen due to filtering)
 *
 * **Batch Fetching Strategy:**
 * - Extract buildIds: Set<string> from lap times (deduplicated)
 * - Join: Array.from(buildIds).join(',')
 * - Single request: /api/builds?ids=id1,id2,id3 (faster than N requests)
 * - Enrichment: Attach stats from Map<buildId, stats> to each build
 *
 * **Build Card Layout:**
 * - Header: Build name + car name + visibility badge
 * - Description: Truncated to 2 lines (line-clamp-2)
 * - Track stats: Laps count + best time (highlighted with Trophy icon)
 * - Metadata: User name/email + created date
 *
 * **Empty State:**
 * - Shown: When no lap times exist for this track (buildIds.size === 0)
 * - Message: "NO BUILDS USED YET" + track name
 * - No CTA: User needs to record lap times first
 *
 * **Debugging Tips:**
 * - Builds not showing: Check /api/tracks/${trackId}/lap-times response
 * - Stats missing: Verify buildStats Map has data for each buildId
 * - Best time null: Check lapTime.timeMs is not null/undefined
 * - Batch fetch failing: Check buildIds CSV format is correct
 * - Enrichment broken: Verify build.id matches Map key
 *
 * **Common Issues:**
 * - Empty builds array: No laps recorded for this track yet (expected)
 * - Wrong builds shown: Verify trackId prop matches expected track UUID
 * - Stats not attaching: Check buildStats.get(build.id) returns stats object
 * - Duplicate builds: Shouldn't happen due to Set deduplication
 *
 * **Related Files:**
 * - /api/tracks/[id]/lap-times/route.ts: Fetch lap times for track
 * - /api/builds/route.ts: Batch fetch builds by comma-separated IDs
 * - /builds/[id]/page.tsx: Build detail page (linked from cards)
 * - src/lib/time.ts: formatLapTime helper (ms → "mm:ss.sss" format)
 * - src/types/components.ts: BuildWithCarStats, TrackBuildsProps types
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Globe, Lock, User, Calendar, Trophy } from 'lucide-react'
import Link from 'next/link'
import { formatLapTime, formatDate } from '@/lib/time'
import type { BuildWithCarStats, TrackBuildsProps } from '@/types/components'

// ============================================================
// MAIN COMPONENT - TrackBuilds
// ============================================================
// Fetch and display builds used on a specific track
// Shows track-specific stats (laps, best time)
//
// Component Flow:
// 1. Mount: Fetch lap times for track via /api/tracks/${trackId}/lap-times
// 2. Extract: Unique buildIds from lap times + calculate stats
// 3. Batch fetch: Builds via /api/builds?ids=${buildIdsCSV}
// 4. Enrich: Attach stats to each build
// 5. Render: Display build cards with track stats OR empty state
//
// Why Lap Times?
// - Builds are not directly linked to tracks
// - Build-track relationship derived from lap times
// - Shows which builds have been used on this track
//
// Stats Calculation:
// - Single pass through lap times array
// - Track lap count and best time per build
// - Store in Map for O(1) lookup during enrichment
// ============================================================

export function TrackBuilds({ trackId, trackName }: TrackBuildsProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  // builds: Array of builds enriched with track stats
  // loading: API call in progress

  const [builds, setBuilds] = useState<BuildWithCarStats[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ============================================================
  // DATA FETCHING - Lap Times + Batch Builds
  // ============================================================
  // Fetch lap times for track, extract buildIds, batch fetch builds
  // Calculate track stats (lap count, best time) during extraction
  //
  // Step 1: Fetch Lap Times
  // - Endpoint: /api/tracks/${trackId}/lap-times
  // - Response: { lapTimes: LapTime[] }
  // - Filter: Only lap times where lapTime.trackId === trackId
  //
  // Step 2: Extract BuildIds + Calculate Stats
  // - Use Set for deduplication (same build used multiple times)
  // - Map<buildId, { lapCount, bestTime }> for stats tracking
  // - Single pass: Increment lapCount, update bestTime if faster
  //
  // Step 3: Batch Fetch Builds
  // - Convert Set to CSV: Array.from(buildIds).join(',')
  // - Endpoint: /api/builds?ids=${idsParam}
  // - Response: { builds: Build[] }
  // - Filter out errors: build.data && !build.error
  //
  // Step 4: Enrich Builds
  // - Attach stats: { ...build, stats: buildStats.get(build.id) }
  // - Stats object: { lapCount: number, bestTime: number | null }
  //
  // Debugging Tips:
  // - Empty builds: Check /api/tracks/${trackId}/lap-times has data
  // - Stats missing: Verify buildStats Map is populated
  // - Best time null: Check lapTime.timeMs values
  // - Batch fetch failing: Check IDs CSV format (no spaces, commas only)
  // ============================================================

  useEffect(() => {
    fetchBuilds()
  }, [trackId])

  const fetchBuilds = async () => {
    try {
      // ============================================================
      // STEP 1: Fetch lap times for this track
      // ============================================================
      const lapTimesResponse = await fetch(`/api/tracks/${trackId}/lap-times`)
      const lapTimesData = await lapTimesResponse.json()

      // ============================================================
      // STEP 2: Extract unique buildIds + calculate stats
      // ============================================================
      // Use Set to avoid duplicate buildIds (same build used multiple times)
      // Use Map to track stats per build (lapCount, bestTime)
      const buildIds = new Set<string>()
      const buildStats = new Map<string, { lapCount: number; bestTime: number | null }>()

      if (lapTimesData.lapTimes) {
        lapTimesData.lapTimes.forEach((lapTime: { id: string; buildId?: string; timeMs: number }) => {
          if (lapTime.buildId) {
            buildIds.add(lapTime.buildId)

            // Get current stats or initialize
            const current = buildStats.get(lapTime.buildId) || { lapCount: 0, bestTime: null }

            // Increment lap count
            current.lapCount++

            // Update best time if this lap is faster
            if (!current.bestTime || lapTime.timeMs < current.bestTime) {
              current.bestTime = lapTime.timeMs
            }

            buildStats.set(lapTime.buildId, current)
          }
        })
      }

      // ============================================================
      // STEP 3: Batch fetch build details
      // ============================================================
      // Early return if no builds used on this track yet
      if (buildIds.size === 0) {
        setLoading(false)
        return
      }

      // Convert Set to CSV for batch API call
      const idsParam = Array.from(buildIds).join(',')
      const buildsResponse = await fetch(`/api/builds?ids=${idsParam}`)
      const buildsData = await buildsResponse.json()

      // ============================================================
      // STEP 4: Enrich builds with track stats
      // ============================================================
      const enrichedBuilds = buildsData.builds
        .filter((data: { id?: string; error?: string } | null) => data && !data.error)
        .map((data: { id: string }) => ({
          ...data,
          stats: buildStats.get(data.id)
        }))

      setBuilds(enrichedBuilds)
    } catch (error) {
      console.error('Error fetching builds:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // LOADING STATE - Skeleton
  // ============================================================
  // Pulse animation while fetching lap times and builds
  // Matches layout of actual content (prevents layout shift)
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
  // MAIN RENDER - Build Grid with Track Stats
  // ============================================================
  // Layout: Border container with rounded corners
  // - Header: Title + count badge + "View All Builds" button
  // - Builds: Grid of cards (1 col mobile, 2 cols desktop) OR empty state
  // ============================================================

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      {/* ============================================================
          HEADER - Title + Action Button
          ============================================================
          Left: Wrench icon + "BUILDS USED ON THIS TRACK" + count badge
          Right: "View All Builds" button

          Count Badge:
          - Always shown (builds.length)
          - Singular/plural: "1 BUILD" vs "5 BUILDS"

          View All Builds Button:
          - Navigates to: /builds (all builds, not filtered)
      ============================================================ */}

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
          className="gt-hover-link-btn"
        >
          View All Builds
        </Button>
      </div>

      {/* ============================================================
          EMPTY STATE - No Builds Used Yet
          ============================================================
          Icon: Large wrench icon (muted-foreground/50)
          Message: "NO BUILDS USED YET" + track name
          No CTA: User needs to record lap times first

          Shown: Only if builds.length === 0
          Hidden: If builds exist (show build grid instead)
      ============================================================ */}

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

      {/* ============================================================
          BUILDS GRID - Build Cards with Track Stats
          ============================================================
          Layout: Grid (1 col mobile, 2 cols desktop)
          Card: Linked to /builds/[id] (Next.js Link component)
          Hover: gt-hover-card + heading color change

          Card Content:
          - Header: Build name + car name + visibility badge
          - Description: Truncated to 2 lines (line-clamp-2)
          - Track Stats: Laps count + best time (highlighted)
          - Metadata: User name/email + created date

          Track Stats Panel:
          - Background: Muted/30 for contrast
          - Laps: Total laps recorded with this build on this track
          - Best Time: Fastest lap (Trophy icon + secondary color)
          - Format: "mm:ss.sss" via formatLapTime helper

          Car Display:
          - Format: "{manufacturer} {name}" (e.g., "Porsche 911 GT3")
          - From: build.car object (fetched via /api/builds?ids=...)

          Visibility Badge:
          - Public: Globe icon + default variant (primary color)
          - Private: Lock icon + outline variant (gray)

          User Display:
          - Priority: build.user.name (gamertag)
          - Fallback: build.user.email split by @ (username)
          - Pattern: email.split('@')[0] (username@example.com → username)

          Shown: Only if builds.length > 0
          Hidden: If no builds (show empty state instead)
      ============================================================ */}

      {builds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builds.map((build) => (
            <Link
              key={build.id}
              href={`/builds/${build.id}`}
              className="border border-border rounded-lg p-4 space-y-3 gt-hover-card group"
            >
              {/* Build Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-bold group-hover:text-primary gt-hover-heading">
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

              {/* Track Stats Panel */}
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

              {/* Build Metadata */}
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
