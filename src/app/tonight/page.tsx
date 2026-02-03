/**
 * TONIGHT PAGE - DRAGGABLE RACE LIST
 *
 * Purpose:
 * Displays active races for tonight's racing session with drag-and-drop reordering.
 * Serves as the main race management interface during racing events.
 *
 * Key Features:
 * - Fetches and displays races marked as "active"
 * - Drag-and-drop race reordering using @dnd-kit
 * - Live badge with animated ping effect
 * - Hero section with gradient background and animated pattern
 * - Empty state with call-to-action
 * - Footer with link to manage races
 * - Responsive design with animated elements
 *
 * Data Flow:
 * 1. On mount, fetches active races via GET /api/races?isActive=true
 * 2. Races passed to SortableRaceList component
 * 3. Reordering handled by SortableRaceList via PATCH /api/races/{id}
 * 4. UI updates automatically when order changes
 *
 * State Management:
 * - races: Array of active race objects
 * - loading: Initial data fetch state
 *
 * Race Active Status:
 * - Races must have isActive: true in database
 * - Set on /races page by toggling "Active" toggle
 * - Only active races appear on this page
 * - Order maintained by displayOrder field
 *
 * API Integration:
 * - GET /api/races?isActive=true: Fetch active races in order
 * - PATCH /api/races/{id}: Update display order (handled by SortableRaceList)
 *
 * Drag & Drop Functionality:
 * - Powered by @dnd-kit/core and @dnd-kit/sortable
 * - Visual feedback during drag (opacity, scale)
 * - Smooth animations with Animatable layout
 * - Updates display order on all races after reorder
 * - Optimistic UI updates for better UX
 *
 * Styling:
 * - Hero section: Gradient background (from-primary/10 via-primary/5 to-background)
 * - Animated background pattern with repeating lines
 * - Live badge: Destructive color with ping animation
 * - Card-based footer with dashed border
 * - Responsive typography (text-2xl sm:text-3xl)
 * - Icon animations (group-hover:rotate-90)
 *
 * Empty State:
 * - Shown when no active races exist
 * - Animated icon with gradient background
 * - Clear call-to-action to manage races
 * - Helpful description text
 *
 * Error Handling:
 * - Network errors logged to console
 * - No error dialog - silent failure with console logs
 * - Loading state prevents duplicate requests
 *
 * Common Issues:
 * - No races showing? Check if races are marked as active on /races page
 * - Drag not working? Check @dnd-kit installation
 * - Order not saving? Check API response and displayOrder updates
 *
 * Related Files:
 * - /api/races/route.ts: Races API endpoints
 * - @/components/tonight/sortable-race-list: Drag-and-drop list component
 * - @/components/tonight/race-card: Individual race card
 * - /races/page.tsx: Race management page
 * - @/lib/dnd-utils: DnD utility functions
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSection } from '@/components/ui/loading'
import { SortableRaceList } from '@/components/tonight/sortable-race-list'
import type { Race } from '@/components/tonight/sortable-race-list'
import {
  Radio,
  Settings,
} from 'lucide-react'

export default function TonightPage() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  // Fetch active races on component mount
  useEffect(() => {
    fetchActiveRaces()
  }, [])

  // Fetch races with isActive=true to get tonight's races in order
  const fetchActiveRaces = async () => {
    try {
      // Fetch with ?isActive=true to get races in order
      const res = await fetch('/api/races?isActive=true')
      const data = await res.json()

      setRaces(data.races || [])
    } catch (error) {
      console.error('Error fetching active races:', error)
    } finally {
      setLoading(false)
    }
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // Show loading spinner while fetching data
  if (loading) {
    return <LoadingSection text="Loading tonight&apos;s races..." />
  }

  // Show empty state when no active races
  if (races.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Empty State Icon */}
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
              <Radio className="h-16 w-16 text-primary" />
            </div>
          </div>

          {/* Empty State Text */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">No Active Races</h2>
            <p className="text-muted-foreground text-lg">
                Ready to race? Set races as active to see them here for tonight&apos;s session!
            </p>
          </div>

          {/* CTA Button */}
          <Button asChild size="lg" className="group">
            <Link href="/races">
              <Settings className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Manage Races
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Main content with hero section, race list, and footer
  return (
    <div className="min-h-screen">
      {/* ========================================================================
          HERO SECTION
          ======================================================================== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              currentColor 10px,
              currentColor 20px
            )`,
          }}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="text-center space-y-2">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
              </span>
              <span className="text-xs font-semibold text-destructive">LIVE</span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Race List
              </h1>
              <p className="text-sm text-muted-foreground">
                {races.length} {races.length === 1 ? 'active race' : 'active races'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          RACES LIST (DRAGGABLE)
          ======================================================================== */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <SortableRaceList initialRaces={races} />
      </div>

      {/* ========================================================================
          FOOTER
          ======================================================================== */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-gradient-to-r from-muted/50 to-muted border-dashed">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Want to modify tonight&apos;s races?
            </p>
            <Button asChild variant="outline" size="lg">
              <Link href="/races">
                <Settings className="h-4 w-4 mr-2" />
                Manage Races
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
