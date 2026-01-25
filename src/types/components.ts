/**
 * Component type definitions
 *
 * These types are used across multiple components and should be imported
 * from this central location to avoid duplication and ensure consistency.
 */

// ============================================================================
// Shared Entity Types (simplified for component use)
// ============================================================================

export interface ComponentCar {
  id: string
  name: string
  slug: string
  manufacturer: string
  year: number | null
}

export interface ComponentTrack {
  id: string
  name: string
  slug: string
  location: string | null
  length: number | null
}

export interface ComponentUser {
  id: string
  name: string | null
  email: string
}

// ============================================================================
// Lap Times
// ============================================================================

export interface ComponentLapTime {
  id: string
  timeMs: number
  notes: string | null
  conditions: string | null
  createdAt: string
  buildId: string | null
  buildName: string | null
  user: ComponentUser
  car?: ComponentCar
  track?: ComponentTrack
}

export interface TrackLapData {
  track: ComponentTrack
  personalBest: number
  totalLaps: number
  recentLapTimes: ComponentLapTime[]
}

export interface LapTimesByCarGroup {
  car: ComponentCar
  personalBest: number
  totalLaps: number
  recentLapTimes: ComponentLapTime[]
}

// ============================================================================
// Builds
// ============================================================================

export interface ComponentBuild {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  user: ComponentUser
  car: ComponentCar
  _count?: {
    upgrades: number
    settings: number
  }
  stats?: {
    lapCount: number
    bestTime: number | null
  }
}

export interface BuildWithCarStats extends ComponentBuild {
  stats?: {
    lapCount: number
    bestTime: number | null
  }
}

// ============================================================================
// Statistics
// ============================================================================

export interface LapTimeStatistics {
  totalLaps: number
  fastestTime: number | null
  averageTime: number | null
  uniqueTracks: number
  uniqueDrivers: number
}

export interface BuildStatistics {
  totalBuilds: number
  publicBuilds: number
  privateBuilds: number
}

// ============================================================================
// Component Props
// ============================================================================

export interface CarLapTimesProps {
  carSlug: string
  carName: string
}

export interface TrackLapTimesProps {
  trackSlug: string
  trackName: string
}

export interface CarBuildsProps {
  carId: string
  carName: string
}

export interface TrackBuildsProps {
  trackId: string
  trackName: string
}
