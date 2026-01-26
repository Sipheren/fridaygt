/**
 * Lap Time Management API
 *
 * GET /api/lap-times - Get current user's lap times with optional filtering
 * POST /api/lap-times - Record a new lap time (build-centric with snapshot)
 *
 * Purpose: Track lap times with build-centric architecture and snapshot data
 * - Users can only view their own lap times (RLS enforced via userId filter)
 * - buildName stored as snapshot (preserves name even if build renamed/deleted)
 * - Personal best tracking per car/track/build combination
 * - Session types: Race (R), Practice (P), Qualifying (Q)
 *
 * GET Endpoint:
 * - Filters: trackId, carId, limit (optional)
 * - Returns only current user's lap times (no admin override)
 * - Sorted by createdAt descending (newest first)
 * - Includes track and car relationship data
 *
 * POST Endpoint:
 * - Required: trackId, carId, buildId (optional), timeMs
 * - Optional: notes, conditions, sessionType (defaults to 'R')
 * - buildName snapshot: Copied from CarBuild.name at creation time
 * - Personal best: Application-level feature (calculated on frontend)
 *
 * Time Format:
 * - timeMs in milliseconds (e.g., 92345 = 1:32.345)
 * - Display format: mm:ss.sss (handled by frontend)
 *
 * Build Snapshot Strategy:
 * - buildName copied from CarBuild at creation time
 * - Preserves historical data even if build is renamed or deleted
 * - buildId can be null (lap times without build association)
 * - If buildId provided but build not found, buildName = null
 *
 * Debugging Tips:
 * - GET: Check userId filter returns only current user's times
 * - POST: Verify trackId and carId exist in respective tables
 * - POST: buildName snapshot prevents broken references
 * - Common error: "Track not found" - verify trackId exists in Track table
 * - Common error: "Car not found" - verify carId exists in Car table
 * - Personal best: Calculated by frontend comparing times per car/track/build
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth-utils'
import { CreateLapTimeSchema, validateBody } from '@/lib/validation'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// GET /api/lap-times - Get user's lap times with optional filtering
export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================
    // User must be authenticated to view lap times
    // RLS ensures users can only see their own lap times
    // Debugging: Check session.user.email is set
    // ============================================================

    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    const carId = searchParams.get('carId')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // ============================================================
    // VALIDATION
    // ============================================================
    // Validate limit parameter (if provided)
    // Must be positive integer
    // Debugging: Check limit is valid number > 0
    // ============================================================

    if (limitParam && (isNaN(limit as number) || (limit as number) < 1)) {
      return NextResponse.json(
        { error: 'Limit must be a positive number' },
        { status: 400 }
      )
    }

    // Get user's ID for filtering
    const userData = await getCurrentUser(session)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ============================================================
    // BUILD QUERY WITH FILTERS
    // ============================================================
    // Build base query with:
    // - userId filter (RLS enforcement - only current user's times)
    // - Track relationship data
    // - Car relationship data
    // - Sorted by createdAt descending (newest first)
    //
    // Optional Filters:
    // - trackId: Filter to specific track
    // - carId: Filter to specific car
    // - limit: Limit number of results
    //
    // Debugging Tips:
    // - Check userId matches userData.id
    // - Verify trackId/carId exist in respective tables
    // - Test with/without limit parameter
    // ============================================================

    let query = supabase
      .from('LapTime')
      .select(`
        id,
        timeMs,
        notes,
        conditions,
        sessionType,
        createdAt,
        updatedAt,
        buildId,
        buildName,
        track:Track(id, name, slug, location, category, layout),
        car:Car(id, name, slug, manufacturer, year, category)
      `)
      .eq('userId', userData.id)
      .order('createdAt', { ascending: false })

    // Apply filters
    if (trackId) {
      query = query.eq('trackId', trackId)
    }
    if (carId) {
      query = query.eq('carId', carId)
    }
    if (limit) {
      query = query.limit(limit)
    }

    const { data: lapTimes, error } = await query

    if (error) {
      console.error('Error fetching lap times:', error)
      return NextResponse.json(
        { error: 'Failed to fetch lap times' },
        { status: 500 }
      )
    }

    return NextResponse.json({ lapTimes })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/lap-times - Create a new lap time
export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // RATE LIMITING & AUTHENTICATION
    // ============================================================
    // Apply rate limiting: 20 requests per minute to prevent abuse
    // Debugging: Check rate limit headers in response if 429 errors occur
    // ============================================================

    const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================
    // VALIDATION
    // ============================================================
    // Validate request body with Zod schema
    // CreateLapTimeSchema validates:
    // - trackId (required, valid UUID)
    // - carId (required, valid UUID)
    // - buildId (optional, valid UUID)
    // - timeMs (required, positive integer)
    // - notes (optional, string)
    // - conditions (optional, string)
    // - sessionType (optional, 'R' | 'P' | 'Q')
    // ============================================================

    const body = await request.json()

    const validationResult = await validateBody(CreateLapTimeSchema, body)
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    const { trackId, carId, buildId, timeMs, notes, conditions, sessionType } = validationResult.data

    const supabase = createServiceRoleClient()

    // Get user's ID for ownership
    const userData = await getCurrentUser(session)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ============================================================
    // TRACK & CAR VERIFICATION
    // ============================================================
    // Verify track exists before creating lap time
    // Prevents orphaned lap times with invalid trackId
    // Debugging: Check Track table for trackId
    //
    // Verify car exists before creating lap time
    // Prevents orphaned lap times with invalid carId
    // Debugging: Check Car table for carId
    // ============================================================

    const { data: track } = await supabase
      .from('Track')
      .select('id')
      .eq('id', trackId)
      .single()

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const { data: car } = await supabase
      .from('Car')
      .select('id')
      .eq('id', carId)
      .single()

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    // ============================================================
    // BUILD NAME SNAPSHOT
    // ============================================================
    // buildName is stored as a snapshot at time of lap time creation
    // This preserves the build name even if the build is later renamed or deleted
    //
    // Why Snapshot Strategy?
    // - Builds can be renamed (build name changes)
    // - Builds can be deleted (build becomes inaccessible)
    // - Snapshot preserves historical accuracy of lap time records
    // - Allows "What build did I use for this lap?" even after changes
    //
    // Implementation:
    // - If buildId provided: Fetch CarBuild.name and store as buildName
    // - If buildId not provided: buildName = null (lap time without build)
    // - If buildId provided but build not found: buildName = null (graceful degradation)
    //
    // Debugging Tips:
    // - Check CarBuild table for buildId
    // - buildName should match CarBuild.name at time of creation
    // - If build deleted later, buildName still shows historical name
    // ============================================================

    let buildName = null
    if (buildId) {
      const { data: build } = await supabase
        .from('CarBuild')
        .select('name')
        .eq('id', buildId)
        .single()

      if (build) {
        buildName = build.name
      }
    }

    // ============================================================
    // CREATE LAP TIME
    // ============================================================
    // Create LapTime record with snapshot data
    // - userId: Current user (owner of the lap time)
    // - trackId: Verified track reference
    // - carId: Verified car reference
    // - buildId: Optional build reference (can be null)
    // - buildName: Snapshot of build name (preserved history)
    // - timeMs: Lap time in milliseconds
    // - notes: Optional user notes
    // - conditions: Optional track conditions description
    // - sessionType: 'R' (Race), 'P' (Practice), 'Q' (Qualifying)
    //
    // Debugging Tips:
    // - Check FK constraints: LapTime.trackId → Track.id, LapTime.carId → Car.id
    // - buildId FK constraint: LapTime.buildId → CarBuild.id (if provided)
    // - Verify timeMs is positive integer
    // - Personal best: Calculated by frontend, not stored here
    // ============================================================

    const now = new Date().toISOString()
    const { data: lapTime, error } = await supabase
      .from('LapTime')
      .insert({
        id: crypto.randomUUID(),
        userId: userData.id,
        trackId,
        carId,
        buildId: buildId || null,
        buildName: buildName,
        timeMs,
        notes: notes || null,
        conditions: conditions || null,
        sessionType: sessionType || 'R',
        createdAt: now,
        updatedAt: now,
      })
      .select(`
        id,
        timeMs,
        notes,
        conditions,
        sessionType,
        createdAt,
        updatedAt,
        buildId,
        buildName,
        track:Track(id, name, slug, location, category, layout),
        car:Car(id, name, slug, manufacturer, year, category)
      `)
      .single()

    if (error) {
      console.error('[LAP TIME API] Error creating lap time:', error)
      return NextResponse.json(
        { error: 'Failed to create lap time' },
        { status: 500 }
      )
    }

    return NextResponse.json({ lapTime }, { status: 201 })
  } catch (error) {
    console.error('[LAP TIME API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
