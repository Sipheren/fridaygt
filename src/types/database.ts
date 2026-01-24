/**
 * Database type definitions for Supabase tables
 *
 * These types represent the structure of database tables and should be
 * used for type-safe database operations.
 */

// ============================================================================
// User & Authentication
// ============================================================================

export type UserRole = 'PENDING' | 'USER' | 'ADMIN'

export interface DbUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  gamertag: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Reference Data
// ============================================================================

export interface DbCar {
  id: string
  slug: string
  name: string
  manufacturer: string
  year: number | null
  category: string | null
  driveType: string | null
  maxPower: number | null
  torque: number | null
  weight: number | null
  pp: number | null
  price: number | null
}

export interface DbTrack {
  id: string
  slug: string
  name: string
  location: string | null
  layout: string | null
  category: string | null
  country: string | null
  length: number | null
  isReverseLayout: boolean | null
}

export interface DbPartCategory {
  id: string
  name: string
  slug: string
  order: number
}

export interface DbPart {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
}

export interface DbPartWithCategory extends DbPart {
  category: DbPartCategory
}

export interface DbTuningSection {
  id: string
  name: string
  slug: string
  order: number
  icon: string | null
}

export interface DbTuningSetting {
  id: string
  sectionId: string
  name: string
  slug: string
  description: string | null
  inputType: string | null
  minValue: number | null
  maxValue: number | null
  step: number | null
  defaultValue: string | null
  unit: string | null
  displayOrder: number | null
  options: string | null
  isActive: boolean
}

export interface DbTuningSettingWithSection extends DbTuningSetting {
  section: DbTuningSection
}

// ============================================================================
// Builds
// ============================================================================

export interface DbCarBuild {
  id: string
  userId: string
  carId: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface DbCarBuildUpgrade {
  id: string
  buildId: string
  categoryId: string
  partId: string | null
  part: string | null
  value: string | null
}

export interface DbCarBuildSetting {
  id: string
  buildId: string
  sectionId: string
  settingId: string | null
  setting: string | null
  value: string
}

// ============================================================================
// Races
// ============================================================================

export interface DbRace {
  id: string
  trackId: string
  name: string | null
  description: string | null
  laps: number | null
  weather: string | null
  isActive: boolean
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface DbRaceCar {
  id: string
  raceId: string
  carId: string
  buildId: string
}

// ============================================================================
// Lap Times
// ============================================================================

export interface DbLapTime {
  id: string
  userId: string
  trackId: string
  carId: string
  buildId: string | null
  timeMs: number
  conditions: string | null
  notes: string | null
  sessionType: string | null
  createdAt: string
}

// ============================================================================
// Enriched Types (with relations)
// ============================================================================

export interface DbCarBuildWithRelations extends DbCarBuild {
  car: DbCar
  user: DbUser
  upgrades: DbCarBuildUpgrade[]
  settings: DbCarBuildSetting[]
}

export interface DbRaceWithRelations extends DbRace {
  track: DbTrack
  RaceCar: DbRaceCar[]
}

export interface DbRaceCarWithRelations extends DbRaceCar {
  car: DbCar
  build: DbCarBuild | null
}

export interface DbLapTimeWithRelations extends DbLapTime {
  track: DbTrack
  car: DbCar
  build: DbCarBuild | null
}
