import { NextResponse } from 'next/server'
import { z } from 'zod'

// Error types
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

export class ValidationError extends ApiError {
  constructor(message: string, public errors?: Record<string, string>) {
    super(400, message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message)
    this.name = 'ConflictError'
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', public details?: string) {
    super(500, message, details)
    this.name = 'InternalServerError'
  }
}

// Type guard for Supabase errors
interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  )
}

// Map common Supabase error codes to HTTP status codes
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

// Format Zod errors
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

// Main error handler function
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
