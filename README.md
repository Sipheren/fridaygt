# FridayGT

> **GT7 Lap Time Tracker & Race Management**
> **Status**: Core Features Complete | **Branch**: `main` | **Last Updated**: 2026-01-24

A build-centric Gran Turismo 7 lap time tracker and race management application built with Next.js, Supabase, and NextAuth.

## Live Application

**Production URL**: https://fridaygt.vercel.app

## Development Status

| Feature | Status |
|---------|--------|
| User Authentication | Complete |
| Car Database (552 cars) | Complete |
| Track Database (118 tracks) | Complete |
| Build Management | Complete |
| Parts System (72 parts, 5 categories) | Complete |
| Tuning System (60 settings, 15 sections) | Complete |
| Lap Time Tracking | Complete |
| Race Management | Complete |
| Tonight Page (Active Races) | Complete |
| Mobile Responsiveness | Complete |
| Production Deployment | Complete |
| Car/Track Images | Pending |

## Project Overview

FridayGT helps a GT7 racing group track performance with a **build-centric architecture** where car setups and tuning configurations are the central organizing principle.

### How It Works

1. **Create Builds** — Set up car configurations with parts and tuning settings
2. **Create Races** — Link a track with one or more builds
3. **Toggle Active** — Mark races as active for tonight's session
4. **Record Lap Times** — Track performance linked to specific builds

### Key Concepts

- **Builds are central** — Every lap time and race requires a build
- **Race management** — Races combine a track with multiple builds, toggleable active status
- **Tonight page** — Shows all active races for the current session
- **Parts & tuning validation** — Database-driven with foreign key integrity

## Features

- **Build Management** — Create car builds with 72 parts across 5 categories and 60 tuning settings across 15 sections (including custom transmission gears)
- **Race Management** — Create races (track + builds), race-specific leaderboards, active toggle
- **Lap Time Tracking** — Build-centric recording with track, conditions, and notes
- **Tonight Page** — Active races dashboard with live badge, weather icons, build links
- **User Authentication** — Email magic links with admin approval workflow
- **Mobile Optimized** — All pages responsive with WCAG-compliant touch targets

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **UI Components:** shadcn/ui with custom design system
- **Backend:** Next.js API Routes with Supabase client
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Authentication:** NextAuth.js v5 with email magic links
- **Email:** Resend for transactional emails
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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/tonight`.

## Project Structure

```
fridaygt/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/               # Admin dashboard (user management)
│   │   ├── api/                 # API endpoints
│   │   │   ├── auth/            # NextAuth handler
│   │   │   ├── builds/          # Build CRUD + quick creation
│   │   │   ├── cars/            # Car database queries
│   │   │   ├── lap-times/       # Lap time tracking
│   │   │   ├── parts/           # Parts & categories API
│   │   │   ├── races/           # Race management
│   │   │   ├── stats/           # Database statistics
│   │   │   ├── tracks/          # Track database queries
│   │   │   ├── tuning-settings/ # Tuning settings & sections API
│   │   │   └── user/            # User profile
│   │   ├── auth/                # Auth pages (signin, verify, pending)
│   │   ├── builds/              # Build management (list, create, edit, detail)
│   │   ├── lap-times/           # Lap time tracking (list, new)
│   │   ├── races/               # Race management (list, create, edit, detail)
│   │   ├── settings/            # App settings with live DB stats
│   │   ├── tonight/             # Active races dashboard
│   │   └── profile/             # User profile page
│   ├── components/
│   │   ├── builds/              # BuildSelector, QuickBuildModal, Tabs
│   │   ├── lap-times/           # LapTimeForm, CarLapTimes
│   │   ├── layout/              # PageWrapper, PageHeader, EmptyState, SearchBar
│   │   └── ui/                  # shadcn/ui + custom components
│   ├── lib/                     # Auth, Supabase clients, utilities
│   └── types/                   # TypeScript definitions
├── gt7data/                     # GT7 reference data (CSV sources)
├── scripts/                     # Data import utilities (4 scripts)
├── supabase/migrations/         # Database migrations
├── docs/                        # Project documentation
│   ├── PLAN.md                  # Roadmap and status
│   ├── SESSION-LOG.md           # Development history
│   ├── DATABASE-SCHEMA.md       # Database structure
│   └── DESIGN-SYSTEM.md        # UI/UX standards
└── public/                      # Static assets
```

## Architecture

### Data Model

```
Car (GT7 catalog, 552)
  └── CarBuild (user's tuned setup)
       ├── CarBuildUpgrade → Part (72 parts, FK validated)
       ├── CarBuildSetting → TuningSetting (60 settings, FK validated)
       └── LapTime → Track (118 tracks)

Race (track + builds, isActive toggle)
  └── RaceCar (multiple car/build combinations)

Tonight Page → All races where isActive = true
```

### Navigation

| Route | Purpose |
|-------|---------|
| `/tonight` | Active races dashboard (home) |
| `/builds` | Build management |
| `/races` | Race management |
| `/lap-times` | Lap time tracking |
| `/settings` | App settings, DB stats |
| `/admin/users` | User management (admin) |

### Security

- Row Level Security (RLS) on all user data tables
- RLS on next_auth schema tables
- Users can only access their own builds, lap times, and races
- Public read access for reference data (cars, tracks, parts)
- Security headers (CSP, HSTS, X-Frame-Options)

## Database Schema

### Core Tables
- **User** — Accounts with roles (PENDING/USER/ADMIN), gamertag
- **Car** — 552 GT7 cars with specs
- **Track** — 118 tracks with reverse layouts
- **CarBuild** — User car builds/tunes
- **CarBuildUpgrade** — Installed parts (FK → Part)
- **CarBuildSetting** — Tuning settings (FK → TuningSetting)
- **LapTime** — Lap times linked to builds, tracks, and cars
- **Race** — Races with track, laps, weather, isActive
- **RaceCar** — Junction table (race → car/build combinations)

### Parts & Tuning
- **PartCategory** — 5 categories (Sports, Club Sports, Semi-Racing, Racing, Extreme)
- **Part** — 72 parts with FK validation
- **TuningSection** — 15 sections (Suspension, ECU, Transmission, etc.)
- **TuningSetting** — 60 settings with inputType, min, max, step, unit, displayOrder

See [DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) for complete schema.

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run lint             # Run ESLint

# Data Import (run with: npx tsx scripts/<name>)
import-cars-combined.ts      # Import 552 cars from CSV
import-tracks-combined.ts    # Import 118 tracks from CSV
migrate-parts-to-db.ts       # Migrate parts/settings to DB
generate-parts-shop.ts       # Generate parts TypeScript file
```

## Documentation

- **[PLAN.md](docs/PLAN.md)** — Project roadmap and current status
- **[SESSION-LOG.md](docs/SESSION-LOG.md)** — Development session history
- **[DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)** — Complete database structure
- **[DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** — UI/UX patterns and standards

## License

MIT
