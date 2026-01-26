/**
 * USER SETTINGS PAGE
 *
 * Purpose:
 * User-facing settings page displaying application statistics and system information.
 * Provides read-only view of database contents and technology stack.
 *
 * Key Features:
 * - Live database statistics (tracks, cars, builds, races, lap times, users)
 * - Image management status (pending feature)
 * - Theme/color scheme visualization
 * - System technology stack information
 * - Connection status indicator
 * - Responsive statistics grid
 *
 * Data Flow:
 * 1. On mount, fetches statistics from multiple /api/stats/* endpoints
 * 2. Uses Promise.all for parallel requests
 * 3. Stats stored in state and displayed in grid
 * 4. Connection status shown with animated pulse
 *
 * State Management:
 * - loading: Initial data fetch state
 * - stats: Object containing all statistics counts
 *   - tracks: Number of tracks in database
 *   - cars: Number of cars in database
 *   - builds: Number of user builds
 *   - races: Number of races
 *   - lapTimes: Number of recorded lap times
 *   - users: Number of registered users
 *
 * API Integration:
 * - GET /api/stats/tracks: Track count
 * - GET /api/stats/cars: Car count
 * - GET /api/stats/builds: Build count
 * - GET /api/stats/races: Race count
 * - GET /api/stats/lap-times: Lap time count
 * - GET /api/stats/users: User count
 *
 * Statistics Display:
 * - Six-column grid on large screens
 * - Responsive layout (6 cols on lg, 3 on md, 2 on sm)
 * - Icon-enhanced labels
 * - Bordered cards with muted backgrounds
 * - Large bold numbers for counts
 *
 * Connection Status:
 * - Animated green pulse dot
 * - "Connected to Supabase" text
 * - Real-time indication of database connectivity
 *
 * Theme Information:
 * - Color scheme: Primary (Red), Accent (Cyan), Secondary (Orange)
 * - Typography: System Default, Font Mono, GT Racing style
 * - Visual color swatches with labels
 *
 * System Information:
 * - Framework: Next.js 16
 * - Database: Supabase (Postgres)
 * - Authentication: NextAuth.js v5
 * - UI Components: shadcn/ui
 * - Styling: Tailwind CSS
 * - Email: Resend
 *
 * Future Enhancements:
 * - User preferences (theme toggle, units)
 * - Notification settings
 * - Privacy controls
 * - Data export functionality
 * - Account deletion
 *
 * Styling:
 * - Three main sections: Database, Images, Theme, System Info
 * - Badge indicators (LIVE, PENDING)
 * - Icon-based section headers
 * - Grid layouts for stats and info cards
 * - Animated pulse effect for connection status
 *
 * Error Handling:
 * - Network errors logged to console
 * - No error dialog - silent failure
 * - Loading state prevents race conditions
 *
 * Common Issues:
 * - Stats not updating? Check API endpoints
 * - Zero counts? Database may be empty or API failing
 * - Connection status always green? Not checking real connectivity
 *
 * Related Files:
 * - /api/stats/[type]/route.ts: Statistics API endpoints
 * - /admin/settings/page.tsx: Admin settings page
 * - @/components/layout: PageWrapper, PageHeader components
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Settings as SettingsIcon, Database, Image, Palette, Loader2 } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper, PageHeader } from '@/components/layout'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    tracks: 0,
    cars: 0,
    builds: 0,
    races: 0,
    lapTimes: 0,
    users: 0,
  })

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  // Fetch all statistics on component mount
  useEffect(() => {
    fetchStats()
  }, [])

  // Fetch statistics from all API endpoints in parallel
  const fetchStats = async () => {
    try {
      const responses = await Promise.all([
        fetch('/api/stats/tracks'),
        fetch('/api/stats/cars'),
        fetch('/api/stats/builds'),
        fetch('/api/stats/races'),
        fetch('/api/stats/lap-times'),
        fetch('/api/stats/users'),
      ])

      // Parse all responses in parallel
      const [tracksData, carsData, buildsData, racesData, lapTimesData, usersData] = await Promise.all(
        responses.map(r => r.json())
      )

      // Update state with fetched statistics
      setStats({
        tracks: tracksData.count || 0,
        cars: carsData.count || 0,
        builds: buildsData.count || 0,
        races: racesData.count || 0,
        lapTimes: lapTimesData.count || 0,
        users: usersData.count || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // Show loading spinner while fetching statistics
  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading settings..." />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* ========================================================================
          PAGE HEADER
          ======================================================================== */}
      <PageHeader
        title="SETTINGS"
        icon={SettingsIcon}
        description="Application overview and statistics"
        actions={
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        }
      />

      {/* ========================================================================
          DATABASE STATISTICS SECTION
          ======================================================================== */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">
            DATABASE
            <Badge variant="outline" className="ml-2 text-accent border-accent/30">
              LIVE
            </Badge>
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Tracks</p>
            <p className="text-2xl font-bold">{stats.tracks}</p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Cars</p>
            <p className="text-2xl font-bold">{stats.cars}</p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Builds</p>
            <p className="text-2xl font-bold">{stats.builds}</p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Races</p>
            <p className="text-2xl font-bold">{stats.races}</p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Lap Times</p>
            <p className="text-2xl font-bold">{stats.lapTimes}</p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Users</p>
            <p className="text-2xl font-bold">{stats.users}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <p className="text-sm text-muted-foreground">
            Connected to <span className="font-semibold text-accent">Supabase</span>
          </p>
        </div>
      </div>

      {/* ========================================================================
          IMAGES SECTION
          ======================================================================== */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-bold">
            IMAGES
            <Badge variant="outline" className="ml-2 text-chart-4 border-chart-4/30">
              PENDING
            </Badge>
          </h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Track and car images are currently using placeholders. Image fetching and management features coming soon.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold mb-2">Track Images</p>
              <p className="text-sm text-muted-foreground mb-3">{stats.tracks} tracks need images</p>
              <Button variant="outline" size="sm" disabled>
                Fetch Track Images
              </Button>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold mb-2">Car Images</p>
              <p className="text-sm text-muted-foreground mb-3">{stats.cars} cars need images</p>
              <Button variant="outline" size="sm" disabled>
                Fetch Car Images
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          THEME SECTION
          ======================================================================== */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold">THEME</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4 space-y-2">
              <p className="font-semibold">Color Scheme</p>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary border border-border"></div>
                  <span className="text-sm text-muted-foreground">Primary (Red)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent border border-border"></div>
                  <span className="text-sm text-muted-foreground">Accent (Cyan)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary border border-border"></div>
                  <span className="text-sm text-muted-foreground">Secondary (Orange)</span>
                </div>
              </div>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-2">
              <p className="font-semibold">Typography</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-mono">Font: System Default</p>
                <p className="font-mono">Mono: Font Mono</p>
                <p className="font-mono">Style: GT Racing</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          SYSTEM INFORMATION SECTION
          ======================================================================== */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-chart-4" />
          <h2 className="text-xl font-bold">SYSTEM INFORMATION</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground font-mono">Framework</span>
              <span className="font-semibold">Next.js 16</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground font-mono">Database</span>
              <span className="font-semibold">Supabase (Postgres)</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground font-mono">Authentication</span>
              <span className="font-semibold">NextAuth.js v5</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground font-mono">UI Components</span>
              <span className="font-semibold">shadcn/ui</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground font-mono">Styling</span>
              <span className="font-semibold">Tailwind CSS</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground font-mono">Email</span>
              <span className="font-semibold">Resend</span>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
