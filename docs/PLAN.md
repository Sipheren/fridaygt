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

**Date**: 2026-01-26
**Branch**: `main`
**Production URL**: https://fridaygt.vercel.app
**Status**: Core features complete and deployed, admin tools enhanced

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
- Tuning settings database (17 settings, 6 sections) — database-driven with FK validation, ordered by displayOrder
  - Transmission section exists but has NO settings (gears are direct CarBuild columns)
  - Settings ordered by GT7's in-game menu order (Session #35)

### Phase 4: Build Management ✅
- Build CRUD (create, read, update, delete, clone)
- Parts system (72 parts across 5 categories: Sports, Club Sports, Semi-Racing, Racing, Extreme)
- Tuning system (17 settings across 6 sections: Suspension, Differential, ECU, Performance Adjustment, Aerodynamics, Transmission)
  - **Gear ratios**: Fixed columns on CarBuild (gear1-20, finalDrive as text, supports up to 20 gears)
  - Preserves formatting (leading/trailing zeros like "2.500")
  - Removed from flexible CarBuildSetting system (Session #22)
  - Settings ordered by GT7's in-game menu order using displayOrder (Session #35)
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

### Phase 11: Dropdown Standardization & Virtualization ✅
- **SearchableComboBox Enhancement**: Extended with grouping, loading, error states, and virtualization support
- **Helper Functions**: Created `dropdown-helpers.ts` with formatCarOptions and formatTrackOptions
- **VirtualizedList Component**: Mobile-first virtualization using @tanstack/react-virtual
  - 95% DOM reduction (624→~10 elements for 552 cars)
  - 70% faster render (20-30ms vs 80-100ms)
  - Smooth 60fps scrolling on mobile
  - 44px touch targets for mobile optimization
- **Car Dropdowns**: Grouped by manufacturer (72 groups), searchable with contains matching
  - QuickBuildModal: Virtualized car dropdown (552 cars)
  - builds/new: Virtualized car dropdown (552 cars)
- **Track Dropdowns**: Grouped by location (14 country groups), searchable
  - races/new: Grouped track dropdown (118 tracks)
  - LapTimeForm: Grouped track dropdown (118 tracks)
- **Responsive Width**: Dropdowns now match trigger button width on all screen sizes
- **Performance**: All dropdowns optimized for mobile with smooth scrolling and fast rendering

### Phase 12: Tonight Page Race Reordering ✅
- **Drag-and-Drop Reordering**: Mobile-first race reordering on Tonight page using @dnd-kit
- **Database Changes**: Added `order` field to Race table with sequential ordering
- **API Enhancements**:
  - GET /api/races?isActive=true: Returns races sorted by order
  - POST /api/races/reorder: Updates race order with validation
  - PATCH /api/races/[id]: Sets order to MAX+1 when activating races
- **Frontend Components**:
  - DragHandle: 44px touch target, WCAG compliant
  - SortableRaceCard: Wraps race cards with drag functionality
  - SortableRaceList: Manages DndContext with optimistic updates and rollback
- **UX Features**:
  - Smooth 60fps animations during drag
  - Visual feedback (elevation, shadow, ring)
  - Debounced API calls (500ms)
  - Automatic rollback on error
  - Haptic feedback on mobile
  - Keyboard navigation support
- **Interaction Fix**: Only "View Race Details" text navigates; drag handle clicks don't trigger navigation

### Phase 13: Admin User Management Enhancement ✅
- **User Profile Editing**: Admins can now edit user name and gamertag from admin users page
  - Clickable user cards with edit dialog
  - Gamertag uniqueness validation
  - Dual schema validation (role + profile updates)
  - Fixed email notification logic (only on PENDING → USER)
- **Build Creator Selection**: Admins can set/change build creator
  - Creator dropdown in build create/edit forms (admin only)
  - Filters to active users (USER + ADMIN, excludes PENDING)
  - Admin permission validation with database checks
  - API endpoint: GET /api/users?active=true
- **Global UI Improvements**:
  - Increased outline button hover visibility (destructive/5 → destructive/10)
  - Fixed user card hover effects (border-primary/30 + bg-primary/5)
  - Design system compliance (no page-specific styling)

### Phase 14: Comprehensive Code Review & Quality Improvements ✅
- **Security Fixes (P0)**:
  - Race reorder authorization: Added `isAdmin()` check to `/api/races/reorder`
  - Users endpoint authentication: Added auth + admin check to `/api/users`
- **High Priority Bug Fixes (P1)**:
  - Race condition fix: Atomic race reordering using database RPC function (`reorder_races_atomic`)
  - Email failure handling: `Promise.allSettled()` for partial failure resilience
  - Rate limiter cleanup: Replaced global interval with lazy cleanup function
  - useEffect cleanup: Added timeout cleanup in sortable-race-list, admin users, profile pages
  - Clone error handling: Added error logging for upgrade/settings cloning
- **Code Quality Improvements (P2)**:
  - Centralized `formatDate()` utility in `lib/time.ts`
  - Added `getCurrentUser()` helper in `lib/auth-utils.ts`
  - Standardized permission checks: All API routes now use `isAdmin()` and `getCurrentUser()`
  - Type consolidation: Created `src/types/components.ts` for shared component types
  - Components updated to use centralized utilities (CarBuilds, CarLapTimes, TrackBuilds)
  - Removed unused code: UpdateLapTimeSchema, withErrorHandler, asyncHandler, suspense-wrapper.tsx
- **Database Migration**: Added atomic race reordering function with row-level locking

### Phase 15: Race Members Feature ✅
- **Race Member Management**:
  - New table: `RaceMember` (links races to users with tyre selection and ordering)
  - Race member list displayed on race detail pages (between Statistics and Leaderboard)
  - Shows all active users (USER + ADMIN roles, excludes PENDING)
  - Each member displays: position number, gamertag only (no names/emails), tyre selection
- **Admin Controls**:
  - Drag-and-drop reordering with @dnd-kit (copied from sortable-race-card pattern)
  - Tyre selection dropdown (grouped by category: Comfort, Sports, Racing, Other)
  - Delete button to remove members from race (with shadcn Dialog confirmation)
  - Public view for non-admins (read-only)
- **Auto-Population**:
  - All active users automatically added to new races
  - Default tyre: Racing: Soft
  - Graceful failure: race creation succeeds even if member population fails
  - Existing races populated via one-time SQL script (42 members across 6 races)
- **API Endpoints**:
  - `GET /api/races/[id]/members` - List all race members (public)
  - `POST /api/races/[id]/members` - Add member to race (admin only)
  - `PATCH /api/races/[id]/members/reorder` - Reorder members atomically (admin only)
  - `PATCH /api/races/[id]/members/[memberId]/tyre` - Update tyre selection (admin only)
  - `DELETE /api/races/[id]/members/[memberId]` - Remove member (admin only)
- **Database**:
  - Atomic reorder function: `reorder_race_members_atomic()` with row-level locking
  - UNIQUE constraint: (raceid, userid) - one entry per user per race
  - CASCADE deletes: on raceid and userid
  - RLS policies: SELECT (public), INSERT/UPDATE/DELETE (admin only)
  - Application-layer ID generation: `crypto.randomUUID()` (matches Race, RaceCar patterns)
  - Column naming: lowercase (raceid, userid, partid, createdat, updatedat)
- **Design System Compliance**:
  - ✅ Fixed CRITICAL: Replaced native `confirm()` with shadcn Dialog component
  - ✅ Fixed HIGH: Empty state with Users icon, border, proper padding/sizing
  - ✅ Fixed HIGH: LoadingSection component with racing wheel animation
  - ✅ Fixed MEDIUM: Helper text using `text-sm` instead of `text-xs`
  - ✅ Verified (2026-01-26): All 4 fixes confirmed correctly implemented in code
  - 100% compliance after fixes (47/47 checks passed)
- **Post-Implementation Fixes** (2026-01-26):
  - Fixed SQL function: `reorder_race_members_atomic()` - changed `"updatedAt"` to `"updatedat"`
  - Fixed API column references: removed `createdat`/`updatedat` from SELECT/INSERT queries
  - Fixed DELETE API: changed `raceId` to `raceid` for database consistency
  - Fixed drag handler: wrapped DragHandle in div with dnd-kit listeners
  - Updated DATABASE-SCHEMA.md with RaceMember documentation
- **Components**:
  - `src/components/race-members/race-member-list.tsx` - Main list with DnD context, optimistic updates, 500ms debounce
  - `src/components/race-members/race-member-card.tsx` - Individual card with Dialog confirmation, proper drag handlers
- **Mobile-First UX**:
  - 44px touch targets for accessibility
  - Haptic feedback on mobile drag
  - 8px drag activation threshold prevents accidental drags
  - Saving indicator during reorder
  - Empty state handling
  - Optimistic updates with rollback on error
- **Add Member Button** (2026-01-26):
  - Admin-only "Add Member" button in Race Members card header
  - Opens shadcn Dialog with user dropdown (eligible active users not in race)
  - Displays gamertag with fallback (gamertag → name → email) for privacy
  - Calls existing POST /api/races/[id]/members endpoint
  - Refreshes member list after successful add
  - Loading states with Loader2 spinner
  - Empty state when all users already in race
  - Error handling for duplicate users, API failures
  - 100% design system compliance (Dialog, Button, Select patterns)
  - Mobile-responsive: Full-width user selector on both mobile and desktop
- **Components**:
  - `src/components/race-members/add-member-button.tsx` - Button with fetch logic and dialog state management
  - `src/components/race-members/add-member-dialog.tsx` - Dialog with user dropdown, loading, empty states
- **API Enhancement**:
  - Updated GET /api/users?active=true to include `gamertag` field in SELECT query
  - Ensures proper user display in Add Member dropdown
- **Mobile Responsiveness** (2026-01-26):
  - Race member cards now mobile-responsive with two-row layout on small screens
  - Position badge: 40px (w-10 h-10) on mobile, 32px (w-8 h-8) on desktop
  - Layout: `flex-col sm:flex-row` pattern matching design system
  - Mobile layout:
    - Row 1: Position badge + Gamertag (full width)
    - Row 2: Tyre selector (full width) + Delete button + Drag handle
  - Desktop layout: Single horizontal row (unchanged visual)
  - Tyre selector: Full-width on mobile (`w-full sm:w-fit`), full-width dropdown content on both mobile and desktop
  - Drag handle: Remains on right side (consistency)
  - Add Member dialog: Full-width user selector on both mobile and desktop
- **Change Tracking** (2026-01-26):
  - Added "Last Updated by <gamertag> at <time>" display below headers, above list
  - Tracks all changes: add member, delete member, reorder members, change tyre selection
  - Database schema: Added `updatedbyid` column to RaceMember table (FK to User)
  - Backfilled existing records with nulluser placeholder (ID: 00000000-0000-0000-0000-000000000000)
  - API changes: All write operations now set updatedbyid to current user
    - POST /api/races/[id]/members - Sets updatedbyid on creation
    - DELETE /api/races/[id]/members/[memberId] - Updates all remaining members to reflect deletion
    - PATCH /api/races/[id]/members/[memberId]/tyre - Sets updatedbyid on tyre change
    - PATCH /api/races/[id]/members/reorder - Sets updatedbyid for all reordered members via RPC function
  - Frontend: Finds most recent update across all members, displays user and formatted time
  - Time formatting: Converts UTC database timestamps to user's local timezone
    - Format: "Jan 26, 2026, 2:30 PM" (12-hour format with AM/PM)
    - Handles ISO 8601 conversion (space → T separator, add Z suffix for UTC)
  - User filtering: nulluser excluded from /api/users endpoint (always filtered)
  - Components updated:
    - `src/components/race-members/race-member-list.tsx` - Added last updated display logic
    - `src/components/race-members/race-member-card.tsx` - Updated interface
  - Type definitions: Added `DbRaceMember` to `src/types/database.ts`

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
- **RaceMember** (raceId, userId, order, partId — participant list with tyre selection)

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
| TuningSection | 6 | ✅ |
| TuningSetting | 17 | ✅ |
| Users | Active | ✅ |
| Races | Active | ✅ |
| CarBuilds | Active | ✅ |
| LapTimes | Active | ✅ |

---

## 🔜 Remaining Work

### Low Priority
2. **Global Leaderboards Page** — Cross-race leaderboard view
3. **Build Comparison** — Compare two builds side-by-side
4. **Admin Dashboard** — Statistics and data management
5. **Data Visualizations** — Lap time progress charts
6. **Build Ratings/Favorites** — Community engagement
7. **Redis Integration** — Production-ready rate limiting (currently using in-memory)

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
- [`docs/SESSION-LOG.md`](SESSION-LOG.md) — Development session history (27 sessions)
- [`docs/DATABASE-SCHEMA.md`](DATABASE-SCHEMA.md) — Complete database structure
- [`docs/DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) — UI/UX design system and patterns

---

## Key Milestones

| Date | Session | Accomplishment |
|------|---------|----------------|
| 2026-01-29 | #35 | Tuning Settings Display Order - Arranged settings to match GT7's in-game menu order, cleaned up database (removed 40 invalid/unused settings, 9 sections), updated sort logic to use displayOrder, verified in browser |
| 2026-01-26 | #31 | Race member change tracking - Added "Last Updated by <gamertag> at <time>" display, tracks user who made changes (add/delete/reorder/tyre), database schema update with updatedbyid column, proper timezone conversion (UTC to local), nulluser placeholder filtered from user lists |
| 2026-01-26 | #30 | Race members mobile responsiveness - Two-row layout on mobile, larger position badge (40px), full-width tyre selector and Add Member dialog dropdown, follows design system responsive patterns |
| 2026-01-26 | #29 | Race members feature + fixes + verification - Member management, drag-and-drop reordering, tyre selection, auto-population, design system compliance fixes, SQL function column name bug fix, delete functionality fix, verified all fixes correctly implemented |
| 2026-01-26 | #28 | Comprehensive code review - Security fixes (P0), bug fixes (P1), code quality improvements (P2), type consolidation, unused code removal |
| 2026-01-26 | #27 | Admin user management enhancement - User profile editing (name/gamertag), build creator selection, global hover improvements |
| 2026-01-26 | #26 | Race detail page build navigation fix - Conditional linking to builds, deleted build handling with visual feedback |
| 2026-01-25 | #25 | Tonight page race reordering - Drag-and-drop with @dnd-kit, mobile-first UX, optimistic updates, API enhancements |
| 2026-01-25 | #24 | Complete dropdown standardization with mobile-first virtualization - SearchableComboBox enhancement, VirtualizedList component, helper functions, responsive width, track grouping fixes |
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
