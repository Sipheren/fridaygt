# FridayGT Database Schema

**Date:** 2026-01-21
**Source:** Live Supabase database export

---

## Table of Contents
1. [Authentication & Users](#authentication--users)
2. [Core GT7 Data](#core-gt7-data)
3. [Run Lists & Sessions](#run-lists--sessions)
4. [Lap Times & Builds](#lap-times--builds)
5. [Parts & Tuning Data](#parts--tuning-data)
6. [Race Entity](#race-entity)

---

## Authentication & Users

### User
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| email | text | NO | - | User email (unique) |
| emailVerified | timestamp | YES | - | Email verification timestamp |
| name | text | YES | - | Display name |
| image | text | YES | - | Profile image URL |
| role | UserRole | NO | PENDING | PENDING/USER/ADMIN |
| gamertag | text | NO | - | Xbox gamertag |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | Creation time |
| updatedAt | timestamp | NO | - | Last update |

**Note:** NextAuth adapter also creates a `next_auth.users` table (separate from public.User)
- Managed by NextAuth SupabaseAdapter
- Contains basic user authentication data
- Synced with public.User via database trigger
- RLS Policies: Users can SELECT/UPDATE own records, service role can INSERT

### Account (NextAuth)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| userId | text | NO | - | FK → User |
| type | text | NO | - | Account type |
| provider | text | NO | - | Auth provider |
| providerAccountId | text | NO | - | Provider-specific ID |
| refresh_token | text | YES | - | OAuth refresh token |
| access_token | text | YES | - | OAuth access token |
| expires_at | integer | YES | - | Token expiration |
| token_type | text | YES | - | Token type |
| scope | text | YES | - | OAuth scope |
| id_token | text | YES | - | OAuth ID token |
| session_state | text | YES | - | Session state |

**RLS Policies:**
- Users can SELECT own accounts (userId matches auth.uid())
- Service role has full access (INSERT/UPDATE/DELETE for NextAuth adapter)
- Sensitive columns (access_token, refresh_token) protected by RLS

### Session (NextAuth)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| sessionToken | text | NO | - | Session token (unique) |
| userId | text | NO | - | FK → User |
| expires | timestamp | NO | - | Expiration time |

**RLS Policies:**
- Users can SELECT own sessions (userId matches auth.uid())
- Service role has full access (INSERT/UPDATE/DELETE for NextAuth adapter)

### VerificationToken
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| identifier | text | NO | - | Email identifier |
| token | text | NO | - | Verification token (unique) |
| expires | timestamp | NO | - | Token expiration |

**RLS Policies:**
- Service role has full access only (NextAuth adapter manages magic links)
- Sensitive column (token) protected by RLS

---

## Core GT7 Data

### Track
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| name | text | NO | - | Track name (unique) |
| slug | text | NO | - | URL-friendly name (unique) |
| location | text | YES | - | Track location |
| length | double | YES | - | Track length (meters) |
| corners | integer | YES | - | Number of corners |
| imageUrl | text | YES | - | Track image URL |
| category | TrackCategory | NO | CIRCUIT | CIRCUIT/CITY_COURSE/DIRT/OVAL |
| isReverse | boolean | NO | false | Reverse layout |
| baseTrackId | text | YES | - | FK → Track (for reverse layouts) |
| baseName | text | YES | - | Base track name |
| layout | text | YES | - | Layout variant name |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Indexes:** slug, category, name

### Car
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| name | text | NO | - | Car name |
| slug | text | NO | - | URL-friendly name (unique) |
| manufacturer | text | NO | - | Manufacturer name |
| year | integer | YES | - | Model year |
| category | CarCategory | YES | - | N100-N1000, GR1-GR4, etc. |
| driveType | DriveType | YES | - | FF/FR/MR/RR/AWD |
| displacement | integer | YES | - | Engine displacement (cc) |
| maxPower | integer | YES | - | Max power (HP) |
| maxTorque | integer | YES | - | Max torque (lb-ft) |
| weight | integer | YES | - | Weight (kg) |
| pp | integer | YES | - | Performance Points |
| imageUrl | text | YES | - | Car image URL |
| country | text | YES | - | Country of origin |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Indexes:** slug, manufacturer, category

---

## Run Lists & Sessions

### RunList
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| name | text | NO | - | Run list name |
| description | text | YES | - | Description |
| isPublic | boolean | NO | true | Public/private |
| createdById | text | NO | - | FK → User |
| isActive | boolean | YES | false | Currently active list |
| isLive | boolean | YES | false | Currently live |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Indexes:** createdById, createdAt

### RunListEntry
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| runListId | text | NO | - | FK → RunList |
| order | integer | NO | - | Position in list |
| trackId | text | NO | - | FK → Track |
| carId | text | YES | - | FK → Car (LEGACY - kept for compatibility) |
| buildId | text | YES | - | FK → CarBuild (LEGACY - kept for compatibility) |
| lobbySettingsId | text | YES | - | FK → LobbySettings |
| notes | text | YES | - | Entry notes |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |
| **raceId** | text | YES | - | FK → Race (NEW - added for Race entity) |

**Note:** This table has a HYBRID structure:
- **Legacy system:** `carId` + `buildId` columns (old single-car approach)
- **New system:** `RunListEntryCar` junction table (multiple cars per entry)
- Both exist for backwards compatibility

**Indexes:** runListId, (runListId, order) UNIQUE

### RunListEntryCar (Junction Table)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| runListEntryId | text | NO | - | FK → RunListEntry |
| carId | text | NO | - | FK → Car |
| buildId | text | YES | - | FK → CarBuild |
| createdAt | text | NO | now() | - |
| updatedAt | text | NO | now() | - |

**Constraints:** UNIQUE (runListEntryId, carId)
**Indexes:** runListEntryId, carId

**RLS Policies:**
- SELECT: Viewable if parent run list is viewable (isPublic=true OR user owns run list)
- ALL: Users can manage entries for their own run lists
- Follows same security model as RunListEntry table

### RunSession
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| runListId | text | NO | - | FK → RunList |
| name | text | NO | - | Session name |
| date | timestamp | NO | CURRENT_TIMESTAMP | Session date/time |
| currentEntryOrder | integer | YES | - | Current race position |
| status | SessionStatus | NO | SCHEDULED | SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Indexes:** runListId, date, status

### SessionAttendance
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| sessionId | text | NO | - | FK → RunSession |
| userId | text | NO | - | FK → User |
| status | AttendanceStatus | NO | PRESENT | PRESENT/LEFT/NO_SHOW |
| joinedAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| leftAt | timestamp | YES | - | - |

**Constraints:** UNIQUE (sessionId, userId)
**Indexes:** sessionId, userId

### RunListEdit
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| runListId | text | NO | - | FK → RunList |
| userId | text | NO | - | FK → User |
| action | text | NO | - | Action performed |
| details | text | YES | - | Action details (JSON) |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |

**Indexes:** runListId, userId, createdAt

---

## Lap Times & Builds

### LapTime
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| userId | text | NO | - | FK → User |
| trackId | text | NO | - | FK → Track |
| carId | text | NO | - | FK → Car |
| timeMs | integer | NO | - | Lap time in milliseconds |
| sessionId | text | YES | - | FK → RunSession |
| buildId | text | YES | - | FK → CarBuild |
| sessionType | text | YES | 'R' | Session type (R=Race, Q=Qualifying) |
| notes | text | YES | - | Lap notes |
| conditions | text | YES | - | Weather/conditions |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Indexes:** (userId, trackId), (userId, carId, trackId), trackId, carId, sessionId, createdAt

### CarBuild
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| userId | text | NO | - | FK → User (creator) |
| carId | text | NO | - | FK → Car |
| name | varchar(100) | NO | - | Build name |
| description | text | YES | - | Build description |
| isPublic | boolean | YES | false | Public/private |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

### CarBuildUpgrade
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| buildId | text | NO | - | FK → CarBuild |
| category | varchar(50) | NO | - | Upgrade category (LEGACY - kept for compatibility) |
| part | varchar(100) | NO | - | Part name (LEGACY - kept for compatibility) |
| **partId** | uuid | NO | - | FK → Part (NEW - 2026-01-21) |

**Note:** `partId` is now NOT NULL with foreign key constraint. Legacy columns kept for compatibility.

### CarBuildSetting
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| buildId | text | NO | - | FK → CarBuild |
| category | varchar(50) | NO | - | Setting category (LEGACY - kept for compatibility) |
| setting | varchar(100) | NO | - | Setting name (LEGACY - kept for compatibility) |
| value | varchar(100) | NO | - | Setting value |
| **settingId** | uuid | NO | - | FK → TuningSetting (NEW - 2026-01-21) |

**Note:** `settingId` is now NOT NULL with foreign key constraint. Legacy columns kept for compatibility.

### LobbySettings
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| name | text | NO | - | Settings name |
| laps | integer | YES | - | Number of laps |
| raceType | RaceType | NO | LAPS | LAPS/TIME_TRIAL/ENDURANCE |
| startType | StartType | NO | GRID | GRID/ROLLING/FALSE_START_CHECK |
| boostLevel | BoostLevel | NO | OFF | OFF/WEAK/STRONG |
| tireWearMultiplier | integer | NO | 1 | Tire wear rate |
| fuelConsumption | integer | NO | 1 | Fuel consumption rate |
| requiredTires | text | YES | - | Required tire type |
| mechanicalDamage | DamageLevel | NO | NONE | NONE/LIGHT/HEAVY |
| penaltyLevel | PenaltyLevel | NO | DEFAULT | OFF/WEAK/DEFAULT/STRONG |
| lowMuSurface | boolean | NO | true | Low grip surface |
| wallCollisionPenalty | boolean | NO | true | Wall collision penalties |
| cornerCuttingPenalty | boolean | NO | true | Corner cutting penalties |
| weather | WeatherType | NO | FIXED | FIXED/RANDOM/DYNAMIC |
| weatherChangeability | integer | NO | 0 | Weather change rate |
| timeOfDay | TimeOfDay | NO | NOON | DAWN/MORNING/NOON/AFTERNOON/DUSK/NIGHT |
| timeProgression | integer | NO | 1 | Time progression rate |
| abs | AssistLevel | NO | DEFAULT | OFF/WEAK/DEFAULT/STRONG/PROHIBITED |
| counterSteer | AssistLevel | NO | DEFAULT | OFF/WEAK/DEFAULT/STRONG/PROHIBITED |
| tractionControl | AssistLevel | NO | DEFAULT | OFF/WEAK/DEFAULT/STRONG/PROHIBITED |
| activeStabilityMgmt | AssistLevel | NO | DEFAULT | OFF/WEAK/DEFAULT/STRONG/PROHIBITED |
| drivingLine | boolean | NO | false | Show driving line |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Indexes:** name

---

## Parts & Tuning Data (2026-01-21)

**Status:** ✅ COMPLETE
- Tables created
- Data imported from CSV files (72 parts, 60 settings)
- Foreign key columns added and finalized (NOT NULL with constraints)
- Existing build data migrated (6 CarBuildUpgrade records)

### PartCategory
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | varchar(50) | NO | - | Category name (unique) |
| displayOrder | integer | NO | - | Display order in UI |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Categories (5):** Sports, Club Sports, Semi-Racing, Racing, Extreme

### Part
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| categoryId | uuid | NO | - | FK → PartCategory |
| name | varchar(100) | NO | - | Part name |
| description | text | YES | - | Part description |
| isActive | boolean | YES | true | Active/inactive |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Constraints:** UNIQUE (categoryId, name)
**Indexes:** categoryId, name, isActive
**Total Parts:** 72

### TuningSection
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | varchar(50) | NO | - | Section name (unique) |
| displayOrder | integer | NO | - | Display order in UI |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Sections (15):** Tyres, Suspension, Differential Gear, Aerodynamics, ECU, Performance Adjustment, Transmission, Nitrous/Overtake, Supercharger, Intake & Exhaust, Brakes, Steering, Drivetrain, Engine Tuning, Bodywork

### TuningSetting
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| sectionId | uuid | NO | - | FK → TuningSection |
| name | varchar(100) | NO | - | Setting name |
| description | text | YES | - | Setting description |
| defaultValue | varchar(100) | YES | - | Default value |
| isActive | boolean | YES | true | Active/inactive |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Constraints:** UNIQUE (sectionId, name)
**Indexes:** sectionId, name, isActive
**Total Settings:** 60

### API Endpoints (2026-01-21)

**Status:** ✅ COMPLETE

#### Parts API

**GET /api/parts/categories**
- Returns all part categories
- Response: `{ categories: PartCategory[] }`
- Ordered by `displayOrder`

**GET /api/parts**
- Returns all parts with category details
- Query params:
  - `categoryId?` - Filter by category UUID
  - `active?` - Filter by active status (true/false)
  - `includeInactive?` - Set to "true" to include inactive parts
- Response: `{ parts: Part[] }` (each part includes `category:PartCategory`)
- Defaults to active parts only

#### Tuning Settings API

**GET /api/tuning-settings/sections**
- Returns all tuning sections
- Response: `{ sections: TuningSection[] }`
- Ordered by `displayOrder`

**GET /api/tuning-settings**
- Returns all settings with section details
- Query params:
  - `sectionId?` - Filter by section UUID
  - `active?` - Filter by active status (true/false)
  - `includeInactive?` - Set to "true" to include inactive settings
- Response: `{ settings: TuningSetting[] }` (each setting includes `section:TuningSection`)
- Defaults to active settings only

---

## Race Entity (2026-01-12)

**Status:** ✅ COMPLETE (2026-01-13)
- Tables created with correct camelCase column naming
- Column casing migration completed
- All queries working correctly

### Race
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| trackId | text | NO | - | FK → Track |
| name | text | YES | - | Race name |
| description | text | YES | - | Race description |
| createdById | text | NO | - | FK → User (creator) |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Purpose:** Central entity for track + car combinations. Can be reused across multiple run lists.

### RaceCar
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| raceId | text | NO | - | FK → Race |
| carId | text | NO | - | FK → Car |
| buildId | text | YES | - | FK → CarBuild |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp | NO | - | - |

**Constraints:** UNIQUE (raceId, carId)
**Purpose:** Links cars (and optional builds) to a race.

---

## Enums

### UserRole
- PENDING
- USER
- ADMIN

### TrackCategory
- CIRCUIT
- CITY_COURSE
- DIRT
- OVAL

### CarCategory
- N100, N200, N300, N400, N500, N600, N700, N800, N900, N1000
- GR1, GR2, GR3, GR4
- RALLY
- KART
- VISION_GT
- OTHER

### DriveType
- FF (Front-engine, Front-wheel drive)
- FR (Front-engine, Rear-wheel drive)
- MR (Mid-engine, Rear-wheel drive)
- RR (Rear-engine, Rear-wheel drive)
- AWD (All-wheel drive)

### RaceType
- LAPS
- TIME_TRIAL
- ENDURANCE

### StartType
- GRID
- ROLLING
- FALSE_START_CHECK

### BoostLevel
- OFF
- WEAK
- STRONG

### DamageLevel
- NONE
- LIGHT
- HEAVY

### PenaltyLevel
- OFF
- WEAK
- DEFAULT
- STRONG

### WeatherType
- FIXED
- RANDOM
- DYNAMIC

### TimeOfDay
- DAWN
- MORNING
- NOON
- AFTERNOON
- DUSK
- NIGHT

### AssistLevel
- OFF
- WEAK
- DEFAULT
- STRONG
- PROHIBITED

### SessionStatus
- SCHEDULED
- IN_PROGRESS
- COMPLETED
- CANCELLED

### AttendanceStatus
- PRESENT
- LEFT
- NO_SHOW

---

## Key Relationships

```
User (1) ←→ (N) RunList ←→ (1) RunListEntry
User (1) ←→ (N) LapTime
User (1) ←→ (N) CarBuild
User (1) ←→ (N) RunSession

Track (1) ←→ (N) LapTime
Track (1) ←→ (N) RunListEntry
Track (1) ←→ (N) Race

Car (1) ←→ (N) LapTime
Car (1) ←→ (N) CarBuild
Car (1) ←→ (N) RunListEntryCar
Car (1) ←→ (N) RaceCar

RunListEntry (1) ←→ (N) RunListEntryCar
RunListEntry (1) ←→ (1) Race (NEW)
Race (1) ←→ (N) RaceCar (NEW)

CarBuild (1) ←→ (N) CarBuildUpgrade
CarBuild (1) ←→ (N) CarBuildSetting

PartCategory (1) ←→ (N) Part
Part (N) ←→ (N) CarBuildUpgrade (via partId)
TuningSection (1) ←→ (N) TuningSetting
TuningSetting (N) ←→ (N) CarBuildSetting (via settingId)
```

---

## Notes

### Hybrid Structure (RunListEntry)
The `RunListEntry` table has a hybrid structure due to migration in progress:
- **Legacy columns:** `carId`, `buildId` (old single-car system)
- **New junction table:** `RunListEntryCar` (multiple cars per entry)

This allows backwards compatibility during the transition to the Race entity architecture.

### Timestamp Fields
- Most tables use `timestamp without time zone`
- `RunListEntryCar` uses `text` with `now()` default (inconsistent, to be fixed)

### Migration Status
- **Completed (2026-01-13):** Race entity normalization
- **Completed (2026-01-13):** Multiple cars per run list entry (RunListEntryCar)
- **Completed (2026-01-21):** Parts & Tuning Settings database migration (Phase 1)
  - Tables created, data imported (72 parts, 60 settings)
  - Foreign keys added and finalized with NOT NULL constraints
  - Existing build data migrated successfully
- **Completed (2026-01-21):** Parts & Tuning Settings API endpoints (Phase 2)
  - GET /api/parts/categories
  - GET /api/parts
  - GET /api/tuning-settings/sections
  - GET /api/tuning-settings
- **Completed (2026-01-21):** Component updates to use API (Phase 3)
  - BuildUpgradesTab now fetches from /api/parts
  - BuildTuningTab now fetches from /api/tuning-settings
  - Loading and error states added
- **Completed (2026-01-21):** Build API validation and JOINs (Phase 4)
  - GET /api/builds/[id] returns Part/PartCategory/TuningSetting/TuningSection details
  - PATCH validates partId/settingId before inserting
  - Foreign key constraints enforced
- **Planned:** Remove legacy `carId`/`buildId` from RunListEntry after Race entity is fully deployed
- **Planned:** Remove legacy `category`/`part`/`setting` columns from build tables (optional - kept for compatibility)
