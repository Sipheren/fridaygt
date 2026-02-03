/**
 * Quick Build Creation API
 *
 * POST /api/builds/quick - Create a build with minimal fields (no upgrades/settings)
 *
 * Purpose: Simplified build creation for inline modals (e.g., during race creation)
 * - Used when user needs to create a build without leaving the current flow
 * - Only requires: carId, name, description (all optional)
 * - No upgrades or settings included (can be added later via edit)
 * - Always assigned to current user (userId from session)
 * - Always private (isPublic = false)
 * - Designed for speed - minimal validation, no catalog lookups
 *
 * Differences from full build creation (POST /api/builds):
 * - No upgrades array - parts can be added later
 * - No settings array - tuning can be configured later
 * - No gear ratios - transmission set to stock defaults
 * - No userId parameter - always current user
 * - No isPublic parameter - always private
 *
 * Debugging Tips:
 * - Common error: "Car not found" - verify carId exists in Car table
 * - Uses custom error handler (handleApiError) for consistent error responses
 * - Rate limited to 20 requests per minute
 * - Returns complete build with car details for immediate use
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { QuickBuildSchema, validateBody } from '@/lib/validation'
import { handleApiError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/api-error-handler'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // ============================================================
    // RATE LIMITING
    // ============================================================
    // Apply rate limiting: 20 requests per minute to prevent abuse
    // Debugging: Check rate limit headers in response if 429 errors occur
    // ============================================================

    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // ============================================================
    // AUTHENTICATION
    // ============================================================
    // User must be authenticated to create builds
    // Uses custom error handler (UnauthorizedError) for consistent responses
    // ============================================================

    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    // ============================================================
    // VALIDATION
    // ============================================================
    // Validate request body with Zod schema
    // QuickBuildSchema: carId (required), name (required), description (optional)
    // Uses custom error handler (ValidationError) for consistent responses
    // ============================================================

    const body = await req.json()

    const validationResult = await validateBody(QuickBuildSchema, body)
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error)
    }

    const { carId, name, description } = validationResult.data

    const supabase = createServiceRoleClient()

    // ============================================================
    // CAR VERIFICATION
    // ============================================================
    // Verify car exists in Car table before creating build
    // Prevents orphaned builds with invalid carId
    // Uses custom error handler (NotFoundError) for consistent responses
    //
    // Debugging Tips:
    // - Common error: "Car not found" - verify carId exists in Car table
    // - Check carId format (should be UUID)
    // ============================================================

    const { data: car, error: carError } = await supabase
      .from('Car')
      .select('id, name, manufacturer')
      .eq('id', carId)
      .single()

    if (carError || !car) {
      throw new NotFoundError('Car')
    }

    // ============================================================
    // BUILD CREATION
    // ============================================================
    // Create CarBuild record with minimal fields
    // - No upgrades (parts can be added later via edit)
    // - No settings (tuning can be configured later via edit)
    // - No gear ratios (transmission uses stock defaults)
    // - isPublic = false (quick builds are private by default)
    // - userId from session (always current user)
    //
    // Debugging Tips:
    // - Check carId FK constraint: CarBuild.carId → Car.id
    // - Verify userId is valid User table ID
    // - Build created even if parts/tuning not configured yet
    // ============================================================

    const buildId = crypto.randomUUID()
    const now = new Date().toISOString()

    const { error: buildError } = await supabase
      .from('CarBuild')
      .insert({
        id: buildId,
        userId: session.user.id,
        carId,
        name,
        description,
        isPublic: false, // Quick builds are private by default
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (buildError) {
      throw buildError // Will be caught by handleApiError
    }

    // ============================================================
    // FETCH COMPLETE BUILD FOR RESPONSE
    // ============================================================
    // Fetch newly created build with car details
    // Returns complete build data to frontend for immediate use
    // Includes: car details (id, name, slug, manufacturer, year, category)
    // Does NOT include: user, upgrades, settings (not needed for quick create)
    //
    // Debugging Tips:
    // - Build should be immediately available for race creation
    // - Can be edited later to add parts and tuning
    // ============================================================

    const { data: completeBuild } = await supabase
      .from('CarBuild')
      .select(`
        *,
        car:Car(id, name, slug, manufacturer, year, category)
      `)
      .eq('id', buildId)
      .single()

    // Add rate limit headers to successful response
    return NextResponse.json(completeBuild, {
      status: 201,
      headers: rateLimitHeaders(rateLimit),
    })
  } catch (error) {
    // ============================================================
    // ERROR HANDLING
    // ============================================================
    // Custom error handler (handleApiError) catches all error types
    // - UnauthorizedError: 401 - User not authenticated
    // - ValidationError: 400 - Invalid request body
    // - NotFoundError: 404 - Car not found
    // - Generic errors: 500 - Internal server error
    //
    // Debugging Tips:
    // - Check console logs for error details
    // - Common errors: RLS violations, FK constraints, validation failures
    // ============================================================

    return handleApiError(error)
  }
}
