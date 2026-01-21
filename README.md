# FridayGT

> **🏎️ GT7 Lap Time Tracker & Race Management**
> **Status**: Core Features Complete | **Branch**: `main` | **Last Updated**: 2026-01-21

A comprehensive Gran Turismo 7 lap time tracker and race management application built with Next.js, Supabase, and NextAuth.

## 🚀 Live Application

**Production URL**: https://fridaygt.vercel.app

The application is deployed and live in production. All core features are functional including user authentication, build management, lap time tracking, and race management.

## Development Status

| Feature | Status |
|---------|--------|
| User Authentication | ✅ Complete |
| Car Database (552 cars) | ✅ Complete |
| Track Database (118 tracks) | ✅ Complete |
| Build Management | ✅ Complete |
| Parts System (72 parts) | ✅ Complete |
| Tuning System (60 settings) | ✅ Complete |
| Lap Time Tracking | ✅ Complete |
| Race Management | ✅ Complete |
| Run Lists & Sessions | ✅ Complete |
| Tonight Page | ✅ Complete |
| Mobile Responsiveness | ✅ Complete |
| Car/Track Images | ❌ Pending |
| Production Deployment | ✅ Complete |

## 🎯 Project Overview

FridayGT helps GT7 players track racing performance with a **build-centric architecture** where car setups and tuning configurations are the central organizing principle.

### Key Concepts

**Builds are Central**
- Every lap time is associated with a specific build (car setup/tuning)
- Builds organize performance data by car configuration
- Easy to compare how different tunes perform on the same track
- Parts and tuning settings now stored in database with validation

**Race Management**
- Create races linked to specific tracks and car combinations
- Multiple cars can be assigned to each race
- Run Lists organize upcoming racing sessions
- Active races featured on the Tonight page

## Features

### Core Features
- 🏗️ **Build Management** - Create and manage car builds with parts and tuning setups
- 🚗 **Car Database** - Track your GT7 car collection
- 🛤️ **Track Database** - Comprehensive track information with reverse layouts
- ⏱️ **Lap Time Tracking** - Record and analyze lap times by build and track
- 🏁 **Race Management** - Organize races with multiple car combinations
- 📋 **Run Lists** - Plan and manage racing sessions with multiple events
- 📺 **Tonight Page** - Quick view of active races for tonight's racing
- 👤 **User Profiles** - Manage account with gamertag support

### Recent Enhancements (2026-01-21)
- ✅ **Parts & Tuning Migration** - Database-driven system with 72 parts and 60 tuning settings
- ✅ **Foreign Key Validation** - All build components validated against master data
- ✅ **UI Consistency** - Unified button styling, hover states, and visual feedback
- ✅ **Mobile Optimization** - All pages responsive with WCAG-compliant touch targets
- ✅ **Multiple Cars per Race** - Support for duplicate cars with different builds
- ✅ **Row-Level Security** - RLS enabled on all user data tables
- ✅ **Build-Centric Architecture** - Races require builds, leaderboards filter by race builds

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui with custom design system
- **Backend:** Next.js API Routes with Supabase client
- **Database:** Supabase (PostgreSQL 15) with RLS
- **Authentication:** NextAuth.js v5 with email magic links
- **State Management:** React hooks, Server Components, Suspense
- **Email:** Resend for transactional emails

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase project created
- Resend API key (for emails)
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Update .env.local with your credentials
```

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
```

### Development

```bash
# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
fridaygt/
├── src/                         # Next.js app source
│   ├── app/                      # App Router pages and API routes
│   │   ├── admin/               # Admin dashboard pages
│   │   ├── api/                 # API endpoints
│   │   ├── auth/                # Authentication pages
│   │   ├── builds/              # Build management (CRUD)
│   │   ├── cars/                # Car database
│   │   ├── lap-times/           # Lap time tracking
│   │   ├── races/               # Race management
│   │   ├── run-lists/           # Run list management
│   │   ├── tracks/              # Track database
│   │   └── tonight/             # Tonight's active races
│   ├── components/              # React components
│   │   ├── builds/              # Build-related components
│   │   ├── lap-times/           # Lap time components
│   │   ├── races/               # Race components
│   │   ├── run-lists/           # Run list components
│   │   └── ui/                  # shadcn/ui + custom UI
│   ├── lib/                     # Utilities (auth, db, helpers)
│   └── types/                   # TypeScript definitions
├── public/                      # Static assets
├── docs/                        # Project documentation
│   ├── PLAN.md                  # Roadmap and status
│   ├── SESSION-LOG.md           # Development history
│   ├── DATABASE-SCHEMA.md       # Database structure
│   └── DESIGN-SYSTEM.md         # UI/UX standards
├── supabase/                    # Supabase configuration
│   └── migrations/              # Database migrations
│       └── done/                # Applied migrations
├── gt7data/                     # GT7 game data (CSV)
│   ├── gt7_cars_combined.csv    # 552 cars with specs
│   ├── gt7_courses_combined.csv # 118 tracks and layouts
│   ├── gt7_parts_shop.csv       # 72 parts across 5 categories
│   └── gt7_tuning_settings.csv  # 60 settings across 15 sections
└── scripts/                     # Utility scripts
```

## Database Schema Highlights

### Core Tables
- **User** - User accounts with roles (PENDING/USER/ADMIN)
- **Car** - GT7 car catalog (552 cars)
- **Track** - Track catalog with reverse layouts (118 tracks)
- **CarBuild** - User car builds/tunes
- **CarBuildUpgrade** - Installed parts (FK to Part)
- **CarBuildSetting** - Tuning settings (FK to TuningSetting)
- **LapTime** - Lap times linked to builds and tracks
- **Race** - Races with track and multiple cars
- **RaceCar** - Junction table for race→car relationships
- **RunList** - Racing session plans
- **RunListEntry** - Events within a run list

### Parts & Tuning (2026-01-21)
- **PartCategory** - 5 categories (Sports, Club Sports, Semi-Racing, Racing, Extreme)
- **Part** - 72 individual parts with foreign key validation
- **TuningSection** - 15 tuning sections (Suspension, ECU, Transmission, etc.)
- **TuningSetting** - 60 individual settings with validation

See [DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) for complete schema.

## Documentation

- **[PLAN.md](docs/PLAN.md)** - Project vision, roadmap, and current status
- **[SESSION-LOG.md](docs/SESSION-LOG.md)** - Detailed development session history
- **[DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)** - Complete database structure
- **[DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** - UI/UX design system and patterns

## Available Scripts

```bash
# Development
npm run dev              # Start development server

# Build & Type Check
npm run build            # Build for production
npm run type-check       # TypeScript type checking
npm run lint             # Run ESLint

# Data Import
npx tsx scripts/import-cars-combined.ts     # Import car data
npx tsx scripts/import-tracks-combined.ts   # Import track data
npx tsx scripts/migrate-parts-to-db.ts      # Migrate parts to DB
npx tsx scripts/generate-parts-shop.ts      # Generate parts TypeScript file

# Database
# Run migrations manually in Supabase SQL Editor
```

## Database Migrations

Migrations are stored in `supabase/migrations/`. Applied migrations are moved to `supabase/migrations/done/`.

### Recent Migrations
- `20260121_add_parts_and_settings_tables.sql` - Parts/tuning tables
- `20260121_finalize_parts_migration.sql` - FK constraints
- `20260119_build_centric_pivot.sql` - Build architecture
- `20260119_race_configuration.sql` - Race entity
- `20260119_add_multiple_cars_to_runlist.sql` - Multi-car support

### Applying Migrations

1. Open Supabase Dashboard → SQL Editor
2. Copy the migration file content
3. Run the SQL script

## Architecture

### Data Model

```
Car (GT7 catalog)
  └── CarBuild (user's tuned setup)
       ├── CarBuildUpgrade → Part (validated parts)
       ├── CarBuildSetting → TuningSetting (validated tuning)
       └── LapTime → Track (performance records)

Race (scheduled event on a track)
  └── RaceCar (multiple car/build combinations)

RunList (racing session plan)
  └── RunListEntry → Race (events in session)
       └── RunListEntryCar (additional cars for entry)
```

### Security

- **Row Level Security (RLS)** enabled on all user data
- Users can only access their own builds, lap times, and run lists
- Public access for reference data (cars, tracks, parts)
- Admin role for elevated permissions

### Design System

- Global hover states for consistent feedback
- Unified button styling (`ghostBordered` for secondary actions)
- Touch-friendly targets (min 44px height)
- Consistent spacing and typography
- Dark mode support (if applicable)

See [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) for details.

## Deployment

### Production Environment Variables

Required for production deployment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `DEFAULT_ADMIN_EMAIL`

### Deployment Platform

**Live Production**: https://fridaygt.vercel.app

The application is deployed on Vercel with Supabase as the backend database.

## Contributing

This is a personal project for GT7 racing. Suggestions and improvements are welcome through issues and pull requests.

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
