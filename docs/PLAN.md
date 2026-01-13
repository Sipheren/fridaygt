# FridayGT Implementation Plan

## Project Overview
Building a web application for a racing group that's been doing Friday racing for 15 years (Forza Motorsport) and now transitioning to Gran Turismo 7 on PlayStation.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Authentication**: NextAuth.js v5 with Supabase adapter
- **Database**: Supabase Postgres (free tier: 500MB)
- **Email**: Resend (free tier: 3,000 emails/month)
- **UI**: Tailwind CSS, shadcn/ui, Framer Motion, Lucide icons
- **Forms**: React Hook Form with Zod validation
- **State**: React Context, TanStack Query
- **Tables**: TanStack Table

## Core Requirements

1. **User Management**: Multi-user accounts with email verification, approval workflow, role-based access
2. **Lap Time Tracking**: Personal lap records per track/car, manual entry, leaderboards
3. **Car Builds & Tuning**: Save and share car setups with full GT7 upgrades and tuning settings (fills gap where GT7 lacks tune sharing)
4. **Session Management**: Create "night run lists", select combos for racing nights, assign suggested builds
5. **GT7 Integration**: Complete track database (118 tracks), complete car database (552 cars), all multiplayer lobby settings
6. **UI/UX**: GT-inspired clean design, mobile-first, simple and intuitive

---

## 🔗 SYSTEM INTEGRATION OVERVIEW

**Core Concept**: Everything in FridayGT revolves around **Car + Track Combinations (internally "Combos", user-facing "Races")**. The combo/race is the central hub that connects lap times, run lists, builds, and all other features.

**Note**: As of 2026-01-11, the UI terminology has been updated from "combo" to "race" for better user-friendliness, while "combo" remains the technical term in code and documentation.

### How Everything Connects

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAR + TRACK COMBO                        │
│                    /combos/[carSlug]/[trackSlug]                │
│                                                                 │
│  The Combo Page is the CENTRAL HUB showing:                    │
│  • All lap times for this specific combination                 │
│  • Leaderboard for this combo (all users)                      │
│  • All run lists that include this combo                       │
│  • Suggested builds for this combo                             │
│  • Quick add lap time (pre-filled)                             │
└─────────────────────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
        ┌───────▼───────┐ ┌──────▼──────┐ ┌───────▼────────┐
        │  TRACK PAGE   │ │   CAR PAGE   │ │  RUN LISTS     │
        │  /tracks/[s]  │ │  /cars/[s]   │ │  /run-lists    │
        └───────────────┘ └──────────────┘ └────────────────┘
                │                 │                 │
        Shows for THIS   Shows for THIS    Shows all combos
        track:           car:               in the list:
        • Lap times      • Lap times       • Track + Car
        • All cars       • All tracks      • Lobby Settings
        • Run lists      • Run lists       • Suggested Build
        • Click car →    • Click track →   • Click entry →
          go to combo      go to combo       go to combo
```

### Navigation Flow Examples

**Example 1: From Track Page to Combo**
1. User visits `/tracks/nurburgring-nordschleife`
2. Track page shows "Your Lap Times" section with all cars driven on this track
3. User clicks on "Porsche 911 GT3 RS" card
4. **Navigates to** `/combos/911-gt3-rs-992-22/nurburgring-nordschleife`
5. Combo page shows all lap times, run lists, and builds for this exact pairing

**Example 2: From Run List to Combo**
1. User visits `/run-lists/friday-night-42`
2. Run list shows 10 combos (track + car entries)
3. User clicks on "Entry 3: Spa-Francorchamps • McLaren 720S"
4. **Navigates to** `/combos/720s-20/spa-francorchamps`
5. Combo page shows this combo is used in "Friday Night #42" and 3 other run lists

**Example 3: Adding Lap Time from Session**
1. Active session: "Tonight's Run" is live at `/tonight`
2. Current combo: Brands Hatch • Porsche 911 GT3 RS
3. User clicks "Add Lap Time" button
4. Form pre-fills: track = Brands Hatch, car = 911 GT3 RS, session = Tonight's Run
5. User enters time (1:23.456), selects build (optional), adds notes
6. **On save**:
   - Lap time is linked to session, combo, and build
   - Redirects to `/combos/911-gt3-rs-992-22/brands-hatch`
   - Shows new lap time in combo history

### Data Relationships

**Lap Time Entity**:
```typescript
LapTime {
  id: string
  userId: string           // Who set this time
  trackId: string          // Required - which track
  carId: string            // Required - which car
  timeMs: number           // Required - the lap time
  sessionId: string | null // Optional - during which run session
  buildId: string | null   // Optional - which car build was used
  notes: string | null     // Optional - user notes
  conditions: string | null // Optional - weather conditions
  createdAt: Date
}
```

**Run List Entry Entity**:
```typescript
RunListEntry {
  id: string
  runListId: string        // Which run list this belongs to
  order: number            // Position in the list (1, 2, 3...)
  trackId: string          // Required - which track
  carId: string | null     // Optional - which car (can be "any car")
  buildId: string | null   // Optional - suggested build for this combo
  lobbySettingsId: string | null // Optional - lobby settings for this race
  notes: string | null     // Optional - notes about this entry
}
```

**Car Build Entity**:
```typescript
CarBuild {
  id: string
  userId: string           // Who created this build
  carId: string            // Which car this build is for
  name: string             // Build name (e.g., "Spa Hotlap Setup")
  description: string      // Details about the build
  isPublic: boolean        // Can others see/clone this build?

  // Associated data:
  upgrades: []             // All parts/upgrades installed
  settings: []             // All tuning settings (suspension, LSD, etc.)

  // Links to:
  - lapTimes: []           // All lap times set using this build
  - runListEntries: []     // All run list combos suggesting this build
}
```

### Integration Points by Feature

**1. Track Detail Pages** (`/tracks/[slug]`)
- Shows all lap times FOR THIS TRACK (by any user or filtered to current user)
- Groups lap times by car (combo cards)
- Shows all run lists that include this track
- Each car card is **clickable** → navigates to combo page
- Quick add button pre-fills track

**2. Car Detail Pages** (`/cars/[slug]`)
- Shows all lap times FOR THIS CAR (by any user or filtered to current user)
- Groups lap times by track (combo cards)
- Shows all run lists that include this car
- Shows all builds for this car
- Each track card is **clickable** → navigates to combo page
- Quick add button pre-fills car

**3. Combo Pages** (`/combos/[carSlug]/[trackSlug]`)
- **THE CENTRAL HUB** - shows everything for this specific pairing:
  - Full lap time history for this combo
  - Personal best highlighting
  - Leaderboard (all users for this combo)
  - All run lists using this combo
  - Suggested builds for this combo
  - Quick add lap time (both pre-filled)
- Click run list → go to `/run-lists/[id]`
- Click build → go to `/builds/[id]`

**4. Run List Pages** (`/run-lists/[id]`)
- Shows all combos in the list (track + car + lobby settings)
- Each entry shows suggested build (if any)
- Each entry is **clickable** → navigates to combo page
- Can create a session from this run list

**5. Session Pages** (`/tonight`, `/sessions/[id]`)
- Shows active run list with progress indicator
- Current combo is highlighted
- Quick add lap time for current combo (auto-links to session)
- Mobile-optimized for race night use

**6. Build Pages** (`/builds/[id]`)
- Shows all details of the build (upgrades, tuning settings)
- Shows all lap times achieved with this build
- Shows all run list entries suggesting this build
- Can clone if public

### Key User Journeys

**Journey 1: Recording a Lap Time**
```
Start → /lap-times/new
      → Select track: Spa-Francorchamps
      → Select car: McLaren 720S
      → Enter time: 2:15.678
      → (Optional) Select build: "Spa Hotlap Setup"
      → (Optional) Link to session: "Tonight's Run"
      → Save
      → Redirect to /combos/720s-20/spa-francorchamps
      → See new lap time in combo history, check if it's a PB
```

**Journey 2: Preparing for Race Night**
```
Start → /run-lists
      → Create new run list "Friday Night #45"
      → Add Entry 1: Track = Brands Hatch, Car = Porsche 911 GT3 RS, Suggested Build = "Brands Setup"
      → Add Entry 2: Track = Spa, Car = McLaren 720S, Suggested Build = "Spa Hotlap"
      → Add Entry 3: Track = Nurburgring Nordschleife, Car = Any
      → Save run list
      → On race night: Start session from this run list
      → Session page shows combos in order, track current position
```

**Journey 3: Sharing a Build**
```
Start → /builds/new
      → Select car: Porsche 911 GT3 RS
      → Name: "Nurburgring Nordschleife Perfect Setup"
      → Add upgrades (racing suspension, racing brakes, etc.)
      → Configure tuning (suspension, LSD, gearing)
      → Mark as public
      → Save
      → Share link with racing group
      → Others can clone and use for their laps
```

---

## Database Schema

### Users & Auth
- User (id, email, role: PENDING/USER/ADMIN)
- Account, Session, VerificationToken (NextAuth)

### GT7 Data
- Track (118 total configurations)
- Car (552 cars with full specs)
- LobbySettings (all GT7 multiplayer options)

### Lap Times
- LapTime (userId, trackId, carId, timeMs, sessionId, buildId)

### Car Builds & Tuning
- CarBuild (userId, carId, name, description, isPublic)
- CarBuildUpgrade (buildId, category, part, value)
- CarBuildSetting (buildId, category, setting, value)

### Sessions
- RunList (collections of track/car combos)
- RunListEntry (individual combo in a run list, buildId, raceId)
- RunSession ("Tonight's Run" active session)
- SessionAttendance (who attended which session)

### Race Entity (NEW - 2026-01-12)
- Race (central entity for track + car combinations)
- RaceCar (junction table linking cars/builds to races)
- RunListEntry.raceId (foreign key to Race)

### Audit
- RunListEdit (track all edits for collaboration)

---

## PHASE 1: Foundation & Setup ✅ COMPLETE

**Goals**: Initialize project, database, authentication

**Key Tasks**:
- [x] Create Next.js 14 app with TypeScript + Tailwind
- [x] Install all dependencies (Prisma, NextAuth, shadcn/ui, etc.)
- [x] Set up Supabase Postgres database
- [x] Create complete database schema (14 tables via SQL)
- [x] Run initial migration
- [x] Set up Resend email service
- [x] Configure NextAuth.js with email provider
- [x] Build login/register pages
- [x] Implement account approval workflow
- [x] Create seed data (tracks.json, cars.json from GT7 sources)
- [x] Run database seed (118 tracks, 552 cars)

**Critical Files**:
- ✅ `/init.sql` - Complete database schema
- ✅ `/src/lib/auth.ts` - NextAuth config with role-based access
- ✅ `/src/lib/supabase/client.ts` - Supabase browser client
- ✅ `/src/lib/supabase/server.ts` - Supabase server client
- ✅ `/.env` - Environment variables

**Deliverable**: ✅ Working authentication system with approval flow, seeded database

---

## PHASE 2: Core Layout & UI Components ✅ COMPLETE

**Goals**: Build responsive layouts, design system

**Key Tasks**:
- [x] Install shadcn/ui components (Button, Card, Dialog, Form, Input, Select, Table)
- [x] Configure GT-inspired Tailwind theme (racing colors, clean aesthetic)
- [x] Build Header component with logo + user menu
- [x] Create responsive MobileNav for mobile-first experience
- [x] Build dashboard layout with navigation
- [x] Dark/Light mode with default dark
- [x] GT7-inspired color palette (red, teal, orange, blue)
- [x] Professional sim racing aesthetic

**Critical Files**:
- ✅ `/tailwind.config.ts` - GT color palette
- ✅ `/src/app/globals.css` - GT-inspired theme colors
- ✅ `/src/components/header.tsx` - Responsive header with nav
- ✅ `/src/components/theme-provider.tsx` - Dark/light mode
- ✅ `/src/app/layout.tsx` - Root layout with header
- ✅ `/src/app/page.tsx` - Dashboard homepage

**Deliverable**: ✅ Responsive layouts working on mobile and desktop

---

## PHASE 3: GT7 Data Browsing ⚠️ PARTIALLY COMPLETE

**Goals**: Display tracks and cars, enable browsing, add images

**Part 1: Basic Browsing ✅ COMPLETE**
- [x] Create track API routes (GET /api/tracks, GET /api/tracks/[slug])
- [x] Build TrackCard component
- [x] Create tracks listing page with search/filter
- [x] Build track detail page with stats and layout information
- [x] Create car API routes (GET /api/cars, GET /api/cars/[slug])
- [x] Build CarCard component
- [x] Create cars listing page with search by manufacturer, category, drivetrain
- [x] Build car detail page with performance specs
- [x] Add clickable navigation from listing to detail pages
- [x] Fix Next.js 14 async params compatibility

**Part 2: Images & Media ❌ NOT STARTED**
- [ ] Research GT7 image sources (official sites, fan wikis, databases)
- [ ] Create image fetching strategy:
  - [ ] Option 1: Web search for each track/car + manual verification
  - [ ] Option 2: Use existing GT7 image databases/APIs
  - [ ] Option 3: Generate placeholder images with AI
- [ ] Create `/src/lib/images.ts` utility for image management
- [ ] Add image fetching script:
  - [ ] Fetch/generate images for all 118 tracks
  - [ ] Fetch/generate images for all 552 cars
  - [ ] Store images in `/public/images/tracks/` and `/public/images/cars/`
  - [ ] OR use external CDN/storage (Cloudinary, Supabase Storage)
- [ ] Update database with imageUrl values:
  - [ ] Batch update Track table with image paths
  - [ ] Batch update Car table with image paths
- [ ] Update UI components to display images:
  - [ ] TrackCard shows track image
  - [ ] CarCard shows car image
  - [ ] Track detail page shows larger track image
  - [ ] Car detail page shows larger car image
- [ ] Add image optimization (Next.js Image component)
- [ ] Add fallback placeholders for missing images
- [ ] Create admin tools for manual image upload/update

**Image Sources to Explore**:
- Gran Turismo official website: https://www.gran-turismo.com/
- GT Planet (fan site with extensive image galleries)
- GT7 Info Database: https://ddm999.github.io/gt7info/
- Google Image Search with specific queries
- AI image generation for missing/placeholder images

**Critical Files**:
- ✅ `/src/app/api/tracks/route.ts` - Tracks listing API
- ✅ `/src/app/api/tracks/[slug]/route.ts` - Individual track API
- ✅ `/src/app/api/cars/route.ts` - Cars listing API
- ✅ `/src/app/api/cars/[slug]/route.ts` - Individual car API
- ✅ `/src/app/tracks/page.tsx` - Tracks listing with filters
- ✅ `/src/app/tracks/[slug]/page.tsx` - Track detail page
- ✅ `/src/app/cars/page.tsx` - Cars listing with filters
- ✅ `/src/app/cars/[slug]/page.tsx` - Car detail page
- `/src/lib/images.ts` - Image fetching and management utilities
- `/scripts/fetch-track-images.ts` - Script to fetch track images
- `/scripts/fetch-car-images.ts` - Script to fetch car images

**Deliverable**: Browse all GT7 tracks and cars with full detail pages and images

---

## PHASE 4: Lap Time Tracking ⚠️ PARTIALLY COMPLETE

**Goals**: Core feature - enter and view lap times, integrate with tracks/cars/sessions

**Background**: Lap times are the central feature that connects everything. Users record times for car+track combinations, optionally during run list sessions with specific builds. These times should be visible on track pages, car pages, and combo pages.

**Part 1: Basic Lap Time CRUD ⚠️ PARTIALLY COMPLETE**
- [x] Create lap time API routes (POST, GET, DELETE)
- [x] Fix column name mismatch (layout vs layoutName)
- [x] Fix SelectItem empty value error in conditions field
- [x] Create admin user in database for testing
- [x] Build LapTimeForm component (track selector, car selector, time input mm:ss.sss)
- [x] Create time parsing utilities (mm:ss.sss format, validation)
- [x] Build lap time entry page
- [x] Create "My Lap Times" page with search, delete, PB detection
- [x] Test lap time creation through UI
- [ ] **CRITICAL: Add lap time edit functionality** - Currently lap times cannot be edited (only created/deleted)
  - [ ] Add PATCH endpoint to `/api/lap-times/[id]/route.ts`
  - [ ] Create edit page at `/lap-times/[id]/edit`
  - [ ] Add "Edit" button to lap time cards/rows
  - [ ] Pre-populate LapTimeForm with existing lap time data
  - [ ] Update lap time record with new values (time, notes, conditions, build)

**Part 2: Track Page Integration ✅ COMPLETED**
- [x] Update track detail page to show lap times for this track
- [x] Create TrackLapTimes component with the following sections:
  - [x] **Personal Best Times**: User's best times for each car on this track
  - [x] **Recent Lap Times**: User's most recent laps on this track (last 5 per car)
  - [x] **Quick Add**: Button to add new lap time for this track (pre-select track)
  - [x] **View Combo**: Button on each car card to navigate to combo page
- [x] Add API route GET /api/tracks/[slug]/lap-times (with car filter, user filter)
- [x] Show car+track combo statistics (total laps, fastest lap overall, avg time)

**Part 3: Car Page Integration ✅ COMPLETED**
- [x] Update car detail page to show lap times for this car
- [x] Create CarLapTimes component with the following sections:
  - [x] **Personal Best Times**: User's best times for each track with this car
  - [x] **Recent Lap Times**: User's most recent laps with this car (last 5 per track)
  - [x] **Quick Add**: Button to add new lap time for this car (pre-select car)
  - [x] **View Combo**: Button on each track card to navigate to combo page
- [x] Add API route GET /api/cars/[slug]/lap-times (with track filter, user filter)
- [x] Show car statistics (total laps, tracks driven, fastest time overall)

**Part 4: Car+Track Combo Page ✅ CORE COMPLETED**

**THE CENTRAL HUB** - The combo page is where everything comes together. It aggregates all data related to a specific car+track pairing.

- [x] Create combo API route GET /api/combos/[carSlug]/[trackSlug]
  - [x] Fetch car and track data
  - [x] Get all lap times for this combo (all users)
  - [x] Calculate combo statistics (best time, average, total laps)
  - [x] Calculate leaderboard (best time per user)
  - [x] Get user's personal best for this combo
  - [x] Fetch all run list entries using this combo ✅ COMPLETED
  - [x] Get all builds used on this combo ✅ COMPLETED (Phase 5)
  - [x] Return aggregated data in single response

- [x] Build ComboDetailPage component at /combos/[carSlug]/[trackSlug]

- [x] **Section 1: Combo Header**
  - [x] Large display of car name and track name (in cards)
  - [x] Links to car and track detail pages
  - [x] Combo statistics overview:
    - [x] Total laps recorded (all users)
    - [x] Fastest time overall (world record)
    - [x] Average time
    - [x] Number of drivers who've driven this combo
  - [x] Quick action buttons:
    - [x] "Add Lap Time" (pre-filled with car + track)
    - [x] "Back" navigation button

- [x] **Section 2: User Performance Card** (if user has lap times)
  - [x] Total laps for this combo
  - [x] Personal best time
  - [x] Average time
  - [x] Gap to world record (#1)
  - [x] Leaderboard position badge
  - [ ] Link to full lap time history (future enhancement)

- [x] **Section 3: User's Recent Laps** (dedicated card)
  - [x] Shows last 10 laps for this combo
  - [x] Personal best highlighted with trophy icon
  - [x] Displays time, conditions badge, and date
  - [x] Build used ✅ COMPLETED (Phase 5)
  - [ ] Session linked (pending Phase 6)
  - [ ] Edit/delete actions (future enhancement)

- [x] **Section 4: Leaderboard**
  - [x] Shows all users' best times for this combo
  - [x] Columns: Position, User, Time, Laps Count
  - [x] Top 3 positions highlighted with trophy icons (gold, silver, bronze)
  - [x] Current user's position highlighted
  - [x] Delta from #1 shown for all positions
  - [x] Shows top 10 with indicator if more drivers exist
  - [ ] Filter options (future enhancement)
  - [ ] Full pagination (future enhancement)

- [~] **Section 5: Recent Activity** - REMOVED 2026-01-11
  - Decided to remove this section to reduce clutter
  - User's recent laps section provides sufficient personal history
  - Leaderboard provides sufficient community activity view

- [x] **Section 6: Run Lists Using This Race** ✅ COMPLETED
  - [x] Shows all run lists featuring this car+track combination
  - [x] Supports multiple cars per run list entry
  - [x] Links to run list detail pages
  - [x] Enhanced empty state with circular icon and gradient
  - [x] "Create Run List" button for easy list creation

- [x] **Section 7: Suggested Builds** ✅ COMPLETED
  - [x] Shows all builds used on this race (car+track combo)
  - [x] Displays build name, description, and creator
  - [x] Links to build detail pages
  - [x] "Create Build" button for easy build creation (pre-fills car)
  - [x] Enhanced empty state with circular icon and gradient

- [x] **Design & Layout Improvements** ✅ COMPLETED (2026-01-11)
  - [x] Enhanced car and track cards with gradient backgrounds and colored borders
  - [x] Improved statistics cards with gradients and larger text (text-4xl)
  - [x] Enhanced user performance card with gradient and border-2
  - [x] Improved leaderboard styling with gradient header and enhanced rows
  - [x] Enhanced user's recent laps with gradient header and best time highlighting
  - [x] Unified run lists and builds section styling with colored gradient headers
  - [x] Improved empty states with circular icons and gradient backgrounds
  - [x] Better spacing throughout (gap-6, p-4 padding)
  - [x] Enhanced hover effects with shadows (hover:shadow-lg)
  - [x] Consistent design language with border-2 and opacity patterns

- [ ] **Section 8: Race Insights** (Future Enhancement)
  - [ ] Data visualizations and statistics:
    - [ ] Your lap time progress chart (times over date)
    - [ ] Best lap by car category (if multiple cars match)
    - [ ] Most popular build for this combo
    - [ ] Fastest sectors (if sector data available in future)
    - [ ] Weather condition comparison (if enough data)

- [x] Make race/combo page accessible from other pages: ✅ COMPLETED
  - [x] Track detail page: car cards in lap times section clickable
  - [x] Car detail page: track cards in lap times section clickable
  - [x] Run list detail page: entry cards clickable (UI pending)
  - [x] Lap time form: after saving, redirects to combo page

**Example Navigation Flows**:
```
From Track Page:
/tracks/nurburgring-nordschleife
  → Lap Times section shows cars driven here
  → Click "Porsche 911 GT3 RS" card
  → /combos/911-gt3-rs-992-22/nurburgring-nordschleife

From Car Page:
/cars/911-gt3-rs-992-22
  → Lap Times section shows tracks driven on
  → Click "Nurburgring Nordschleife" card
  → /combos/911-gt3-rs-992-22/nurburgring-nordschleife

From Run List:
/run-lists/friday-night-45
  → Entry 3: Nurburgring Nordschleife • Porsche 911 GT3 RS
  → Click entry card
  → /combos/911-gt3-rs-992-22/nurburgring-nordschleife
  → Combo page shows "Used in Friday Night #45" in Run Lists section

From Lap Time Form:
/lap-times/new
  → Select Nurburgring Nordschleife
  → Select Porsche 911 GT3 RS
  → Enter time: 7:15.234
  → Save
  → Redirect to /combos/911-gt3-rs-992-22/nurburgring-nordschleife
  → New lap time appears in "Your Lap Times" section
```

**Part 5: Leaderboards & Personal Records ❌ NOT STARTED**
- [ ] Create LapTimeService for personal records calculation
- [ ] Build Leaderboard component with TanStack Table (sortable, filterable)
- [ ] Add combo-based leaderboard (fastest for each car+track)
- [ ] Build PersonalRecords component (best per track, best per combo, best per car)
- [ ] Create global leaderboard page (/leaderboards)
- [ ] Add leaderboard filtering: by track, by car, by combo, by user, by date range
- [ ] Show position badges (1st, 2nd, 3rd with trophy icons)

**Part 6: Session Integration (depends on Phase 6) ❌ NOT STARTED**
- [ ] Add sessionId to lap time creation (optional - "from tonight's run")
- [ ] Update LapTimeForm to optionally link to active session
- [ ] Show session context on lap time records ("Recorded during Friday Night Run #42")
- [ ] Add session filter to lap time queries
- [ ] Build SessionLapTimes component for session detail pages
- [ ] Create "Add Lap from Session" flow during active sessions

**Part 7: Build Integration (depends on Phase 5) ❌ NOT STARTED**
- [ ] Add buildId to lap time creation (optional - "which build did you use?")
- [ ] Update LapTimeForm to include build selector
- [ ] Show build info on lap time records ("Using [Build Name]")
- [ ] Add build filter to lap time queries
- [ ] Create BuildLapTimes component showing all times with a specific build
- [ ] Add "Best lap with this build" statistics

**Critical Files**:
- ✅ `/src/app/api/lap-times/route.ts` - Main lap time CRUD
- ✅ `/src/app/api/lap-times/[id]/route.ts` - Delete individual lap time
- ✅ `/src/components/lap-times/LapTimeForm.tsx` - Lap time entry form
- ✅ `/src/app/lap-times/page.tsx` - My lap times listing
- ✅ `/src/app/lap-times/new/page.tsx` - New lap time page
- ✅ `/src/lib/time.ts` - Time formatting utilities
- `/src/app/api/tracks/[slug]/lap-times/route.ts` - Track lap times API
- `/src/app/api/cars/[slug]/lap-times/route.ts` - Car lap times API
- `/src/app/api/combos/[carId]/[trackId]/route.ts` - Combo data API
- `/src/components/lap-times/TrackLapTimes.tsx` - Track page lap times section
- `/src/components/lap-times/CarLapTimes.tsx` - Car page lap times section
- `/src/components/lap-times/Leaderboard.tsx` - Leaderboard table component
- `/src/app/combos/[carSlug]/[trackSlug]/page.tsx` - Combo detail page
- `/src/app/leaderboards/page.tsx` - Global leaderboards page
- `/src/services/lap-time.service.ts` - Lap time business logic

**Deliverable**: Full lap time tracking with personal records, leaderboards, and integration with tracks, cars, combos, sessions, and builds

---

## PHASE 5: Car Builds & Tuning ⚠️ IN PROGRESS

**Goals**: Create, save, and share car builds/tunes with full GT7 upgrade and tuning settings

**Background**: GT7 doesn't provide native tune sharing, so this web app becomes the central hub for the racing group to share setups. Each build includes all upgrades (parts) and detailed tuning settings (suspension geometry, LSD, gearing, etc.) that can be assigned to specific car/track combos in sessions.

**Database Schema**: ✅ COMPLETED
- ✅ CarBuild table created (builds with name, description, isPublic)
- ✅ CarBuildUpgrade table created (parts/upgrades per build)
- ✅ CarBuildSetting table created (tuning settings per build)
- ✅ RunListEntry table created (for Phase 6, with buildId support)
- ✅ buildId column added to LapTime table
- ✅ All indexes created for query optimization

**Key Tasks**:

**Part 1: GT7 Data Research** ✅ COMPLETED
- [x] Research and document all GT7 upgrade categories and parts
- [x] Document all tuning settings available in GT7 (suspension, LSD, gearing, etc.)
- [x] Create JSON data files with all upgrade options per category
- [x] Create JSON data files with all tuning setting ranges and defaults

**Created Data Files**:
- ✅ `/src/data/gt7-upgrades.json` - Comprehensive GT7 upgrade parts database
  - Engine upgrades (air filters, ECU, intake, throttle, stages 1-5, bore/stroke)
  - Turbo & Supercharger (low/medium/high/ultra-high RPM variants)
  - Exhaust (mufflers, manifolds, catalytic converters)
  - Transmission (clutches, propeller shafts, 5/6/7/8-speed transmissions)
  - Suspension (sports soft/medium/hard, height-adjustable, racing, customizable)
  - Brakes (pads, calipers, carbon ceramic)
  - Drivetrain (LSD variants, torque vectoring)
  - Weight reduction (stages 1-5, carbon parts)
  - Body & rigidity (roll cage, wide body)
  - Tires (comfort, sports, racing, wet, dirt, snow)
  - Aerodynamics (splitters, wings, undertrays)
  - Other (nitrous, ballast, power restrictor)

- ✅ `/src/data/gt7-tuning.json` - Complete GT7 tuning settings database
  - Power settings (power restrictor, ECU output, nitrous duration)
  - Suspension (ride height, natural frequency, damping, anti-roll bars, camber, toe)
  - LSD (initial torque, acceleration/braking sensitivity for front/rear)
  - Transmission (final gear, top speed, individual gear ratios 1-8)
  - Downforce (front/rear aerodynamic settings)
  - Brakes (brake balance controller)
  - Ballast (weight and position)
  - Torque distribution (AWD front/rear split)

**Part 2: Build Management API** ✅ COMPLETED
- [x] Create car build API routes (POST, GET, PATCH, DELETE /api/builds)
- [x] Build API route for user's builds (GET /api/builds?myBuilds=true)
- [x] Build API route for public builds (GET /api/builds?public=true)
- [x] Build API route for builds by car (GET /api/builds?carId=[id])
- [x] Implement build cloning (POST /api/builds/[id]/clone)
- [x] Build statistics (lap time count, fastest/average times, unique tracks)

**Created API Routes**:
- ✅ `GET /api/builds` - List builds with filtering (carId, userId, public, myBuilds)
- ✅ `POST /api/builds` - Create new build with upgrades and settings
- ✅ `GET /api/builds/[id]` - Get build details with statistics
- ✅ `PATCH /api/builds/[id]` - Update build (owner only)
- ✅ `DELETE /api/builds/[id]` - Delete build (owner only)
- ✅ `POST /api/builds/[id]/clone` - Clone public build

**Testing**:
- ✅ Created test script (`test-build-api.ts`)
- ✅ Successfully created test build with 3 upgrades and 4 tuning settings
- ✅ Verified database queries work correctly
- ✅ Confirmed public/private build filtering works
- ✅ **Browser Testing**: All builds pages working correctly (listing, detail, create, edit)

**Part 3: Build Editor UI** ✅ COMPLETED
- [x] Create `/src/app/builds/page.tsx` - Builds listing page
- [x] Create `/src/app/builds/new/page.tsx` - New build form
- [x] Create `/src/app/builds/[id]/page.tsx` - Build detail/view page
- [x] Create `/src/app/builds/[id]/edit/page.tsx` - Build edit page
- [x] Create BuildCard component (preview card for listings) - Inline in page
- [x] Create BuildEditor component with tabbed interface - Integrated in new/edit pages
- [x] Build UpgradesTab component (select parts by category) - All 100+ parts with checkboxes
- [x] Build TuningTab component (all tuning settings with sliders/inputs) - All 40+ settings
  - [x] Suspension settings (ride height, spring rate, dampers, anti-roll, camber, toe)
  - [x] LSD settings (initial torque, acceleration, deceleration)
  - [x] Gearing settings (final drive, individual gears, top speed)
  - [x] Downforce settings (front/rear)
  - [x] Brake balance
  - [x] Power settings (power restrictor, ECU output, nitrous)
  - [x] Ballast settings (weight, position)
  - [x] Torque distribution (AWD)
- [x] Build build preview/summary component - Integrated in detail page
- [x] Create build save/update form with name and description
- [x] Add public/private toggle for build sharing
- [x] Add "Builds" navigation link to header menu
- [x] Install required shadcn components (separator, tabs, checkbox, slider)

**Part 4: Build Library & Browsing** ✅ COMPLETED
- [x] Create "My Builds" page (user's saved builds) - Filter in /builds
- [x] Build "Public Builds" page (community shared builds) - Filter in /builds
- [x] Add build cards with car, name, creator, stats - All included
- [x] Implement build search/filter by car, creator, track preference
- [x] Build BuildDetailView component (read-only view of build)
- [x] Add clone button for public builds
- [x] Add edit button (owner only)
- [x] Add delete button (owner only)
- [x] Show build statistics (total laps, fastest/average time, unique tracks)

**Part 5: Integration with Lap Times & Sessions** ✅ COMPLETED
- [x] Add build selector to LapTimeForm (optional "which build did you use?")
- [x] Show build info on lap time records and leaderboards
- [x] Create "Builds for this Car" section on car detail pages
- [x] Create "Builds Used on this Track" section on track detail pages
- [x] Update "Suggested Builds" section on combo detail pages (shows builds used for this combo)
- [x] Update lap times API to include build data
- [ ] Add build selector to RunListEntry form (suggest a build for this combo) - Pending Phase 6
- [ ] Display suggested build on session combo cards - Pending Phase 6

**Part 6: Build Sharing Features**
- [ ] Add share button to generate shareable build link
- [ ] Build build comparison tool (compare two builds side-by-side)
- [ ] Add build ratings/favorites (optional)
- [ ] Create build comments/notes (optional)

**Critical Files**:
- ✅ `/src/app/api/builds/route.ts` - Build CRUD API
- ✅ `/src/app/api/builds/[id]/route.ts` - Individual build API
- ✅ `/src/app/api/builds/[id]/clone/route.ts` - Clone build API
- ✅ `/src/app/builds/page.tsx` - Builds library page (all/public/my builds filters)
- ✅ `/src/app/builds/[id]/page.tsx` - Build detail/view page
- ✅ `/src/app/builds/[id]/edit/page.tsx` - Build edit page
- ✅ `/src/app/builds/new/page.tsx` - Create new build page (with carId pre-fill support)
- ✅ `/src/data/gt7-upgrades.json` - GT7 upgrade parts data
- ✅ `/src/data/gt7-tuning.json` - GT7 tuning settings data
- ✅ `/src/components/header.tsx` - Updated with Builds navigation link
- ✅ `/src/components/ui/separator.tsx` - Added from shadcn
- ✅ `/src/components/ui/tabs.tsx` - Added from shadcn
- ✅ `/src/components/ui/checkbox.tsx` - Added from shadcn
- ✅ `/src/components/ui/slider.tsx` - Added from shadcn
- ✅ `/src/components/builds/CarBuilds.tsx` - Car builds section component
- ✅ `/src/components/builds/TrackBuilds.tsx` - Track builds section component
- ✅ `/src/components/lap-times/LapTimeForm.tsx` - Updated with build selector
- ✅ `/src/components/lap-times/CarLapTimes.tsx` - Updated to show build info
- ✅ `/src/app/api/lap-times/route.ts` - Updated to handle buildId
- ✅ `/src/app/combos/[carSlug]/[trackSlug]/page.tsx` - Updated suggested builds section
- ✅ `/src/app/cars/[slug]/page.tsx` - Updated with builds section
- ✅ `/src/app/tracks/[slug]/page.tsx` - Updated with builds section

**Deliverable**: Complete car build system with upgrade selection, detailed tuning, sharing, and integration with lap times and sessions

---

## PHASE 6: Run Lists & Sessions ⚠️ IN PROGRESS

**Goals**: Create night run lists, manage sessions, integrate with combos and builds

**Background**: Run lists are collections of car+track combos for race nights. Each entry in a run list specifies a track, optional car, lobby settings, and optionally a suggested build. Run lists can be activated as live sessions during race nights, with lap times recorded during sessions automatically linked.

**Part 1: Run List Management ✅ API COMPLETE / ⚠️ UI IN PROGRESS**
- [x] Create run list API routes (POST, GET, PATCH, DELETE /api/run-lists)
- [ ] Build RunListEditor component with drag-and-drop reordering
- [ ] Create RunListEntryForm component:
  - [ ] Track selector (required)
  - [ ] Car selector (optional - can be "any car" for open choice)
  - [ ] Build selector (suggested build for this combo)
  - [ ] Lobby settings selector/creator
  - [ ] Entry notes field
- [x] Create GT7 lobby settings data file (`/src/data/gt7-lobby-settings.json`) - 400+ lines
  - [x] Race types, start types, boost/damage/penalty levels
  - [x] Weather types, time of day, time progression
  - [x] Driving assists (ABS, TCS, ASM, counter-steer)
  - [x] Tire wear, fuel consumption multipliers
  - [x] Penalties, driving line, laps, required tires
  - [x] 4 presets (Quick Race, Endurance, Time Attack, Competitive)
- [x] Create run lists listing page (/run-lists) with search/filter
- [ ] Build run list detail/edit page (/run-lists/[id])
- [ ] Build run list creation page (/run-lists/new)
- [ ] Add entry management UI (add/edit/delete/reorder entries)
- [ ] Implement run list cloning (copy another user's public list)

**Part 2: Run List Display & Navigation ⚠️ PARTIALLY COMPLETE**
- [x] Build RunListCard component (inline in listing page)
  - [x] Shows name, description, public/private badge
  - [x] Shows entry count, creator, creation date
  - [x] Clickable → navigates to detail page
- [ ] Create RunListEntryCard component (individual combo in list):
  - [ ] Shows track name and layout
  - [ ] Shows car (or "Any Car" if open choice)
  - [ ] Shows suggested build name (if any)
  - [ ] Shows lobby settings summary
  - [ ] **Clickable** → navigates to combo page `/combos/[carSlug]/[trackSlug]`
- [ ] Add "Start Session" button to run list detail page
- [ ] Build run list statistics (total entries, total estimated time, most used tracks/cars)
- [ ] Show run list history (past sessions using this list)

**Part 3: Session Management ✅ API COMPLETE / ❌ UI NOT STARTED**
- [x] Create session API routes (POST, GET, PATCH, DELETE /api/sessions)
- [x] Create special `/api/sessions/tonight` endpoint - Get active IN_PROGRESS session
  - [x] Returns current entry based on currentEntryOrder
  - [x] Calculates progress statistics (total, completed, remaining)
- [ ] Create "Tonight's Run" active session page (/tonight):
  - [ ] Mobile-optimized layout for race night
  - [ ] Shows current combo with large, clear display
  - [ ] Progress indicator (Entry 3 of 10)
  - [ ] Next combo preview
  - [ ] Session attendance list
  - [ ] Quick "Add Lap Time" for current combo
- [ ] Build TonightRunDisplay component:
  - [ ] Current combo card (track, car, build, settings)
  - [ ] "Previous" and "Next" navigation buttons
  - [ ] "Join Session" / "Leave Session" buttons
  - [ ] List of who's currently in session
  - [ ] Timer/clock for race night tracking
- [ ] Add session history page (/sessions/[id]) for completed sessions

**Part 4: Session Attendance ✅ API COMPLETE / ❌ UI NOT STARTED**
- [x] Create attendance API routes (GET, POST, DELETE /api/sessions/[id]/attendance)
- [ ] Build AttendanceTracker component:
  - [ ] Shows who's joined the session
  - [ ] Join/leave buttons for current user
  - [ ] Real-time updates (or polling) for attendance changes
  - [ ] Attendance status indicators (present, left, no-show)
- [ ] Add attendance statistics to session history
- [ ] Show personal attendance history on user profile

**Part 5: Integration with Lap Times ❌ NOT STARTED**
- [ ] Update LapTimeForm to show active session (if any)
- [ ] Add "Add Lap from Session" quick flow:
  - [ ] Pre-fills track, car from current combo
  - [ ] Auto-links sessionId
  - [ ] Shows suggested build for quick selection
  - [ ] Simplified mobile-friendly form
- [ ] Show session context on lap time records:
  - [ ] "Recorded during Friday Night Run #42"
  - [ ] Link to session detail page
- [ ] Build SessionLapTimesTable component (all laps from a session)
- [ ] Add session filter to "My Lap Times" page

**Part 6: Integration with Combos & Builds ❌ NOT STARTED**
- [ ] Show run lists using a combo on combo detail page:
  - [ ] Section: "Run Lists Using This Combo"
  - [ ] Shows list name, entry number, suggested build
  - [ ] Clickable → go to run list detail
- [ ] Show suggested builds for combo on combo detail page:
  - [ ] If run list entries suggest builds, show them
  - [ ] "Recommended builds for this combo"
  - [ ] Link to build detail pages
- [ ] Show run list entries on build detail page:
  - [ ] "This build is suggested for: Spa + McLaren 720S in Friday Night #42"
  - [ ] Shows all combos where this build is recommended
- [ ] Update track detail page with run lists section:
  - [ ] "Run Lists Using This Track"
  - [ ] Shows upcoming sessions with this track
- [ ] Update car detail page with run lists section:
  - [ ] "Run Lists Using This Car"
  - [ ] Shows upcoming sessions with this car

**Part 7: Run List Collaboration & Sharing ❌ NOT STARTED**
- [ ] Add public/private toggle for run lists
- [ ] Build RunListAuditLog:
  - [ ] Track all edits (who, what, when)
  - [ ] Show edit history on run list page
  - [ ] Useful for collaborative list building
- [ ] Add "Clone Run List" feature for public lists
- [ ] Create "Community Run Lists" page (browse public lists)
- [ ] Add run list favorites/bookmarks

**Critical Files Created**:

**API Routes (16 endpoints) - ✅ ALL COMPLETE**:
- ✅ `/src/app/api/run-lists/route.ts` - GET/POST run lists
- ✅ `/src/app/api/run-lists/[id]/route.ts` - GET/PATCH/DELETE single run list
- ✅ `/src/app/api/run-lists/[id]/entries/route.ts` - POST/PATCH entries
- ✅ `/src/app/api/run-lists/[id]/entries/[entryId]/route.ts` - DELETE entry with auto-reorder
- ✅ `/src/app/api/sessions/route.ts` - GET/POST sessions
- ✅ `/src/app/api/sessions/[id]/route.ts` - GET/PATCH/DELETE session
- ✅ `/src/app/api/sessions/tonight/route.ts` - GET active session ⭐
- ✅ `/src/app/api/sessions/[id]/attendance/route.ts` - GET/POST/DELETE attendance
- ✅ `/src/data/gt7-lobby-settings.json` - GT7 lobby settings data (400+ lines)

**UI Pages (5 needed) - ⚠️ 1 OF 5 COMPLETE**:
- ✅ `/src/app/run-lists/page.tsx` - Run lists listing with search/filter
- ❌ `/src/app/run-lists/new/page.tsx` - **CRITICAL: Create new run list (NOT STARTED)**
- ❌ `/src/app/run-lists/[id]/page.tsx` - **CRITICAL: Run list detail/edit (NOT STARTED)**
- ❌ `/src/app/tonight/page.tsx` - Active session page (NOT STARTED)
- ❌ `/src/app/sessions/[id]/page.tsx` - Session history (NOT STARTED)

**Components Needed**:
- `/src/components/run-lists/RunListEditor.tsx` - List builder
- `/src/components/run-lists/RunListEntryForm.tsx` - Entry form
- `/src/components/run-lists/LobbySettingsForm.tsx` - Lobby settings
- `/src/components/run-lists/RunListCard.tsx` - List preview card
- `/src/components/run-lists/RunListEntryCard.tsx` - Entry card (clickable to combo)
- `/src/components/sessions/TonightRunDisplay.tsx` - Active session display
- `/src/components/sessions/AttendanceTracker.tsx` - Session attendance
- `/src/components/sessions/SessionLapTimesTable.tsx` - Session lap times
- `/src/app/run-lists/page.tsx` - Run lists listing
- `/src/app/run-lists/[id]/page.tsx` - Run list detail/edit
- `/src/app/run-lists/new/page.tsx` - Create new run list
- `/src/app/tonight/page.tsx` - Active session page (mobile-optimized)
- `/src/app/sessions/[id]/page.tsx` - Session history detail
- `/src/services/session.service.ts` - Session business logic

**Deliverable**: Complete run list system with session management, combo integration, build suggestions, and mobile-optimized race night display

**Navigation Examples**:
```
Example 1: Creating and using a run list
/run-lists → Create "Friday Night #45"
          → Add Entry 1: Brands Hatch + 911 GT3 RS + "Brands Setup" build
          → Add Entry 2: Spa + McLaren 720S + "Spa Hotlap" build
          → Save
          → On race night: Start Session
          → /tonight shows Entry 1 as current combo
          → Click "Add Lap Time" (pre-filled with Brands Hatch + 911 GT3 RS + session link)
          → Save lap → redirects to /combos/911-gt3-rs-992-22/brands-hatch
          → Combo page shows "Used in Friday Night #45"

Example 2: Navigating from run list to combo
/run-lists/friday-night-45 → Shows 10 entries
                           → Click "Entry 3: Spa • McLaren 720S"
                           → /combos/720s-20/spa-francorchamps
                           → Shows lap times, builds, and "Used in Friday Night #45"
```

---

## PHASE 7: Admin Features ⚠️ PARTIALLY COMPLETE

**Goals**: User approval, data management

**Key Tasks**:
- [x] Create admin user API routes (approve, update role, delete)
- [x] Build admin users page
- [ ] Build UserApprovalTable component (pending users, approve/reject)
- [ ] Create RoleManager component
- [ ] Create admin dashboard with statistics
- [ ] Build admin track/car management pages (CRUD)
- [ ] Set up email notifications (approval, session invites)
- [ ] Create admin audit log viewer

**Critical Files**:
- ✅ `/src/app/api/admin/users/route.ts`
- ✅ `/src/app/admin/users/page.tsx`
- `/src/services/email.service.ts`

**Deliverable**: Complete admin control panel

---

## PHASE 8: Polish & Optimization ⚠️ IN PROGRESS

**Goals**: Mobile optimization, performance, animations, UI consistency

**Key Tasks**:

**Part 1: UI/UX Improvements - ⚠️ CRITICAL**
- [ ] **CRITICAL: Improve dropdown search functionality**
  - [ ] Track/car selectors should support "contains" matching, not just "starts with"
  - [ ] Allow typing in dropdown fields to filter all matching items
  - [ ] Implement better ComboBox component (shadcn/ui combobox with search)
  - [ ] Apply to LapTimeForm, BuildForm, RunListEntryForm
- [ ] **CRITICAL: Fix styling inconsistencies**
  - [ ] Auth pages (signin, signup, verify-request, error) not matching site theme
  - [ ] Create/edit form pages lack consistent styling
  - [ ] Standardize form layouts across all create/edit pages
  - [ ] Ensure all pages use GT-inspired dark theme consistently
  - [ ] Fix spacing, typography, and button styles
- [ ] **CRITICAL: Make everything editable**
  - [ ] Add edit functionality for lap times (currently only create/delete)
  - [ ] Add edit functionality for builds (DONE ✓)
  - [ ] Add edit functionality for run lists (pending UI)
  - [ ] Add edit functionality for sessions (pending UI)
  - [ ] Consistent edit UX across all entities

**Part 2: Mobile Optimization ❌ NOT STARTED**
- [ ] Audit all pages for mobile responsiveness
- [ ] Optimize "Tonight's Run" for mobile viewing during race nights
- [ ] Test forms on mobile devices
- [ ] Improve touch targets for buttons and links

**Part 3: Performance ❌ NOT STARTED**
- [ ] Implement React Query caching strategies
- [ ] Add optimistic updates for lap times
- [ ] Optimize database queries with indexes
- [ ] Add pagination for large lists
- [ ] Implement loading skeletons

**Part 4: Animations & Polish ✅ PARTIALLY COMPLETE**
- [x] Create GT-themed loading animation (racing wheel with burnout smoke)
- [x] Integrate loading animation across all pages (12 pages total)
- [x] Add CSS keyframe animations for rotation and smoke effects
- [ ] Add Framer Motion page transitions
- [ ] Build comprehensive error boundaries
- [ ] Add accessibility improvements (ARIA labels, keyboard nav)

**Critical Files**:
- ✅ `/src/components/ui/loading.tsx` - Racing wheel loading component (3 variants)
- ✅ `/src/app/globals.css` - Loading animation CSS (tire-spin, smoke-rise keyframes)
- ✅ `/src/app/test-loading/page.tsx` - Loading animation demo page

**Deliverable**: Polished, fast, mobile-optimized app with consistent UI/UX

---

## PHASE 9: Deployment ❌ NOT STARTED

**Goals**: Deploy to Vercel, production setup

**Key Tasks**:
- [ ] Configure production environment variables
- [ ] Set up Vercel project
- [ ] Connect Supabase production database
- [ ] Run database migrations on production
- [ ] Seed production database
- [ ] Configure Resend for production emails
- [ ] Set up custom domain (if desired)
- [ ] Create admin user (david) with ADMIN role
- [ ] Deploy to production
- [ ] Test all features on production
- [ ] Write README with setup instructions

**Deliverable**: Live production app on Vercel

---

## Current Status

**✅ Completed**:
- Phase 1: Foundation & Setup
- Phase 2: Core Layout & UI Components
- Phase 3: GT7 Data Browsing (Part 1 complete - browsing works, images pending)
- Phase 4: Lap Time Tracking & Integration (Core features complete - combo pages working)
- Phase 5: Car Builds & Tuning (Parts 1-5 complete - database, API, UI, and integrations all working)

**🚧 In Progress**:
- Phase 6: Run Lists & Sessions (API layer complete, UI layer in progress)

**🔜 Next Up (Priority Order)**:
1. **Phase 6: Complete Run Lists UI** (HIGH PRIORITY - core feature incomplete)
   - Create run list creation page
   - Create run list detail/edit page
   - Build Tonight session page
2. **Phase 8 Part 1: Critical UI/UX Fixes** (HIGH PRIORITY - user feedback)
   - Fix dropdown search (contains vs starts-with matching)
   - Add lap time edit functionality
   - Fix auth page styling inconsistencies
   - Standardize form page styling
3. **Phase 6: Session Integration**
   - Integrate sessions with lap times
   - Session history pages
4. **Phase 5: Build Sharing Features** (LOWER PRIORITY)
   - Comparison tool, ratings, share links

**📊 Database Status**:
- Users: Ready for signups
- Tracks: 118 ✓
- Cars: 552 ✓
- Builds: Database ready, 1 test build ✓
- Races: Database schema added (Race, RaceCar tables) ✓

**🔑 Admin Access**:
- Email: david@sipheren.com
- Auto-promoted to ADMIN on first signin

**🎉 Latest Progress (Phase 5 - COMPLETED)**:
- ✅ Database schema created for Car Builds
- ✅ GT7 upgrades data file created (100+ parts across 10 categories)
- ✅ GT7 tuning data file created (40+ settings across 7 categories)
- ✅ Build Management API fully functional (CRUD + clone)
- ✅ API tested successfully with sample build data
- ✅ All builds UI pages created and functional
- ✅ Builds listing page with filters (all/public/my builds)
- ✅ Build detail page with statistics and actions
- ✅ Build creation form with upgrades and tuning tabs
- ✅ Build edit page with pre-populated data
- ✅ Clone, edit, and delete functionality working
- ✅ Added "Builds" navigation link to header
- ✅ Builds integrated on car detail pages (shows all builds for that car)
- ✅ Builds integrated on track detail pages (shows builds used on that track)
- ✅ Builds integrated on combo pages (suggests builds used for that combo)
- ✅ Build selector added to lap time form (optional field)
- ✅ Build info displayed on lap time records
- ✅ Lap times API updated to include build data
- ✅ **User tested and approved implementation**

**Phase 5 Status**: Parts 1-5 COMPLETE ✅ | Part 6 PENDING (sharing features)

**🎉 Latest Progress (Phase 6 - IN PROGRESS)**:

**API Layer - ✅ COMPLETE (16 endpoints)**:
- ✅ All RunList CRUD endpoints (list, create, get, update, delete)
- ✅ RunListEntry management (add, update, delete with auto-reordering)
- ✅ RunSession CRUD endpoints (create, list, get, update, delete)
- ✅ Special `/api/sessions/tonight` endpoint for active session
- ✅ SessionAttendance endpoints (join, leave, list)
- ✅ Authorization checks (owner-only operations)
- ✅ Privacy controls (public/private run lists)
- ✅ Full relation loading (tracks, cars, builds, lobby settings)
- ✅ GT7 lobby settings data file (400+ lines)

**UI Layer - ⚠️ IN PROGRESS (1 of 5 pages)**:
- ✅ Run lists listing page with search and filters
- ❌ Run list creation form (CRITICAL - needed next)
- ❌ Run list detail/edit page (CRITICAL)
- ❌ Tonight page (active session mobile display)
- ❌ Session history page

**Phase 6 Status**: API Complete ✅ | UI 20% Complete ⚠️ | Integrations Not Started ❌

**🎉 Latest Updates (2026-01-13)**:

**Race Entity Implementation - COMPLETE ✅**:
- ✅ Database schema updated with Race and RaceCar tables
- ✅ RunListEntry.raceId column added for linking entries to races
- ✅ API endpoints created (GET/PATCH/DELETE /api/races/[id])
- ✅ Race listing page created (/races)
  - Shows all race combinations across run lists
  - Search and filter functionality (All/Active/Inactive)
  - Table-style layout matching lap times page
  - Displays track, cars, and run list associations
  - Click to view race details
- ✅ Race detail page created as read-only display (/races/[id])
  - Shows race name, description, track info
  - Lists all cars in the race with build information
  - Displays statistics (total laps, drivers, fastest time, average time)
  - Shows leaderboard (best times per driver per car per build)
  - Shows user stats (position, best time, average time, recent laps)
  - Lists which run lists use this race
- ✅ Database column casing migration completed
  - Fixed Race/RaceCar tables to use camelCase (createdAt, carId, etc.)
  - All database tables now use consistent naming
  - Queries working correctly without errors
- ❌ Race editing functionality intentionally omitted
  - Run lists handle race creation/editing via their own UI
  - Simpler, more maintainable approach

**Current Status**:
- Race entity: FULLY FUNCTIONAL ✅
- Races listing page: Complete with search and filters ✅
- Race detail page: Stable, read-only display ✅
- Database column naming: Consistent across all tables ✅
- Race creation/editing: Handled through run lists (existing functionality)
- API: Fully functional for integration with run lists

**🎉 Latest Updates (2026-01-11 Part 3)**:

**Race Detail Page Layout Consistency**:
- ✅ Fixed layout inconsistency across different car/track combinations
- ✅ "Your Performance" section now always renders (shows empty state when no data)
- ✅ "Your Recent Laps" section now always renders (shows empty state when no data)
- ✅ All race pages now have identical structure regardless of lap time data
- ✅ Empty states styled consistently with populated sections
- ✅ Eliminated confusion - only ONE race detail page for all navigation paths

**Authentication Fixes**:
- ✅ Fixed sign out functionality using proper NextAuth signOut() method
- ✅ Sign out now properly clears session and redirects to home page

**🎉 Previous Updates (2026-01-11 Part 2)**:

**Race Detail Page Improvements**:
- ✅ Updated terminology from "combo" to "race" throughout UI
- ✅ Removed "Recent Activity" section to reduce clutter
- ✅ Added "Create Build" button to builds section (pre-fills car)
- ✅ Fixed run lists integration to support multiple cars per entry
- ✅ Comprehensive design improvements:
  - Enhanced car and track cards with gradient backgrounds and colored borders
  - Improved statistics cards with gradients and larger text
  - Enhanced user performance card with gradient and border-2
  - Improved leaderboard styling with gradient header and enhanced rows
  - Unified run lists and builds section styling with colored gradient headers
  - Better spacing throughout (gap-6, p-4 padding)
  - Enhanced hover effects with shadows
  - Consistent design language with border-2 and opacity patterns

**🔍 Recent Testing Feedback (2026-01-08)**:

**Critical Issues Found**:
1. ❌ **Lap times cannot be edited** - Only create and delete functionality exists
   - Need PATCH endpoint for lap times
   - Need edit page UI
   - Need edit buttons in lap time listings
2. ❌ **Run Lists UI incomplete** - API is done but missing critical pages
   - No creation page
   - No detail/edit page
   - Cannot actually use run lists feature yet
3. ❌ **Dropdown search is limited** - Track/car selectors only match from start of string
   - Should support "contains" matching (search anywhere in name)
   - Example: typing "911" should find "Porsche 911 GT3 RS", not just cars starting with "911"
4. ❌ **Lap time build/combo linking unclear** - Need better UX for linking builds to lap times
   - Build selector exists but could be more prominent
   - Combo context should be clearer when creating lap times
5. ❌ **Styling inconsistencies** - Auth and form pages don't match site theme
   - Sign in/sign up pages use default styling
   - Create/edit forms lack consistent layout
   - Need GT-inspired theme applied to all pages

**Positive Feedback**:
- ✅ Database connection working perfectly
- ✅ RLS policies configured correctly
- ✅ Lap time creation and saving works
- ✅ Builds system fully functional
- ✅ API routes all working correctly

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
EMAIL_FROM="noreply@sipheren.com"

# Admin
DEFAULT_ADMIN_EMAIL="david@sipheren.com"
```

---

## GT7 Data Sources

- **Cars CSV**: https://ddm999.github.io/gt7info/data/db/cars.csv (565 cars)
- **Tracks List**: https://www.gran-turismo.com/gb/gt7/tracklist/ (41 tracks, 120+ configurations)
- **Lobby Settings**: https://www.gran-turismo.com/us/gt7/manual/multiplayer/02

---

## Development Logs

For detailed session-by-session progress tracking, see:
- [`docs/SESSION-LOG.md`](SESSION-LOG.md) - Detailed log of all development work, decisions, issues, and fixes
- [`docs/DATABASE-SCHEMA.md`](DATABASE-SCHEMA.md) - Complete database structure and table definitions
- [`docs/DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) - UI/UX design system and component standards

---

## Race Entity Architecture (2026-01-12)

### Overview
The Race entity centralizes track + car combinations, allowing races to be reused across multiple run lists. This replaces the old combo model where track/car combinations were only stored within individual run list entries.

### Database Schema
- **Race**: Main entity with id, trackId, name, description, createdById
- **RaceCar**: Junction table linking cars/builds to a race (supports multiple cars per race)
- **RunListEntry.raceId**: Foreign key linking run list entries to races

### API Endpoints
- `GET /api/races/[id]` - Fetch race with leaderboard, user stats, run lists
- `PATCH /api/races/[id]` - Update race (name, description, track, cars)
- `DELETE /api/races/[id]` - Delete race (validates not in use by run lists)

### UI Pages
- `/races/[id]` - Race detail page (read-only)
  - Displays race information, cars, builds
  - Shows statistics and leaderboard
  - Lists run lists using this race
  - Links to car/track/build pages

### Integration Points
- **Run Lists**: Can create/edit races when adding entries
- **Lap Times**: Grouped by race (user + car + build combination)
- **Leaderboards**: Calculated per race (best time per user per car per build)
- **Builds**: Displayed prominently on race pages

### Decisions Made
1. **Race page is read-only**: Editing complexity too high with auto-save and state synchronization issues
2. **Run lists handle race creation**: Run list UI is the primary way to create/edit races
3. **API remains functional**: Run lists can use PATCH endpoint to update races
4. **Simpler architecture**: Avoids complex state management issues while maintaining functionality

### Technical Details
**Attempted Features (Rolled Back)**:
- Inline editing with auto-save (debounced 1 second)
- Direct track, name, description editing
- Add/remove cars with build selector
- Delete button on each car card

**Issues Encountered**:
- Two sources of truth (race object vs raceCars state) causing desynchronization
- State corruption with undefined carId/buildId values
- Race conditions with multiple save triggers
- Delete button affecting all cars instead of one

**Resolution**:
- Reverted to simple read-only display
- Run lists continue to handle race management
- API remains functional for programmatic updates

### Files Modified
- `/src/app/races/[id]/page.tsx` - Race detail page (read-only)
- `/src/app/api/races/[id]/route.ts` - Race API endpoints
- `/src/app/run-lists/[id]/page.tsx` - Run list integration

