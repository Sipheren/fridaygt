/**
 * API request and response type definitions
 *
 * These types provide consistent typing for all API endpoints
 * and help standardize error handling and response formats.
 */

// ============================================================================
// Common API Types
// ============================================================================

/**
 * Standard API response wrapper for successful responses
 */
export interface ApiSuccessResponse<T> {
  data: T
}

/**
 * Standard API response wrapper for errors
 */
export interface ApiErrorResponse {
  error: string
  code?: string
  details?: string
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Paginated response metadata
 */
export interface ApiPaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Paginated API response
 */
export interface ApiPaginatedResponse<T> {
  data: T[]
  meta: ApiPaginationMeta
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Generic filter options for list endpoints
 */
export interface ApiFilterOptions {
  search?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Domain-specific Types
// ============================================================================

// ============================================================================
// Builds
// ============================================================================

export interface BuildListFilters extends ApiFilterOptions {
  public?: boolean
  myBuilds?: boolean
  carId?: string
}

export interface CreateBuildRequest {
  carId: string
  name: string
  description?: string
  isPublic?: boolean
  upgrades?: Array<{ partId: string }>
  settings?: Array<{ settingId: string; value: string }>
}

export interface UpdateBuildRequest {
  name?: string
  description?: string
  isPublic?: boolean
  upgrades?: Array<{ partId: string }>
  settings?: Array<{ settingId: string; value: string }>
}

export interface QuickBuildRequest {
  carId: string
  name: string
  description?: string
  isPublic?: boolean
}

// ============================================================================
// Races
// ============================================================================

export interface RaceListFilters extends ApiFilterOptions {
  isActive?: boolean
  trackId?: string
}

export interface CreateRaceRequest {
  trackId: string
  buildIds: string[]
  name?: string
  description?: string
  laps?: number
  weather?: 'dry' | 'wet'
  isActive?: boolean
}

export interface UpdateRaceRequest {
  trackId?: string
  buildIds?: string[]
  name?: string
  description?: string
  laps?: number
  weather?: 'dry' | 'wet'
  isActive?: boolean
}

// ============================================================================
// Lap Times
// ============================================================================

export interface LapTimeListFilters extends ApiFilterOptions {
  trackId?: string
  carId?: string
  buildId?: string
  conditions?: string
  sessionType?: string
}

export interface CreateLapTimeRequest {
  trackId: string
  carId: string
  buildId?: string
  timeMs: number
  conditions?: string
  notes?: string
  sessionType?: 'Q' | 'R' | null
}

// ============================================================================
// User
// ============================================================================

export interface UpdateProfileRequest {
  gamertag?: string
}

export interface UpdateUserRoleRequest {
  role: 'PENDING' | 'USER' | 'ADMIN'
}

// ============================================================================
// Validation Error Types
// ============================================================================

/**
 * Field-level validation error
 */
export interface FieldValidationError {
  field: string
  message: string
  code?: string
}

/**
 * Detailed validation error response
 */
export interface ValidationErrorResponse {
  error: string
  code: 'VALIDATION_ERROR'
  fields?: FieldValidationError[]
}

// ============================================================================
// HTTP Status Code Constants
// ============================================================================

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type HttpStatus = typeof HttpStatus[keyof typeof HttpStatus]
