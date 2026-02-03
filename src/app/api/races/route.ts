/**
 * Race Management API
 *
 * GET /api/races - List all races (optional: ?isActive=true for active races only)
 * POST /api/races - Create a new race with track and builds
 *
 * Debugging Tips:
 * - Active races (isActive=true) are sorted by 'order' field first
 * - Race creation requires: trackId + array of buildIds
 * - RaceCar junction table links Race ↔ Car ↔ Build (many-to-many)
 * - buildId is NOT NULL (build-centric architecture)
 * - Race creator (createdById) is tracked for permission checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import type { DbRaceWithRelations, DbCarBuild } from '@/types/database'
import { CreateRaceSchema, UpdateRaceSchema, validateBody } from '@/lib/validation'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// GET /api/races - List all races with run list associations
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const isActiveParam = req.nextUrl.searchParams.get('isActive')

    let query = supabase
      .from('Race')
      .select(`
        *,
        track:Track(*),
        RaceCar(
          *,
          car:Car(id, name, slug, manufacturer),
          build:CarBuild(id, name, description)
        )
      `)

    // When filtering for active races, sort by order then createdAt
    if (isActiveParam === 'true') {
      query = query
        .eq('isActive', true)
        .order('order', { ascending: true, nullsFirst: false })
        .order('createdAt', { ascending: true })
    } else {
      // Default behavior: sort by creation date (active status handled in JS)
      query = query.order('createdAt', { ascending: false })
    }

    const { data: races, error: racesError } = await query

    if (racesError) {
      console.error('Error fetching races:', racesError)
      return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
    }

    // Sort: Active first, then by display name (only for non-active queries)
    let sortedRaces = races || []
    if (isActiveParam !== 'true') {
      sortedRaces = sortedRaces.sort((a, b) => {
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1
        }
        return getDisplayName(a).localeCompare(getDisplayName(b))
      })
    }

    return NextResponse.json({ races: sortedRaces })
  } catch (error) {
    console.error('Error fetching races:', error)
    return NextResponse.json(
      { error: 'Failed to fetch races' },
      { status: 500 }
    )
  }
}

// Helper function to generate display name for races without custom names
function getDisplayName(race: DbRaceWithRelations & { RaceCar?: Array<{ car?: { manufacturer?: string; name?: string } }> }): string {
  if (race.name) {
    return race.name
  }

  const trackName = race.track?.name || 'Unknown Track'
  const firstCar = race.RaceCar?.[0]?.car
  const carName = firstCar ? `${firstCar.manufacturer} ${firstCar.name}` : 'Unknown Car'

  return `${trackName} + ${carName}`
}

// POST /api/races - Create a new race with builds
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate request body with Zod
    const validationResult = await validateBody(CreateRaceSchema, body)
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    const { trackId, buildIds, name, description, laps, weather, isActive } = validationResult.data

    const supabase = createServiceRoleClient()

    // ============================================================
    // RACE CREATION VALIDATION
    // ============================================================
    // 1. Track must exist in Track table
    // 2. All builds must exist and be accessible
    // 3. buildIds array contains the builds to add to this race
    // 4. createdById is set to current authenticated user
    // ============================================================

    // Verify track exists
    const { data: track, error: trackError } = await supabase
      .from('Track')
      .select('id')
      .eq('id', trackId)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Verify all builds exist and get their car IDs
    const { data: builds, error: buildsError } = await supabase
      .from('CarBuild')
      .select('id, carId, car:Car(id, name, slug, manufacturer)')
      .in('id', buildIds)

    if (buildsError) {
      console.error('Error fetching builds:', buildsError)
      return NextResponse.json(
        { error: 'Failed to verify builds' },
        { status: 500 }
      )
    }

    if (!builds || builds.length !== buildIds.length) {
      return NextResponse.json(
        { error: 'One or more builds not found' },
        { status: 404 }
      )
    }

    // Generate race ID
    const raceId = crypto.randomUUID()

    // Create race
    const { data: race, error: raceError } = await supabase
      .from('Race')
      .insert({
        id: raceId,
        trackId,
        name: name || null,
        description: description || null,
        createdById: session.user.id,
        laps: laps || null,
        weather: weather || null,
        isActive: isActive || false,
      })
      .select()
      .single()

    if (raceError) {
      console.error('Error creating race:', raceError)
      return NextResponse.json({ error: 'Failed to create race' }, { status: 500 })
    }

    // ============================================================
    // RACECAR JUNCTION TABLE INSERTION
    // ============================================================
    // RaceCar links races to builds via cars (many-to-many)
    // Each entry: raceId + carId + buildId (buildId is required)
    // If insertion fails, we rollback the entire race creation
    // ============================================================

    // Create RaceCar entries for each build
    const raceCarEntries = builds.map((build: { id: string; carId: string }) => ({
      id: crypto.randomUUID(),
      raceId,
      carId: build.carId,
      buildId: build.id,
    }))

    const { error: raceCarError } = await supabase
      .from('RaceCar')
      .insert(raceCarEntries)

    if (raceCarError) {
      console.error('Error creating race cars:', raceCarError)
      // Rollback race creation
      await supabase.from('Race').delete().eq('id', raceId)
      return NextResponse.json(
        { error: 'Failed to add builds to race' },
        { status: 500 }
      )
    }

    // ============================================================
    // AUTO-POPULATE RACE MEMBERS
    // ============================================================
    // Automatically add all active users (USER, ADMIN) to new races
    // Graceful failure: if auto-population fails, allow race creation to succeed
    // Admins can manually add members via UI if needed
    // ============================================================

    try {
      // Fetch all active users
      const { data: activeUsers } = await supabase
        .from('User')
        .select('id')
        .in('role', ['USER', 'ADMIN'])

      if (activeUsers && activeUsers.length > 0) {
        // Get default Racing: Soft tyre
        const { data: defaultTyre } = await supabase
          .from('Part')
          .select('id')
          .eq('name', 'Racing: Soft')
          .single()

        if (defaultTyre) {
          const raceMembers = activeUsers.map((user, index) => ({
            id: crypto.randomUUID(),
            raceid: raceId,
            userid: user.id,
            partid: defaultTyre.id,
            "order": index + 1,
          }))

          const { error: membersError } = await supabase
            .from('RaceMember')
            .insert(raceMembers)

          if (membersError) {
            console.error('Error creating race members:', membersError)
            // Graceful failure: allow race creation to succeed
            // Admins can manually add members via UI
          }
        } else {
          console.warn('Default tyre (Racing: Soft) not found, skipping auto-population')
        }
      }
    } catch (error) {
      console.error('Error during race member auto-population:', error)
      // Graceful failure: allow race creation to succeed
    }

    // Fetch complete race data for response
    const { data: completeRace } = await supabase
      .from('Race')
      .select(`
        *,
        track:Track(*)
      `)
      .eq('id', raceId)
      .single()

    const { data: raceCars } = await supabase
      .from('RaceCar')
      .select(`
        *,
        car:Car(*),
        build:CarBuild(*)
      `)
      .eq('raceId', raceId)

    return NextResponse.json({
      ...completeRace,
      RaceCar: raceCars || [],
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating race:', error)
    return NextResponse.json(
      { error: 'Failed to create race' },
      { status: 500 }
    )
  }
}
