import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { UpdateRaceSchema, validateBody } from '@/lib/validation'
import type { DbRace, DbRaceCar, DbCarBuild, DbUser, DbTrack, DbLapTime, DbCar } from '@/types/database'

// Enriched lap time type with nested user and car data
type DbLapTimeWithRelations = DbLapTime & {
  user: DbUser
  car: DbCar
  buildId: string | null
  buildName: string | null
}

// Enriched race type with raceCars property
type DbRaceWithCars = DbRace & {
  raceCars?: Array<DbRaceCar & {
    car?: DbCar
    build?: DbCarBuild
  }>
}

// GET /api/races/[id] - Get a single race with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()

    // Get race basic info
    const { data: race, error: raceError } = await supabase
      .from('Race')
      .select('*')
      .eq('id', id)
      .single()

    if (raceError || !race) {
      console.error('Error fetching race:', raceError)
      return NextResponse.json({ error: 'Race not found', details: raceError?.message }, { status: 404 })
    }

    // Get track info
    const { data: track } = await supabase
      .from('Track')
      .select('*')
      .eq('id', race.trackId)
      .single()

    // Get created by user
    const { data: createdBy } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', race.createdById)
      .single()

    // Get race cars with nested data
    const { data: raceCars } = await supabase
      .from('RaceCar')
      .select(`
        id,
        carId,
        buildId,
        car:Car(id, name, slug, manufacturer, year, category, imageUrl),
        build:CarBuild(id, name, description, isPublic)
      `)
      .eq('raceId', id)

    // Attach related data to race object
    const enrichedRace: DbRace & {
      track?: DbTrack
      createdBy?: DbUser
      RaceCar: DbRaceCar[]
    } = {
      ...race,
      track,
      createdBy,
      RaceCar: raceCars || [],
    }

    // Get all lap times for this race (ONLY from builds in this race at this track)
    const trackId = track?.id || race.trackId
    const buildIds = raceCars?.map((rc: any) => rc.buildId).filter(Boolean) || []

    const { data: lapTimes } = await supabase
      .from('LapTime')
      .select(`
        id,
        timeMs,
        notes,
        conditions,
        createdAt,
        updatedAt,
        sessionType,
        buildId,
        buildName,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year)
      `)
      .eq('trackId', trackId)
      .in('buildId', buildIds)  // Filter to ONLY builds in this race
      .order('timeMs', { ascending: true })

    // Calculate leaderboard (best time per user per car per build)
    const leaderboardMap = new Map<string, {
      userId: string
      userName: string | null
      userEmail: string
      carId: string
      carName: string
      buildId: string | null
      buildName: string | null
      bestTime: number
      totalLaps: number
      bestLapId: string
      lastImprovement: string
    }>()

    for (const lapTime of lapTimes || []) {
      const user = (lapTime as any).user
      const car = (lapTime as any).car
      const userId = user?.id
      const carId = car?.id
      const buildId = (lapTime as any).buildId || null
      const buildName = (lapTime as any).buildName || null

      if (!userId || !carId) continue

      const key = `${userId}-${carId}-${buildId || 'none'}`

      if (!leaderboardMap.has(key)) {
        leaderboardMap.set(key, {
          userId,
          userName: user.name,
          userEmail: user.email,
          carId,
          carName: `${car.manufacturer} ${car.name}`,
          buildId,
          buildName,
          bestTime: lapTime.timeMs,
          totalLaps: 1,
          bestLapId: lapTime.id,
          lastImprovement: lapTime.createdAt
        })
      } else {
        const userData = leaderboardMap.get(key)!
        userData.totalLaps++
        if (lapTime.timeMs < userData.bestTime) {
          userData.bestTime = lapTime.timeMs
          userData.bestLapId = lapTime.id
          userData.lastImprovement = lapTime.createdAt
        }
      }
    }

    // Convert to array and sort by best time
    const leaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => a.bestTime - b.bestTime)
      .map((entry, index) => ({
        ...entry,
        position: index + 1
      }))

    // Get current user's data if logged in
    const session = await auth()
    let userStats = null
    if (session?.user?.email) {
      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (userData) {
        const userLapTimes = (lapTimes || []).filter((lt: any) => lt.user?.id === userData.id)

        if (userLapTimes.length > 0) {
          const times = userLapTimes.map(lt => lt.timeMs)
          const bestTime = Math.min(...times)
          const userLeaderboardEntry = leaderboard.find(entry => entry.userId === userData.id)

          userStats = {
            userId: userData.id,
            totalLaps: userLapTimes.length,
            bestTime,
            averageTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
            position: userLeaderboardEntry?.position || null,
            recentLaps: userLapTimes
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 10)
          }
        }
      }
    }

    // Calculate overall statistics
    const allTimes = lapTimes?.map(lt => lt.timeMs) || []
    const statistics = {
      totalLaps: lapTimes?.length || 0,
      uniqueDrivers: new Set((lapTimes || []).map((lt: any) => lt.user?.id).filter(Boolean)).size,
      fastestTime: allTimes.length > 0 ? Math.min(...allTimes) : null,
      averageTime: allTimes.length > 0
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : null,
      worldRecord: leaderboard.length > 0 ? leaderboard[0] : null
    }

    return NextResponse.json({
      race,
      leaderboard,
      userStats,
      statistics,
      recentActivity: (lapTimes || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/races/[id] - Update a race (build-centric)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body with Zod
    const validationResult = await validateBody(UpdateRaceSchema, body)
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    const { name, description, buildIds, laps, weather, isActive } = validationResult.data

    const supabase = createServiceRoleClient()

    // Get user's ID
    const { data: userData } = await supabase
      .from('User')
      .select('id, role')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get race to check permissions
    const { data: existingRace } = await supabase
      .from('Race')
      .select('createdById')
      .eq('id', id)
      .single()

    if (!existingRace) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    // Check if user is creator or admin
    const isCreator = existingRace.createdById === userData.id
    const isAdmin = userData.role === 'ADMIN'

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied - only the creator or admins can edit this race' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()
    const updates: Partial<{
      name: string | null
      description: string | null
      laps: number | null
      weather: string | null
      isActive: boolean
      updatedAt: string
    }> = {
      updatedAt: now
    }

    if (name !== undefined) updates.name = name || null
    if (description !== undefined) updates.description = description || null
    if (laps !== undefined) updates.laps = laps || null
    if (weather !== undefined) updates.weather = weather || null
    if (isActive !== undefined) updates.isActive = isActive
    // Note: trackId is NOT updatable - track is immutable for races

    // Update race basic info
    const { data: race, error: raceError } = await supabase
      .from('Race')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        name,
        description,
        laps,
        weather,
        isActive,
        createdAt,
        updatedAt,
        track:Track(id, name, slug, location, length, category, layout),
        createdBy:User(id, name, email)
      `)
      .single()

    if (raceError) {
      console.error('Error updating race:', raceError)
      return NextResponse.json(
        { error: 'Failed to update race', details: raceError.message },
        { status: 500 }
      )
    }

    // If buildIds are being updated, handle that
    if (buildIds && Array.isArray(buildIds)) {
      // Verify all builds exist
      const { data: builds } = await supabase
        .from('CarBuild')
        .select('id, carId')
        .in('id', buildIds)

      if (!builds || builds.length !== buildIds.length) {
        return NextResponse.json({ error: 'One or more builds not found' }, { status: 404 })
      }

      // Delete existing race cars
      await supabase.from('RaceCar').delete().eq('raceId', id)

      // Create new race car entries (one per build)
      const raceCarsToInsert = builds.map((build: any) => ({
        id: crypto.randomUUID(),
        raceId: id,
        carId: build.carId,
        buildId: build.id,
        createdAt: now,
        updatedAt: now,
      }))

      const { error: carsError } = await supabase
        .from('RaceCar')
        .insert(raceCarsToInsert)

      if (carsError) {
        console.error('Error updating race cars:', carsError)
        return NextResponse.json(
          { error: 'Failed to update builds in race', details: carsError.message },
          { status: 500 }
        )
      }

      // Fetch the updated race cars
      const { data: createdCars } = await supabase
        .from('RaceCar')
        .select(`
          id,
          carId,
          buildId,
          car:Car(id, name, slug, manufacturer, year, category),
          build:CarBuild(id, name, description, isPublic)
        `)
        .eq('raceId', id)

      // Attach cars to race
      return NextResponse.json({
        race: {
          ...race,
          raceCars: createdCars || [],
        }
      })
    }

    // Fetch existing cars
    const { data: existingCars } = await supabase
      .from('RaceCar')
      .select(`
        id,
        carId,
        buildId,
        car:Car(id, name, slug, manufacturer, year, category),
        build:CarBuild(id, name, description, isPublic)
      `)
      .eq('raceId', id)

    return NextResponse.json({
      race: {
        ...race,
        raceCars: existingCars || [],
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/races/[id] - Delete a race
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get user's ID
    const { data: userData } = await supabase
      .from('User')
      .select('id, role')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get race to check permissions
    const { data: existingRace } = await supabase
      .from('Race')
      .select('createdById')
      .eq('id', id)
      .single()

    if (!existingRace) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    // Check if user is creator or admin
    const isCreator = existingRace.createdById === userData.id
    const isAdmin = userData.role === 'ADMIN'

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied - only the creator or admins can delete this race' },
        { status: 403 }
      )
    }

    // Delete the race (RaceCar entries will be cascade deleted)
    const { error } = await supabase.from('Race').delete().eq('id', id)

    if (error) {
      console.error('Error deleting race:', error)
      return NextResponse.json(
        { error: 'Failed to delete race' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
