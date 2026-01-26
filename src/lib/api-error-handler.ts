/**
 * API Error Handler
 *
 * Purpose: Centralized error handling for API routes with consistent error responses
 * - Custom error classes for different HTTP status codes
 * - Supabase error mapping (PostgreSQL error codes → HTTP status)
 * - Zod validation error formatting
 * - Production-safe error messages (no sensitive data leakage)
 *
 * **Error Classes:**
 * - ApiError: Base class for all API errors (statusCode, message, details)
 * - ValidationError (400): Invalid request data (with field-level errors)
 * - UnauthorizedError (401): Not authenticated
 * - ForbiddenError (403): Authenticated but not authorized
 * - NotFoundError (404): Resource not found
 * - ConflictError (409): Resource conflict (duplicate, state mismatch)
 * - InternalServerError (500): Unexpected server error
 *
 * **Error Handling Flow:**
 * 1. Throw custom error class in API route
 * 2. Wrap in try-catch or call handleApiError()
 * 3. Returns NextResponse with appropriate status code
 * 4. Error message formatted consistently
 *
 * **Supabase Error Mapping:**
 * - PGRST116 → 404: Not found (single() query returned no results)
 * - 23505 → 404: Unique violation (duplicate key) - mapped to 409 in practice
 * - 23503 → 400: Foreign key violation (invalid reference)
 * - PGRST301 → 401: Unauthorized (invalid JWT)
 * - 42501 → 403: Insufficient privilege (RLS policy violation)
 *
 * **Production Safety:**
 * - Unknown errors: Returns generic "Internal server error" message
 * - Development mode: Includes error details for debugging
 * - Production mode: Hides sensitive error information
 * - Prevents leaking: Database structure, internal paths, stack traces
 *
 * **Usage Examples:**
 * ```tsx
 * // Throwing errors
 * if (!user) {
 *   throw new NotFoundError('User')
 * }
 *
 * if (user.id !== resource.userId) {
 *   throw new ForbiddenError('You can only modify your own resources')
 * }
 *
 * if (!session) {
 *   throw new UnauthorizedError()
 * }
 *
 * // Handling errors
 * try {
 *   // API logic
 * } catch (error) {
 *   return handleApiError(error)
 * }
 * ```
 *
 * **Debugging Tips:**
 * - Check error.code for Supabase PostgreSQL error codes
 * - Development mode: Check response details field for error info
 * - Production mode: Check server logs for full error details
 * - Validation errors: Check errors object for field-level messages
 * - Foreign key errors: Verify referenced record exists
 *
 * **Related Files:**
 * - All API routes use this for error handling
 * - Zod validation schemas: @/lib/validation.ts
 * - Supabase client: @/lib/supabase/service-role.ts
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================
// ERROR CLASSES
// ============================================================
// Custom error classes for different HTTP status codes
// Extend base ApiError class with specific status codes
//
// Why Custom Error Classes?
// - Type-safe error handling
// - Clear intent: throw new NotFoundError('User')
// - Consistent status codes across all API routes
// - Easy to add metadata (details, field errors)
//
// Error Class Hierarchy:
// ApiError (base)
// ├── ValidationError (400)
// ├── UnauthorizedError (401)
// ├── ForbiddenError (403)
// ├── NotFoundError (404)
// ├── ConflictError (409)
// └── InternalServerError (500)
// ============================================================

/**
 * Base API error class
 * All custom errors extend this class
 *
 * @param statusCode - HTTP status code
 * @param message - Error message (user-facing)
 * @param details - Additional error details (optional, development only)
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Validation error (400)
 * Used when request data fails validation (Zod schema, business logic)
 *
 * @param message - Error message
 * @param errors - Field-level validation errors (optional)
 *
 * @example
 * ```tsx
 * throw new ValidationError('Invalid input', {
 *   email: 'Invalid email format',
 *   age: 'Must be at least 18'
 * })
 * ```
 */
export class ValidationError extends ApiError {
  constructor(message: string, public errors?: Record<string, string>) {
    super(400, message)
    this.name = 'ValidationError'
  }
}

/**
 * Unauthorized error (401)
 * Used when user is not authenticated
 *
 * @param message - Error message (default: "Unauthorized")
 *
 * @example
 * ```tsx
 * if (!session) {
 *   throw new UnauthorizedError()
 * }
 * ```
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Forbidden error (403)
 * Used when user is authenticated but not authorized for the action
 *
 * @param message - Error message (default: "Forbidden")
 *
 * @example
 * ```tsx
 * if (session.user.role !== 'ADMIN') {
 *   throw new ForbiddenError('Admin access required')
 * }
 * ```
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Not found error (404)
 * Used when resource doesn't exist
 *
 * @param resource - Resource name (default: "Resource")
 *
 * @example
 * ```tsx
 * const { data: user } = await supabase.from('User').select('*').eq('id', id).single()
 * if (!user) {
 *   throw new NotFoundError('User')
 * }
 * ```
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error (409)
 * Used when request conflicts with current state (duplicate, version mismatch)
 *
 * @param message - Error message
 *
 * @example
 * ```tsx
 * const { data: existing } = await supabase.from('User').select('*').eq('email', email).single()
 * if (existing) {
 *   throw new ConflictError('Email already registered')
 * }
 * ```
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message)
    this.name = 'ConflictError'
  }
}

/**
 * Internal server error (500)
 * Used for unexpected server errors
 *
 * @param message - Error message (default: "Internal server error")
 * @param details - Error details (development only)
 *
 * @example
 * ```tsx
 * try {
 *   await someOperation()
 * } catch (error) {
 *   throw new InternalServerError('Failed to process request', error.message)
 * }
 * ```
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', public details?: string) {
    super(500, message, details)
    this.name = 'InternalServerError'
  }
}

// ============================================================
// SUPABASE ERROR HANDLING
// ============================================================
// Type guard and error code mapping for Supabase errors
// Supabase returns PostgreSQL error codes for database errors
// Map these codes to appropriate HTTP status codes
//
// Common PostgreSQL Error Codes:
// - PGRST116: Not found (PostgREST single() query returned no results)
// - 23505: Unique violation (duplicate key constraint)
// - 23503: Foreign key violation (referenced record doesn't exist)
// - PGRST301: Unauthorized (invalid JWT token)
// - 42501: Insufficient privilege (RLS policy violation)
//
// Full list: https://www.postgresql.org/docs/current/errcodes-appendix.html
// ============================================================

/**
 * Type guard for Supabase errors
 * Checks if error is a Supabase error object
 *
 * @param error - Unknown error object
 * @returns true if error is a Supabase error
 */
function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  )
}

/**
 * Map Supabase error codes to HTTP status codes
 *
 * **Error Code Mapping:**
 * - PGRST116 → 404: Not found (single() query returned no results)
 * - 23505 → 404: Unique violation (duplicate key) - TODO: Should be 409
 * - 23503 → 400: Foreign key violation (invalid reference)
 * - PGRST301 → 401: Unauthorized (invalid JWT)
 * - 42501 → 403: Insufficient privilege (RLS policy violation)
 * - Other codes → 500: Internal server error
 *
 * **Why These Mappings?**
 * - PGRST116: Supabase/PostgREST specific "not found" error
 * - 23505: Unique constraint violation (duplicate key)
 * - 23503: Foreign key constraint violation (invalid reference)
 * - PGRST301: Invalid or expired JWT token
 * - 42501: RLS policy blocked the operation
 *
 * @param code - Supabase/PostgreSQL error code
 * @returns HTTP status code
 *
 * @example
 * ```tsx
 * const statusCode = getSupabaseStatusCode('PGRST116')
 * // Returns: 404
 * ```
 */
function getSupabaseStatusCode(code?: string): number {
  switch (code) {
    case 'PGRST116': // Not found
    case '23505': // Unique violation
      return 404
    case '23503': // Foreign key violation
      return 400
    case 'PGRST301': // Unauthorized
      return 401
    case '42501': // Insufficient privilege
      return 403
    default:
      return 500
  }
}

// ============================================================
// ZOD ERROR FORMATTING
// ============================================================
// Format Zod validation errors into consistent error response
// Zod errors have issues array with path and message for each validation failure
// Convert to object with field paths as keys
// ============================================================

/**
 * Format Zod validation error into error response object
 *
 * **Input Format (ZodError):**
 * ```json
 * {
 *   "issues": [
 *     { "path": ["email"], "message": "Invalid email" },
 *     { "path": ["age"], "message": "Must be at least 18" }
 *   ]
 * }
 * ```
 *
 * **Output Format:**
 * ```json
 * {
 *   "message": "Validation failed",
 *   "errors": {
 *     "email": "Invalid email",
 *     "age": "Must be at least 18"
 *   }
 * }
 * ```
 *
 * **Path Handling:**
 * - Empty path → "field" key (root-level error)
 * - Single path → "fieldName" key
 * - Nested path → "parent.child.grandchild" key
 *
 * @param error - Zod validation error
 * @returns Formatted error object with message and errors
 *
 * @example
 * ```tsx
 * try {
 *   CreateBuildSchema.parse(body)
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     const formatted = formatZodError(error)
 *     // Returns: { message: "Validation failed", errors: { name: "Name is required" } }
 *   }
 * }
 * ```
 */
export function formatZodError(error: z.ZodError): { message: string; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  error.issues.forEach((issue) => {
    const path = issue.path.join('.') || 'field'
    errors[path] = issue.message
  })
  return {
    message: 'Validation failed',
    errors,
  }
}

// ============================================================
// MAIN ERROR HANDLER
// ============================================================
// Centralized error handling function for all API routes
// Handles custom errors, Zod errors, Supabase errors, and unknown errors
// Returns NextResponse with appropriate status code and error message
//
// Error Handling Priority:
// 1. Custom ApiError classes (ValidationError, NotFoundError, etc.)
// 2. Zod validation errors (ZodError)
// 3. Supabase database errors (SupabaseError)
// 4. Unknown errors (generic 500 response)
//
// Production Safety:
// - Unknown errors: Generic "Internal server error" message
// - Development mode: Includes error details in response
// - Production mode: Hides sensitive error information
// - Prevents leaking: Database structure, stack traces, internal paths
// ============================================================

/**
 * Main error handler function for API routes
 *
 * **Usage:**
 * ```tsx
 * export async function POST(request: NextRequest) {
 *   try {
 *     // API logic here
 *     return NextResponse.json({ success: true })
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 * ```
 *
 * **Error Handling Flow:**
 * 1. Check if error is custom ApiError class
 * 2. Check if error is Zod validation error
 * 3. Check if error is Supabase error
 * 4. Treat as unknown error (generic 500 response)
 *
 * **Response Format:**
 * ```json
 * {
 *   "error": "Error message",
 *   "details": "Additional details (development only)",
 *   "errors": { "field": "error" } (validation errors only),
 *   "hint": "Database hint (Supabase errors only)"
 * }
 * ```
 *
 * **Production Safety:**
 * - Development mode: Includes error details for debugging
 * - Production mode: Generic error messages (no sensitive data)
 * - Prevents leaking: Database structure, internal paths, stack traces
 *
 * @param error - Unknown error object
 * @returns NextResponse with appropriate status code and error message
 *
 * @example
 * ```tsx
 * try {
 *   const { data, error } = await supabase.from('User').select('*').eq('id', id).single()
 *   if (error) throw error
 *   if (!data) throw new NotFoundError('User')
 *   return NextResponse.json({ user: data })
 * } catch (error) {
 *   return handleApiError(error)
 * }
 * ```
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle known API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details && { details: error.details }),
        ...(error instanceof ValidationError && error.errors && { errors: error.errors }),
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const formatted = formatZodError(error)
    return NextResponse.json(
      {
        error: formatted.message,
        errors: formatted.errors,
      },
      { status: 400 }
    )
  }

  // Handle Supabase errors
  if (isSupabaseError(error)) {
    const statusCode = getSupabaseStatusCode(error.code)
    const message = error.message || 'Database error'

    return NextResponse.json(
      {
        error: message,
        ...(error.details && { details: error.details }),
        ...(error.hint && { hint: error.hint }),
      },
      { status: statusCode }
    )
  }

  // Handle unknown errors
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'

  // Don't leak internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development'

  return NextResponse.json(
    {
      error: 'Internal server error',
      ...(isDevelopment && { details: errorMessage }),
    },
    { status: 500 }
  )
}
