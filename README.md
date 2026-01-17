# FridayGT

> **🚨 Active Development Branch**: `buildfocussed` - Build-centric architecture pivot in progress
>
> **Current Branch**: `buildfocussed` (experimental)
> **Main Branch**: Original race-centric architecture
> **Rollback**: `git checkout main` to return to stable version

A GT7 lap time tracker and race management application built with Next.js, Supabase, and NextAuth.

## 🚨 Architecture Pivot (buildfocussed branch)

**Status**: Experimental branch testing build-centric architecture

The `buildfocussed` branch is implementing a major architectural change:

### Original Architecture (main branch)
- **Central Entity**: Race/Combo (car + track combination)
- **Builds**: Optional attachments to cars
- **Lap Times**: Can exist independently, optionally linked to builds
- **User Flow**: Select car → select track → record lap time → optionally attach build

### New Architecture (buildfocussed branch)
- **Central Entity**: **Build** (car setup/tuning configuration)
- **Lap Times**: Must be associated with a build
- **Tracks & Cars**: Organized by the builds that use them
- **User Flow**: Select build → select track → record lap time

### Key Changes
1. Build detail page becomes the main dashboard
2. All lap times require a buildId
3. Homepage centers on builds (recent, my builds, popular)
4. Navigation prioritizes builds

**To switch between versions**:
```bash
git checkout main           # Original architecture
git checkout buildfocussed  # Build-centric architecture
```

## Features

- 🚗 **Car Management** - Track your car collection and builds
- 🛤️ **Track Database** - Comprehensive track information
- ⏱️ **Lap Times** - Record and analyze your lap times
- 🏁 **Run Lists** - Organize races into run lists
- 🎮 **Sessions** - Host and manage racing sessions
- 👥 **Multiplayer** - Attendance tracking and session management

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js
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

### Development

```bash
# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
fridaygt/
├── src/                    # Next.js app source
│   ├── app/               # App Router pages and API routes
│   ├── components/        # React components
│   └── lib/               # Utility libraries
├── public/                # Static assets (images, fonts)
├── docs/                  # Project documentation
│   ├── DATABASE-SCHEMA.md       # Database structure
│   ├── DESIGN-SYSTEM.md         # UI/UX design system
│   ├── PLAN.md                  # Overall vision and roadmap
│   └── SESSION-LOG.md           # Development log
├── supabase/migrations/             # Database migration scripts
├── scripts/                # Utility scripts
└── supabase/              # Supabase configuration
```

## Documentation

- **[PLAN.md](docs/PLAN.md)** - Overall vision, architecture, and implementation roadmap
- **[DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)** - Complete database structure and table definitions
- **[DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** - UI/UX design system and component standards
- **[SESSION-LOG.md](docs/SESSION-LOG.md)** - Detailed development history and session logs

## Database Migrations

Database migrations are stored in the `supabase/migrations/` directory. To apply migrations:

1. Open Supabase Dashboard → SQL Editor
2. Open the migration file from `supabase/migrations/`
3. Run the SQL script

**Latest Migration:** `fix-race-column-casing.sql` (2026-01-13)

## Development Scripts

```bash
# Seed database with initial data
npm run seed

# Parse GT7 data files
npm run parse-gt7-data

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

The application is deployed on Vercel and uses Supabase for the database.

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Your application URL

## Contributing

This is a personal project for tracking GT7 lap times and managing racing sessions.

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
