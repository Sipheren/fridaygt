# FridayGT Implementation Plan

## Project Overview
A web application for a racing group that's been doing Friday racing for 15 years (Forza Motorsport) and now transitioning to Gran Turismo 7 on PlayStation. The app tracks lap times, manages car builds/tunes, and organizes race nights.

## Tech Stack
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Authentication**: NextAuth.js v5 with Supabase adapter
- **Database**: Supabase Postgres
- **Email**: Resend
- **UI**: Tailwind CSS 4, shadcn/ui, Framer Motion, Lucide icons
- **Forms**: React Hook Form with Zod validation
- **State**: React Context, TanStack Query
- **Tables**: TanStack Table
- **Deployment**: Vercel

## Architecture

### Build-Centric Design

FridayGT uses a **build-centric** architecture where:

- **Build is the primary entity and central hub**
- Every race must have builds (RaceCar.buildId is NOT NULL)
- Lap times require a build selection
- Races organize builds around a track
- The Tonight page shows active races for the current session

### Navigation
- **Tonight** — Active races dashboard for race nights
- **Builds** — Create/manage car setups with parts and tuning
- **Races** — Create races (track + builds), toggle active status
- **Lap Times** — Record lap times linked to builds and tracks

### User Flow
1. Create builds (car + parts + tuning settings)
2. Create races (track + builds)
3. Toggle races active for tonight
4. Record lap times during race sessions

### Data Model
```
Car (GT7 catalog, 552 cars)
  └── CarBuild (user's tuned setup)
       ├── CarBuildUpgrade → Part (validated parts, 72 total)
       ├── CarBuildSetting → TuningSetting (validated tuning, 53 total - NO Transmission gears)
       ├── [Direct columns: finalDrive, gear1-20] (Gear ratios as text, supports up to 20 gears)
       └── LapTime → Track (performance records)

Race (track + builds, toggleable active status)
  └── RaceCar (multiple car/build combinations)

Tonight Page → Shows all races where isActive = true
```

---

## Current Status

**Date**: 2026-01-24
**Branch**: `main`
**Production URL**: https://fridaygt.vercel.app
**Status**: Core features complete and deployed

---

## ✅ Completed Phases

### Phase 1: Foundation & Setup ✅
- Next.js 16 + TypeScript + Tailwind CSS 4
- Supabase Postgres database with RLS
- NextAuth.js v5 with email magic links
- Resend email service
- Account approval workflow (PENDING → USER → ADMIN)
- Database seeded (552 cars, 118 tracks)

### Phase 2: Core Layout & UI ✅
- GT-inspired design system
- Responsive header with navigation
- Dark/light mode support
- shadcn/ui component library
- Reusable layout components (PageWrapper, PageHeader, EmptyState, SearchBar)
- Global hover system with consistent CSS utilities

### Phase 3: GT7 Reference Data ✅
- Car database (552 cars with specs) — API accessible
- Track database (118 tracks with layouts) — API accessible
- Parts database (72 parts, 5 categories) — database-driven with FK validation
- Tuning settings database (53 settings, 6 sections) — database-driven with FK validation
  - Transmission section exists but has NO settings (gears are direct CarBuild columns)

### Phase 4: Build Management ✅
- Build CRUD (create, read, update, delete, clone)
- Parts system (72 parts across 5 categories: Sports, Club Sports, Semi-Racing, Racing, Extreme)
- Tuning system (53 settings across 6 sections: Suspension, Differential, ECU, Performance Adjustment, Aerodynamics)
  - **Gear ratios**: Fixed columns on CarBuild (gear1-20, finalDrive as text, supports up to 20 gears)
  - Preserves formatting (leading/trailing zeros like "2.500")
  - Removed from flexible CarBuildSetting system (Session #22)
- Input types: sliders, dropdowns, number inputs, dual front/rear inputs, ratio inputs
- Quick build creation modal (inline during race/lap time creation)
- Build selector component with multi-select and search
- Foreign key validation for all parts and settings

### Phase 5: Race Management ✅
- Race creation wizard (Select Track → Select Builds → Configure)
- Race editing (add/remove builds, update laps/weather)
- Race-specific leaderboards (filtered to builds in race)
- Multiple builds per car in a single race
- Active race toggle (isActive field)
- Quick toggle on race list page (power button)
- Laps and weather configuration (dry/wet)

### Phase 6: Tonight Page ✅
- Shows all races where `isActive = true`
- Hero section with gradient background and live badge
- Race cards with track, builds, configuration
- Weather icons and laps display
- Empty state with CTA to manage races
- Mobile-optimized layout

### Phase 7: Lap Time Tracking ✅
- Create/delete lap times
- Build-centric: lap times require build selection
- Track selection with search
- Time input (mm:ss.sss format)
- Conditions and notes
- Build info displayed on lap time records
- Inline build creation during lap time entry

### Phase 8: Admin & Security ✅
- User management page (approve/reject pending users)
- Email notifications (admin alerts, user approval/rejection)
- Row Level Security (RLS) on all tables including next_auth schema
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Service role bypass for admin operations

### Phase 9: Polish & UI Consistency ✅
- Mobile responsiveness across all pages
- Global hover system (gt-hover-card, gt-hover-icon-btn, etc.)
- Button variant standardization (ghostBordered, proper hover states)
- Tab hover states
- Cursor pointer on all interactive elements
- Touch targets ≥44px (WCAG compliance)
- Consistent container widths, typography, spacing
- Loading animations (racing wheel theme)

### Phase 10: Deployment ✅
- Vercel deployment configured
- Production database seeded
- Environment variables configured
- Security headers active
- Admin user created

---

## Database Schema

### Users & Auth
- **User** (id, email, role: PENDING/USER/ADMIN, gamertag)
- Account, Session, VerificationToken (NextAuth, next_auth schema)

### GT7 Reference Data
- **Car** (552 cars with manufacturer, year, PP, power, torque, weight, driveType, category)
- **Track** (118 tracks with category, country, length, reverse layouts)
- **PartCategory** (5 categories: Sports, Club Sports, Semi-Racing, Racing, Extreme)
- **Part** (72 parts with FK to PartCategory)
- **TuningSection** (15 sections: Suspension, ECU, Transmission, etc.)
- **TuningSetting** (60 settings with FK to TuningSection, includes inputType, min, max, step, unit)

### Builds
- **CarBuild** (userId, carId, name, description, isPublic)
- **CarBuildUpgrade** (buildId, partId FK → Part, category, part, value)
- **CarBuildSetting** (buildId, settingId FK → TuningSetting, category, setting, value)

### Races
- **Race** (trackId, name, description, laps, weather, isActive, createdById)
- **RaceCar** (raceId, carId, buildId NOT NULL — junction table)

### Lap Times
- **LapTime** (userId, trackId, carId, buildId, timeMs, conditions, notes)

### Security
- RLS enabled on all user data tables
- RLS enabled on next_auth schema tables
- Users can only access their own data
- Public read access for reference data (cars, tracks, parts, settings)
- Service role bypasses RLS for admin operations

---

## 📊 Database Counts

| Table | Count | Status |
|-------|-------|--------|
| Cars | 552 | ✅ |
| Tracks | 118 | ✅ |
| PartCategory | 5 | ✅ |
| Part | 72 | ✅ |
| TuningSection | 15 | ✅ |
| TuningSetting | 60 | ✅ |
| Users | Active | ✅ |
| Races | Active | ✅ |
| CarBuilds | Active | ✅ |
| LapTimes | Active | ✅ |

---

## 🔜 Remaining Work

### Low Priority
1. **Global Leaderboards Page** — Cross-race leaderboard view
2. **Build Comparison** — Compare two builds side-by-side
3. **Admin Dashboard** — Statistics and data management
4. **Data Visualizations** — Lap time progress charts
5. **Build Ratings/Favorites** — Community engagement
6. **Redis Integration** — Production-ready rate limiting (currently using in-memory)

---

## Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# Admin
DEFAULT_ADMIN_EMAIL="admin@yourdomain.com"
```

---

## GT7 Data Sources

- **Cars CSV**: https://ddm999.github.io/gt7info/data/db/cars.csv
- **Tracks List**: https://www.gran-turismo.com/gb/gt7/tracklist/
- **Lobby Settings**: https://www.gran-turismo.com/us/gt7/manual/multiplayer/02

---

## Development Logs

For detailed session-by-session progress, see:
- [`docs/SESSION-LOG.md`](SESSION-LOG.md) — Development session history (17 sessions)
- [`docs/DATABASE-SCHEMA.md`](DATABASE-SCHEMA.md) — Complete database structure
- [`docs/DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) — UI/UX design system and patterns

---

## Key Milestones

| Date | Session | Accomplishment |
|------|---------|----------------|
| 2026-01-24 | #22 | Fixed gear columns implementation - migrated from CarBuildSetting to direct CarBuild columns, support for 20 gears, preserved formatting |
| 2026-01-24 | #21 | Build detail page layout refinement - consistent item heights (72px), transmission 50% width, orange badges on all parts |
| 2026-01-24 | #20 | Build detail page improvements - front/rear labels, units, gear ordering, orange values, responsive layout |
| 2026-01-24 | #19 | Tuning input validation fix - allow decimals, negatives, text |
| 2026-01-24 | #18 | Zod validation, error handling, Suspense/error boundaries, rate limiting |
| 2026-01-24 | #17 | UI consistency standardization with reusable layout components |
| 2026-01-21 | #16 | Edit page unification, hover visibility improvements |
| 2026-01-21 | #15 | Global hover system, button/badge standardization |
| 2026-01-19 | #14 | Project cleanup, Tonight page redesign, mobile audit |
| 2026-01-19 | #13 | Build-centric lap times, builds page layout update |
| 2026-01-19 | #12 | Remove run lists, implement active races system |
| 2026-01-19 | #11 | Build-centric race system polish, UX improvements |
| 2026-01-19 | #10 | Build-centric race system complete implementation |
| 2026-01-17 | #9 | Build-centric architecture pivot |
| 2026-01-15 | #8 | Security audit, CSP headers |
| 2026-01-14 | #7 | RLS security fixes |
| 2026-01-13 | #6 | User approval system |
| 2026-01-13 | #5 | Auth system investigation |
| 2026-01-05 | #4 | Car builds & tuning system |

---

## Historical Architecture Notes

### Run Lists (Removed in Session #12)
Run lists were originally a concept for organizing race night sessions. They were replaced with a simpler "active races" system where races have an `isActive` toggle and the Tonight page shows all active races directly.

### Combo Pages (Removed in Session #14)
The `/combos/[carSlug]/[trackSlug]` pages were originally the central hub showing all data for a car+track pairing. This concept was replaced by the build-centric race detail pages.

### Cars/Tracks Browsing Pages (Removed in Session #14)
The `/cars` and `/tracks` browsing pages were removed from navigation as they weren't core to the build-centric workflow. The API endpoints still exist for data access.
