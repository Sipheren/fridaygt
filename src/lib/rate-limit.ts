import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting (use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, value] of entries) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

export interface RateLimitOptions {
  /** Number of requests allowed in the time window */
  limit?: number
  /** Time window in milliseconds */
  windowMs?: number
  /** Custom identifier generator (defaults to IP address) */
  identifier?: (request: NextRequest) => string | Promise<string>
  /** Custom error message */
  errorMessage?: string
  /** Whether to skip successful requests from counting */
  skipSuccessfulRequests?: boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

const defaultOptions: Required<RateLimitOptions> = {
  limit: 100,
  windowMs: 60000, // 1 minute
  identifier: (request) => {
    // Get IP address from various headers
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare

    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    if (realIp) {
      return realIp
    }
    if (cfConnectingIp) {
      return cfConnectingIp
    }

    // Fallback to a generic identifier
    return 'anonymous'
  },
  errorMessage: 'Too many requests, please try again later.',
  skipSuccessfulRequests: false,
}

/**
 * Rate limit middleware for Next.js API routes
 *
 * @example
 * ```ts
 * export async function POST(req: NextRequest) {
 *   const rateLimit = await checkRateLimit(req, {
 *     limit: 10,
 *     windowMs: 60000, // 1 minute
 *   })
 *
 *   if (!rateLimit.success) {
 *     return NextResponse.json(
 *       { error: 'Too many requests' },
 *       { status: 429, headers: rateLimitHeaders(rateLimit) }
 *     )
 *   }
 *
 *   // Handle request...
 * }
 * ```
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const opts = { ...defaultOptions, ...options }

  // Get identifier
  const identifier = await opts.identifier(request)
  const key = `${identifier}:${request.nextUrl.pathname}`

  const now = Date.now()
  const windowStart = now - opts.windowMs

  // Get current rate limit data
  let data = rateLimitStore.get(key)

  // Reset if window has expired
  if (!data || now > data.resetTime) {
    data = { count: 0, resetTime: now + opts.windowMs }
    rateLimitStore.set(key, data)
  }

  // Increment counter
  data.count++

  // Check if limit exceeded
  const success = data.count <= opts.limit
  const remaining = Math.max(0, opts.limit - data.count)

  return {
    success,
    limit: opts.limit,
    remaining,
    resetTime: data.resetTime,
  }
}

/**
 * Generate rate limit headers for the response
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'Retry-After': Math.max(0, Math.ceil((result.resetTime - Date.now()) / 1000)).toString(),
  }
}

/**
 * Higher-order function that wraps an API route handler with rate limiting
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   async (req: NextRequest) => {
 *     // Your handler code
 *     return NextResponse.json({ success: true })
 *   },
 *   { limit: 10, windowMs: 60000 }
 * )
 * ```
 */
export function withRateLimit<
  T extends NextRequest | { request: NextRequest } = NextRequest
>(
  handler: (request: T, ...args: any[]) => Promise<NextResponse>,
  options: RateLimitOptions = {}
) {
  return async (request: T, ...args: any[]): Promise<NextResponse> => {
    // Handle both NextRequest and objects with NextRequest property
    const req = 'request' in request ? (request as { request: NextRequest }).request : (request as NextRequest)

    const result = await checkRateLimit(req, options)

    // Add rate limit headers to all responses
    const headers = rateLimitHeaders(result)

    if (!result.success) {
      return NextResponse.json(
        {
          error: options.errorMessage || defaultOptions.errorMessage,
        },
        {
          status: 429,
          headers,
        }
      )
    }

    // Call the original handler
    const response = await handler(request, ...args)

    // Add rate limit headers to the response
    const headersRecord = headers as Record<string, string>
    response.headers.set('X-RateLimit-Limit', headersRecord['X-RateLimit-Limit'] || '')
    response.headers.set('X-RateLimit-Remaining', headersRecord['X-RateLimit-Remaining'] || '')
    response.headers.set('X-RateLimit-Reset', headersRecord['X-RateLimit-Reset'] || '')

    return response
  }
}

/**
 * Pre-configured rate limits for different endpoint types
 */
export const RateLimit = {
  /** Strict rate limit for authentication endpoints */
  Auth: (options?: Partial<RateLimitOptions>) => ({
    limit: 5,
    windowMs: 60000, // 5 requests per minute
    ...options,
  }),

  /** Moderate rate limit for API mutations (POST, PUT, PATCH, DELETE) */
  Mutation: (options?: Partial<RateLimitOptions>) => ({
    limit: 20,
    windowMs: 60000, // 20 requests per minute
    ...options,
  }),

  /** Lenient rate limit for API queries (GET) */
  Query: (options?: Partial<RateLimitOptions>) => ({
    limit: 100,
    windowMs: 60000, // 100 requests per minute
    ...options,
  }),

  /** Strict rate limit for expensive operations */
  Expensive: (options?: Partial<RateLimitOptions>) => ({
    limit: 3,
    windowMs: 60000, // 3 requests per minute
    ...options,
  }),
}
