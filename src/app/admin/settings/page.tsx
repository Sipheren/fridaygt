/**
 * ADMIN SETTINGS PAGE
 *
 * Purpose:
 * Administrative settings page displaying system configuration, database statistics,
 * and application information. Read-only dashboard for viewing system status.
 *
 * Key Features:
 * - Database statistics display (tracks, cars counts)
 * - Image management status (pending feature)
 * - Theme/color scheme information
 * - System technology stack information
 * - Connection status indicators
 *
 * Data Flow:
 * - Static page - no API calls or dynamic data fetching
 * - All values are hardcoded for display purposes
 * - Future versions may fetch real-time stats
 *
 * State Management:
 * - No state - purely presentational component
 *
 * API Integration:
 * - None currently
 * - Future: May add API endpoints for dynamic stats
 *
 * Information Displayed:
 * - Database: 118 tracks, 552 cars (hardcoded)
 * - Connection: Supabase
 * - Images: Track/car image management (pending feature)
 * - Theme: Color scheme and typography
 * - System: Framework, database, auth, UI, styling, email
 *
 * Styling:
 * - Three main sections: Database, Images, Theme, System Info
 * - Badge indicators for status (ACTIVE, PENDING)
 * - Icon-based section headers
 * - Grid layout for stats cards
 * - Color scheme visualization
 *
 * Future Enhancements:
 * - Dynamic statistics from API
 * - Image fetching functionality
 * - Theme customization controls
 * - System health monitoring
 * - Configuration management
 *
 * Common Issues:
 * - Hardcoded values may become outdated
 * - No real-time data updates
 *
 * Related Files:
 * - /admin/page.tsx: Admin dashboard redirect
 * - /admin/users/page.tsx: User management
 * - @/components/layout: PageWrapper, PageHeader components
 * - /settings/page.tsx: User-facing settings page
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Settings as SettingsIcon, Database, Image, Palette } from 'lucide-react'
import { PageWrapper, PageHeader } from '@/components/layout'

export default function AdminSettingsPage() {
  const router = useRouter()

  return (
    <PageWrapper>
      {/* ========================================================================
          PAGE HEADER
          ======================================================================== */}
      <PageHeader
        title="SETTINGS"
        icon={SettingsIcon}
        description="Application configuration and preferences"
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
          DATABASE SECTION
          ======================================================================== */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">
            DATABASE
            <Badge variant="outline" className="ml-2 text-accent border-accent/30">
              ACTIVE
            </Badge>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Tracks</p>
            <p className="text-2xl font-bold">118</p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Cars</p>
            <p className="text-2xl font-bold">552</p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground font-mono mb-1">Connection</p>
            <p className="text-sm font-semibold text-accent">Supabase</p>
          </div>
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
              <p className="text-sm text-muted-foreground mb-3">118 tracks need images</p>
              <Button variant="outline" size="sm" disabled>
                Fetch Track Images
              </Button>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold mb-2">Car Images</p>
              <p className="text-sm text-muted-foreground mb-3">552 cars need images</p>
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
              <span className="font-semibold">Next.js 14</span>
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
