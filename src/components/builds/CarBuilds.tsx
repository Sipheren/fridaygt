/**
 * Car Builds Component
 *
 * Purpose: Display all builds for a specific car with statistics
 * - Shows builds filtered by carId
 * - Displays build statistics (total, public, private)
 * - Renders build cards with links to build details
 * - Empty state with "Create First Build" call-to-action
 *
 * **Key Features:**
 * - Car-specific filtering: Only shows builds for carId prop
 * - Build statistics: Total, public, private counts
 * - Build cards: Name, description, visibility, user, date, part/setting counts
 * - Empty state: Friendly message with "Create First Build" button
 * - Loading skeleton: Pulse animation while fetching builds
 *
 * **Data Flow:**
 * 1. Mount: Fetch builds filtered by carId via /api/builds?carId=${carId}
 * 2. Calculate: Compute statistics (total, public, private) in single pass
 * 3. Render: Display stats grid + build cards or empty state
 * 4. Navigation: Click build card → navigate to /builds/[id]
 * 5. Create button: Navigate to /builds/new?carId=${carId}
 *
 * **Props:**
 * - carId: UUID of car to filter builds by
 * - carName: Name of car (for empty state message)
 *
 * **State:**
 * - builds: Array of ComponentBuild objects
 * - statistics: BuildStatistics object (totalBuilds, publicBuilds, privateBuilds)
 * - loading: API call in progress
 *
 * **Statistics Calculation:**
 * - Optimized: Single pass through builds array
 * - Counts: Total builds, public builds (isPublic=true), private builds (isPublic=false)
 * - Display: Grid of 3 stat cards (2 cols on mobile, 3 cols on desktop)
 *
 * **Build Card Layout:**
 * - Header: Name (linked) + visibility badge (Public/Private)
 * - Description: Truncated to 2 lines (line-clamp-2)
 * - Metadata: User name/email + created date
 * - Counts: Parts (upgrades) + Settings badges
 *
 * **Empty State:**
 * - Icon: Large wrench icon (muted-foreground/50)
 * - Message: "NO BUILDS YET" + car name
 * - CTA: "Create First Build" button (pre-fills carId)
 *
 * **Loading State:**
 * - Skeleton: Pulse animation with same layout as content
 * - Height: Matches expected content height (prevents layout shift)
 *
 * **Debugging Tips:**
 * - Builds not showing: Check /api/builds?carId=${carId} response
 * - Statistics wrong: Verify builds array has isPublic field
 * - Navigation broken: Check router.push paths are correct
 * - User display wrong: Verify build.user.name or build.user.email exists
 * - Part counts missing: Check build._count.upgrades and build._count.settings
 *
 * **Common Issues:**
 * - Empty builds array: Car has no builds yet (expected, show empty state)
 * - Wrong builds shown: Verify carId prop matches expected car UUID
 * - Navigation not working: Check Next.js Link component usage
 * - Statistics not calculating: Verify buildsData.length > 0 before calculation
 *
 * **Related Files:**
 * - /api/builds/route.ts: Fetch builds with carId filter
 * - /builds/[id]/page.tsx: Build detail page (linked from cards)
 * - /builds/new/page.tsx: Create build page (pre-fills carId)
 * - src/lib/time.ts: formatDate helper function
 * - src/types/components.ts: ComponentBuild, BuildStatistics types
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Plus, Globe, Lock, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/time'
import type {
  ComponentBuild,
  BuildStatistics,
} from '@/types/components'

// ============================================================
// PROPS
// ============================================================

interface CarBuildsProps {
  carId: string  // UUID of car to filter builds by
  carName: string  // Name of car for empty state message
}

// ============================================================
// MAIN COMPONENT - CarBuilds
// ============================================================
// Fetch and display builds for a specific car
// Shows statistics, build cards, or empty state
//
// Component Flow:
// 1. Mount: Fetch builds via /api/builds?carId=${carId}
// 2. Calculate: Compute statistics in single pass
// 3. Render: Show stats + build cards OR empty state
// 4. Navigate: User clicks build card OR create button
//
// Statistics Calculation:
// - Single pass through builds array (optimized)
// - Count: totalBuilds, publicBuilds (isPublic=true), privateBuilds (isPublic=false)
//
// Render Conditions:
// - Loading: Show skeleton pulse animation
// - No builds: Show empty state with create button
// - Has builds: Show stats grid + build cards grid
// ============================================================

export function CarBuilds({ carId, carName }: CarBuildsProps) {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  // builds: Array of builds for this car
  // statistics: Computed stats (total, public, private)
  // loading: API call in progress

  const [builds, setBuilds] = useState<ComponentBuild[]>([])
  const [statistics, setStatistics] = useState<BuildStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ============================================================
  // DATA FETCHING - Builds by Car
  // ============================================================
  // Fetch builds filtered by carId on mount and when carId changes
  // Calculate statistics in single pass through array
  //
  // API Call:
  // - Endpoint: /api/builds?carId=${carId}
  // - Response: { builds: ComponentBuild[] }
  // - Filter: Only builds where build.carId === carId
  //
  // Statistics Calculation:
  // - Optimized: Single for loop (no multiple array iterations)
  // - Increment: publicCount if isPublic, else privateCount
  // - Set state: After loop completes
  //
  // Debugging Tips:
  // - Builds empty: Check carId matches database car UUID
  // - Statistics wrong: Verify isPublic field exists on builds
  // - Error in console: Check /api/builds endpoint is working
  // ============================================================

  useEffect(() => {
    fetchBuilds()
  }, [carId])

  const fetchBuilds = async () => {
    try {
      const response = await fetch(`/api/builds?carId=${carId}`)
      const data = await response.json()

      const buildsData = data.builds || []
      setBuilds(buildsData)

      // Calculate statistics (optimized: single pass through array)
      // Why single pass? Avoids multiple iterations (filter, length, etc.)
      let publicCount = 0
      let privateCount = 0
      for (const build of buildsData) {
        if (build.isPublic) {
          publicCount++
        } else {
          privateCount++
        }
      }

      const stats = {
        totalBuilds: buildsData.length,
        publicBuilds: publicCount,
        privateBuilds: privateCount,
      }
      setStatistics(stats)
    } catch (error) {
      console.error('Error fetching builds:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // LOADING STATE - Skeleton
  // ============================================================
  // Pulse animation while fetching builds
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
  // MAIN RENDER - Statistics + Build Grid
  // ============================================================
  // Layout: Border container with rounded corners
  // - Header: Title + count badge + action buttons
  // - Stats: Grid of 3 cards (total, public, private)
  // - Builds: Grid of cards (1 col mobile, 2 cols desktop) OR empty state
  // ============================================================

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      {/* ============================================================
          HEADER - Title + Actions
          ============================================================
          Left: Wrench icon + "BUILDS FOR THIS CAR" + count badge
          Right: "Create Build" + "View All Builds" buttons

          Count Badge:
          - Only shown if statistics.totalBuilds > 0
          - Singular/plural: "1 BUILD" vs "5 BUILDS"

          Create Build Button:
          - Navigates to: /builds/new?carId=${carId}
          - Pre-fills: Car selection in build form

          View All Builds Button:
          - Navigates to: /builds (all builds, not filtered)
      ============================================================ */}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">
            BUILDS FOR THIS CAR
            {statistics && statistics.totalBuilds > 0 && (
              <Badge variant="outline" className="ml-2 text-primary border-primary/30">
                {statistics.totalBuilds} {statistics.totalBuilds === 1 ? 'BUILD' : 'BUILDS'}
              </Badge>
            )}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/builds/new?carId=${carId}`)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Build
          </Button>
          <Button
            onClick={() => router.push('/builds')}
            size="sm"
            variant="outline"
            className="gt-hover-link-btn"
          >
            View All Builds
          </Button>
        </div>
      </div>

      {/* ============================================================
          STATISTICS GRID - Total / Public / Private
          ============================================================
          Layout: 3-column grid (2 cols on mobile, 3 cols on desktop)
          Background: Muted/30 for subtle contrast
          Font: Tabular nums for numeric alignment

          Shown: Only if statistics.totalBuilds > 0
          Hidden: If no builds exist (show empty state instead)
      ============================================================ */}

      {statistics && statistics.totalBuilds > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Total Builds</p>
            <p className="text-2xl font-bold tabular-nums">{statistics.totalBuilds}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Public</p>
            <p className="text-2xl font-bold tabular-nums text-primary">{statistics.publicBuilds}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Private</p>
            <p className="text-2xl font-bold tabular-nums">{statistics.privateBuilds}</p>
          </div>
        </div>
      )}

      {/* ============================================================
          EMPTY STATE - No Builds Yet
          ============================================================
          Icon: Large wrench icon (muted-foreground/50)
          Message: "NO BUILDS YET" + car name
          CTA: "Create First Build" button (pre-fills carId)

          Shown: Only if builds.length === 0
          Hidden: If builds exist (show build grid instead)
      ============================================================ */}

      {builds.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <Wrench className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">NO BUILDS YET</p>
            <p className="text-sm text-muted-foreground">
              No builds have been created for the {carName} yet.
            </p>
          </div>
          <Button
            onClick={() => router.push(`/builds/new?carId=${carId}`)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create First Build
          </Button>
        </div>
      )}

      {/* ============================================================
          BUILDS GRID - Build Cards
          ============================================================
          Layout: Grid (1 col mobile, 2 cols desktop)
          Card: Linked to /builds/[id] (Next.js Link component)
          Hover: gt-hover-card + heading color change

          Card Content:
          - Header: Name + visibility badge (Public/Private)
          - Description: Truncated to 2 lines (line-clamp-2)
          - Metadata: User name/email + created date
          - Counts: Parts + Settings badges (if > 0)

          Visibility Badge:
          - Public: Globe icon + default variant (primary color)
          - Private: Lock icon + outline variant (gray)

          User Display:
          - Priority: build.user.name (gamertag)
          - Fallback: build.user.email split by @ (username)
          - Pattern: email.split('@')[0] (username@example.com → username)

          Part/Setting Counts:
          - From build._count.upgrades (relation count)
          - From build._count.settings (relation count)
          - Singular/plural: "1 Part" vs "5 Parts"

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

              {/* Part/Setting Counts */}
              {build._count && (
                <div className="flex gap-2">
                  {build._count.upgrades > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {build._count.upgrades} {build._count.upgrades === 1 ? 'Part' : 'Parts'}
                    </Badge>
                  )}
                  {build._count.settings > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {build._count.settings} {build._count.settings === 1 ? 'Setting' : 'Settings'}
                    </Badge>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
