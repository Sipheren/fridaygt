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
  // Gear ratios as text (to preserve leading/trailing zeros)
  finalDrive: string | null
  gear1: string | null
  gear2: string | null
  gear3: string | null
  gear4: string | null
  gear5: string | null
  gear6: string | null
  gear7: string | null
  gear8: string | null
  gear9: string | null
  gear10: string | null
  gear11: string | null
  gear12: string | null
  gear13: string | null
  gear14: string | null
  gear15: string | null
  gear16: string | null
  gear17: string | null
  gear18: string | null
  gear19: string | null
  gear20: string | null
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
  order: number | null
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

export interface DbRaceMember {
  id: string
  raceid: string
  userid: string
  partid: string
  order: number
  createdat: string
  updatedat: string
  updatedbyid: string | null
}

// ============================================================================
// Notes
// ============================================================================

export type NoteWidth = 'small' | 'medium' | 'large'

export interface DbNote {
  id: string
  title: string
  content: string
  color: string
  positionX: number
  positionY: number
  width: NoteWidth
  pinned: boolean
  tags: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DbNoteWithUser extends DbNote {
  user: DbUser
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
