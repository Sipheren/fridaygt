# FridayGT

> **GT7 Lap Time Tracker & Race Management**
> **Status**: Core Features Complete | **Branch**: `main` | **Last Updated**: 2026-01-29

A build-centric Gran Turismo 7 lap time tracker and race management application built with Next.js, Supabase, and NextAuth.

## Live Application

**Production URL**: https://fridaygt.vercel.app
**Current Version**: 2.9.3

## Versioning

FridayGT follows semantic versioning with a comprehensive session-based development log:

| Version | Sessions | Key Changes |
|---------|----------|-------------|
| **2.9.3** | #37 | Build Detail Empty Settings Filter - Hide null/empty tuning values |
| **2.9.2** | #36 | Race Build Filter Fix (Extended) - Show all builds in race creation AND edit |
| **2.9.1** | #36 | Race Creation Build Filter Fix - Show all builds, not just own |
| **2.9.0** | #35 | Tuning Settings Display Order - GT7 menu order, database cleanup, sort by displayOrder |
| **2.8.3** | #34 | Ballast Positioning UI Enhancement - sign display for front/rear indication |
| **2.8.2** | #33 | Parts Updates & Bug Fixes - Dirt tyre naming, build error fixes |
| **2.8.1** | #32 | Code Documentation - comprehensive inline comments |
| **2.8.0** | #29-31 | Race Members - member management, tyre selection, change tracking |
| **2.7.0** | #26-28 | Admin Features - user profile editing, build creator selection |
| **2.6.0** | #24-25 | Drag & Drop - Tonight page race reordering |
| **2.5.0** | #22-23 | Dropdown & Gears - virtualization, gear system migration |
| **2.4.0** | #21 | Tuning Display - build detail layout improvements |
| **2.3.0** | #18-20 | Production Hardening - dual inputs, UI consistency |
| **2.2.0** | #16-17 | Parts & Tuning - settings page, parts catalog |
| **2.1.0** | #13-15 | Active Races - global hover system |
| **2.0.0** | #10-12 | **BUILD-CENTRIC PIVOT** - architecture redesign |
| **1.0.0** | #1 | **INITIAL RELEASE** - core entities, auth |

### Version Classification
- **Major (x.0.0)**: Breaking changes, architectural pivots, database resets
- **Minor (x.y.0)**: New features, significant UI changes, new entities

See [SESSION-LOG.md](docs/SESSION-LOG.md) for complete version history with commit ranges and detailed session notes.

## Development Status

| Feature | Status |
|---------|--------|
| User Authentication | Complete |
| Car Database (552 cars) | Complete |
| Track Database (118 tracks) | Complete |
| Build Management | Complete |
| Parts System (72 parts, 5 categories) | Complete |
| Tuning System (53 settings, 6 sections) | Complete |
| Gear Ratios (20 gears, text storage) | Complete |
| Lap Time Tracking | Complete |
| Race Management | Complete |
| Race Members (Add/Edit/Delete/Reorder) | Complete |
| Member Change Tracking | Complete |
| Tyre Selection | Complete |
| Active Races (Tonight Page) | Complete |
| Race Reordering (Drag & Drop) | Complete |
| Admin User Management | Complete |
| Mobile Responsiveness | Complete |
| Code Quality & Debugging Comments | Complete |
| Production Deployment | Complete |
| Global Leaderboards | Pending |
| Car/Track Images | Pending |

## Project Overview

FridayGT helps a GT7 racing group track performance with a **build-centric architecture** where car setups and tuning configurations are the central organizing principle.

### How It Works

1. **Create Builds** — Set up car configurations with parts and tuning settings
2. **Create Races** — Link a track with one or more builds
3. **Toggle Active** — Mark races as active for tonight's session
4. **Reorder Races** — Drag and drop to set tonight's running order
5. **Record Lap Times** — Track performance linked to specific builds

### Key Concepts

- **Builds are central** — Every lap time and race requires a build
- **Race management** — Races combine a track with multiple builds, toggleable active status
- **Tonight page** — Shows all active races with drag-and-drop reordering
- **Parts & tuning validation** — Database-driven with foreign key integrity
- **Gear ratios** — Stored as text columns to preserve formatting (e.g., "2.500")

## Features

- **Build Management** — Create car builds with 72 parts across 5 categories and 53 tuning settings across 6 sections
  - Gear ratios stored as text (supports up to 20 gears with preserved formatting)
  - Admin users can assign builds to other active users
  - Clone builds with one click
- **Race Management** — Create races (track + builds), race-specific leaderboards, active toggle
  - Drag-and-drop reordering on Tonight page
  - Automatic order assignment for newly activated races
  - Multiple builds per car in a single race
- **Race Members** — Manage race participants with mobile-responsive interface
  - Add/remove members via dialog with user selection
  - Drag-and-drop reordering with haptic feedback
  - Tyre selection per member (9 tyre compounds)
  - Mobile-optimized with two-row layout on small screens
- **Member Change Tracking** — "Last Updated by" display shows who made changes and when
  - Tracks all operations: add, delete, reorder, tyre changes
  - Timezone conversion (UTC to local browser time)
  - Displays user gamertag and formatted timestamp
- **Lap Time Tracking** — Build-centric recording with track, conditions, and notes
  - Build name snapshot preserved at recording time
  - Personal best tracking per car/track/build combination
- **Tonight Page** — Active races dashboard with drag-and-drop reordering, live badge, weather icons
- **User Authentication** — Email magic links with admin approval workflow
  - Three roles: PENDING (awaiting approval), USER (approved), ADMIN (full access)
  - Admin notifications for new user registrations
- **Admin Tools** — User management, profile editing, build creator assignment
- **Mobile Optimized** — All pages responsive with WCAG-compliant touch targets (≥44px)
- **Branded Footer** — 3-column layout with sipheren.com (orange), year (gray), and dynamic version from package.json (red)
- **Version Display** — Automatic version number displayed in footer synced with package.json

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4
- **UI Components:** shadcn/ui with custom GT-inspired design system
- **State Management:** React Context, TanStack Query
- **Drag & Drop:** @dnd-kit (mobile-first, haptic feedback)
- **Virtualization:** @tanstack/react-virtual for large dropdowns
- **Backend:** Next.js API Routes with Supabase client
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Authentication:** NextAuth.js v5 with email magic links
- **Email:** Resend for transactional emails (React Email templates)
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Resend API key

### Installation

```bash
npm install
cp .env.local.example .env.local
# Update .env.local with your credentials
```

### Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Email
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Admin
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/tonight`.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
fridaygt/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/               # Admin dashboard (user management)
│   │   ├── api/                 # API endpoints
│   │   │   ├── auth/            # NextAuth handler
│   │   │   ├── builds/          # Build CRUD + clone
│   │   │   ├── cars/            # Car database queries
│   │   │   ├── lap-times/       # Lap time tracking
│   │   │   ├── parts/           # Parts & categories API
│   │   │   ├── races/           # Race management + reordering
│   │   │   ├── tracks/          # Track database queries
│   │   │   ├── tuning-settings/ # Tuning settings & sections API
│   │   │   └── users/           # User listing (admin)
│   │   ├── auth/                # Auth pages (signin, verify, pending)
│   │   ├── builds/              # Build management (list, create, edit, detail)
│   │   ├── lap-times/           # Lap time tracking (list, new)
│   │   ├── profile/             # User profile page
│   │   ├── races/               # Race management (list, create, edit, detail)
│   │   ├── settings/            # App settings with live DB stats
│   │   └── tonight/             # Active races dashboard (drag-and-drop reordering)
│   ├── components/
│   │   ├── builds/              # BuildSelector, QuickBuildModal, CarBuilds, TrackBuilds
│   │   ├── lap-times/           # LapTimeForm, CarLapTimes, TrackLapTimes
│   │   ├── tonight/             # SortableRaceList, SortableRaceCard, DragHandle
│   │   ├── layout/              # PageWrapper, PageHeader, EmptyState, SearchBar
│   │   └── ui/                  # shadcn/ui + custom components
│   ├── lib/                     # Auth, Supabase clients, utilities
│   │   ├── auth.ts              # NextAuth configuration
│   │   ├── auth-utils.ts        # isAdmin(), getCurrentUser() helpers
│   │   ├── email.tsx            # Email functions (React Email)
│   │   ├── time.ts              # formatLapTime(), parseLapTime(), formatDate()
│   │   ├── validation.ts        # Zod schemas
│   │   ├── rate-limit.ts        # In-memory rate limiting
│   │   └── api-error-handler.ts # Custom error classes
│   └── types/                   # TypeScript definitions
│       ├── database.ts          # Database types
│       └── components.ts        # Shared component types
├── gt7data/                     # GT7 reference data (CSV sources)
├── scripts/                     # Data import utilities
├── supabase/migrations/         # Database migrations
├── docs/                        # Project documentation
│   ├── PLAN.md                  # Roadmap and current status
│   ├── SESSION-LOG.md           # Development session history (29 sessions)
│   ├── DATABASE-SCHEMA.md       # Complete database structure
│   └── DESIGN-SYSTEM.md        # UI/UX patterns and standards
└── public/                      # Static assets
```

## Architecture

### Data Model

```
Car (GT7 catalog, 552 cars)
  └── CarBuild (user's tuned setup)
       ├── CarBuildUpgrade → Part (72 parts, 5 categories, FK validated)
       ├── CarBuildSetting → TuningSetting (53 settings, 6 sections, FK validated)
       ├── Gear ratios (gear1-20, finalDrive as text columns)
       └── LapTime → Track (118 tracks)

Race (track + builds, isActive toggle, order field)
  ├── RaceCar (multiple car/build combinations, buildId NOT NULL)
  └── RaceMember (race participants with tyre selection)
       - User: Member's gamertag
       - Part: Selected tyre compound
       - Order: Display position
       - UpdatedBy: User who last modified the record
       - Mobile-responsive with two-row layout

Tonight Page → All races where isActive = true, sorted by order
```

### Navigation

| Route | Purpose |
|-------|---------|
| `/tonight` | Active races dashboard (home) — drag to reorder |
| `/builds` | Build management — create, edit, clone |
| `/races` | Race management — create, edit, toggle active |
| `/lap-times` | Lap time tracking — record, view by car/track |
| `/profile` | User profile — gamertag, stats |
| `/settings` | App settings, DB statistics |
| `/admin/users` | User management (admin only) |

### Key Workflows

**Build Creation:**
1. Select car from searchable dropdown (552 cars, grouped by manufacturer)
2. Add optional description and parts (72 parts across 5 categories)
3. Configure tuning settings (53 settings across 6 sections)
4. Set gear ratios (up to 20 gears, stored as text to preserve formatting)
5. Mark as public/private

**Race Setup:**
1. Select track from searchable dropdown (118 tracks, grouped by location)
2. Select builds to include (multiple builds per car allowed)
3. Configure laps (number) and weather (dry/wet)
4. Toggle active to appear on Tonight page

**Lap Time Recording:**
1. Select track
2. Select car (filters to cars you have builds for)
3. Select build (optional, but recommended)
4. Enter time (mm:ss.sss format)
5. Add conditions and notes

### Security

- Row Level Security (RLS) on all user data tables
- RLS on next_auth schema tables
- Users can only access their own builds, lap times, and races
- Public read access for reference data (cars, tracks, parts)
- Service role bypass for admin operations
- Security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on API mutations (20 req/min)
- Admin-only endpoints protected with `isAdmin()` check

### Performance Optimizations

- **Virtualized Dropdowns** — Large lists (552 cars, 118 tracks) use virtual rendering
- **Parallel Queries** — Lap statistics use Promise.all for COUNT/MIN queries
- **Lazy Cleanup** — Rate limiter cleans expired entries probabilistically (10% per request)
- **Debounced API Calls** — Race reordering debounced by 500ms
- **Optimistic UI Updates** — Drag-and-drop updates immediately, rolls back on error
- **Atomic Database Operations** — Race reordering uses row-level locking to prevent race conditions

## Database Schema

### Core Tables
- **User** — Accounts with roles (PENDING/USER/ADMIN), gamertag, adminNotified
- **Car** — 552 GT7 cars with specs
- **Track** — 118 tracks with reverse layouts
- **CarBuild** — User car builds/tunes with userId (creator assignment)
- **CarBuildUpgrade** — Installed parts (FK → Part)
- **CarBuildSetting** — Tuning settings (FK → TuningSetting, NULL for custom gears)
- **LapTime** — Lap times with buildId, buildName (snapshot)
- **Race** — Races with track, laps, weather, isActive, order
- **RaceCar** — Junction table (race → car/build combinations)
- **RaceMember** — Race participants with tyre selection, order, and change tracking (updatedById)

### Parts & Tuning
- **PartCategory** — 5 categories (Sports, Club Sports, Semi-Racing, Racing, Extreme)
- **Part** — 72 parts with FK validation
- **TuningSection** — 6 active sections (Suspension, Differential, ECU, Performance, Aerodynamics)
- **TuningSetting** — 53 settings with inputType, min, max, step, unit, displayOrder

### Database Functions
- **reorder_races_atomic** — Atomic race reordering with row-level locking
- **reorder_race_members_atomic** — Atomic race member reordering with row-level locking and change tracking

See [DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) for complete schema.

## Available Scripts

```bash
npm run dev              # Start development server (Turbopack)
npm run build            # Build for production
npm run lint             # Run ESLint

# Data Import (run with: npx tsx scripts/<name>)
import-cars-combined.ts      # Import 552 cars from CSV
import-tracks-combined.ts    # Import 118 tracks from CSV
migrate-parts-to-db.ts       # Migrate parts/settings to DB
```

## Documentation

- **[PLAN.md](docs/PLAN.md)** — Project roadmap and current status (Phase 14 complete)
- **[SESSION-LOG.md](docs/SESSION-LOG.md)** — Development session history (29 sessions)
- **[DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)** — Complete database structure
- **[DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** — UI/UX patterns and standards

## Code Quality

- **TypeScript Strict Mode** — All files use strict type checking
- **Zod Validation** — All API inputs validated with Zod schemas
- **Error Boundaries** — React error boundaries for graceful failure handling
- **Centralized Utilities** — Shared helpers for auth, time formatting, validation
- **Comprehensive Comments** — Debugging comments throughout API routes and components
- **Security Audited** — RLS policies, admin authorization, foreign key validation

## License

MIT
