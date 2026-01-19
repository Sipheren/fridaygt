# FridayGT

> **🏎️ Current Branch**: `buildfocussed` - Build-centric architecture
> **Status**: Active development

A GT7 lap time tracker and race management application built with Next.js, Supabase, and NextAuth.

## 🎯 Project Overview

FridayGT helps Gran Turismo 7 players track their racing performance with a **build-centric architecture** where car setups and tuning configurations are the central organizing principle.

### Key Concepts

**Builds are Central**
- Every lap time is associated with a specific build (car setup/tuning)
- Builds organize your performance data by car configuration
- Easy to compare how different tunes perform on the same track

**Active Races System**
- Mark races as "active" to feature them on the Tonight page
- Quick toggle from the race list or edit page
- Tonight page shows all active races for upcoming sessions

## Features

- 🏗️ **Build Management** - Create and manage car builds with tuning setups
- 🚗 **Car Database** - Track your car collection
- 🛤️ **Track Database** - Comprehensive track information and lap time records
- ⏱️ **Lap Time Tracking** - Record and analyze lap times by build and track
- 🏁 **Race Management** - Organize races and mark them as active for upcoming sessions
- 📺 **Tonight Page** - Quick view of all active races for tonight's racing
- 👤 **User Profiles** - Manage your account and preferences

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** NextAuth.js v5
- **State Management:** React hooks, Server Components

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase project created
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your Supabase credentials
```

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
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
│   │   ├── admin/               # Admin pages
│   │   ├── api/                 # API routes
│   │   ├── auth/                # Authentication pages
│   │   ├── builds/              # Build management pages
│   │   ├── cars/                # Car database pages
│   │   ├── lap-times/           # Lap time tracking pages
│   │   ├── races/               # Race management pages
│   │   ├── tracks/              # Track database pages
│   │   └── tonight/             # Tonight's races page
│   ├── components/              # React components
│   │   ├── builds/              # Build-related components
│   │   ├── lap-times/           # Lap time components
│   │   └── ui/                  # shadcn/ui components
│   ├── lib/                     # Utility libraries
│   └── types/                   # TypeScript type definitions
├── public/                      # Static assets
├── docs/                        # Project documentation
│   ├── DATABASE-SCHEMA.md       # Database structure
│   ├── DESIGN-SYSTEM.md         # UI/UX design system
│   ├── PLAN.md                  # Overall vision and roadmap
│   └── SESSION-LOG.md           # Development log
├── supabase/                    # Supabase configuration
│   └── migrations/              # Database migration scripts
├── gt7data/                     # GT7 game data
│   ├── gt7_cars_combined.csv    # Car data
│   ├── gt7_courses_combined.csv # Track/course data
│   ├── gt7_parts_shop.csv       # Parts data
│   └── gt7_tuning_settings.csv  # Tuning options
└── scripts/                     # Utility scripts for data import
```

## Documentation

- **[PLAN.md](docs/PLAN.md)** - Overall vision, architecture, and implementation roadmap
- **[DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)** - Complete database structure and table definitions
- **[DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** - UI/UX design system and component standards
- **[SESSION-LOG.md](docs/SESSION-LOG.md)** - Detailed development history and session logs

## Database Migrations

Database migrations are stored in the `supabase/migrations/` directory.

### Applying Migrations

1. Open Supabase Dashboard → SQL Editor
2. Open the migration file from `supabase/migrations/`
3. Run the SQL script

### Important Migrations

- `20260119_build_centric_pivot.sql` - Build-centric architecture changes
- `20260119_add_race_active.sql` - Active races system

## Available Scripts

```bash
# Development
npm run dev              # Start development server

# Build & Type Check
npm run build            # Build for production
npm run type-check       # Run TypeScript type checking
npm run lint             # Run ESLint

# Data Import
npm run import-cars      # Import GT7 car data
npm run import-tracks    # Import GT7 track data
```

## Deployment

The application is deployed on Vercel and uses Supabase for the database.

### Environment Variables for Production

Ensure these are set in your deployment environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to your production domain)

## Architecture

### Build-Centric Design

The `buildfocussed` branch implements a build-centric architecture:

```
Build (car setup)
  ├── Car (vehicle)
  ├── Upgrades & Parts
  ├── Tuning Settings
  └── Lap Times (linked to tracks)
      └── Track
```

This differs from traditional lap time trackers that organize by car or track first.

### Active Races System

Races can be marked as "active" which:
- Displays them on the Tonight page
- Indicates upcoming races for the group
- Provides quick access from navigation
- Can be toggled from race list or edit page

## Contributing

This is a personal project for tracking GT7 lap times and managing racing sessions.

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
