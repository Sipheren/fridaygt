import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/lap-times - Get user's lap times with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    const carId = searchParams.get('carId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // Get user's ID
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build query
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
    const session = await auth()
    console.log('[LAP TIME API] Session:', session?.user?.email)

    if (!session?.user?.email) {
      console.log('[LAP TIME API] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { trackId, carId, buildId, timeMs, notes, conditions, sessionType } = body
    console.log('[LAP TIME API] Request:', { trackId, carId, buildId, timeMs, sessionType })

    // Validation
    if (!trackId || !carId || !timeMs) {
      return NextResponse.json(
        { error: 'trackId, carId, and timeMs are required' },
        { status: 400 }
      )
    }

    // Validate sessionType if provided
    if (sessionType && !['Q', 'R'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'sessionType must be either Q or R' },
        { status: 400 }
      )
    }

    if (typeof timeMs !== 'number' || timeMs <= 0) {
      return NextResponse.json(
        { error: 'timeMs must be a positive number' },
        { status: 400 }
      )
    }

    // Reasonable lap time validation (between 10 seconds and 30 minutes)
    if (timeMs < 10000 || timeMs > 1800000) {
      return NextResponse.json(
        { error: 'Lap time must be between 10 seconds and 30 minutes' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get user's ID
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify track exists
    const { data: track } = await supabase
      .from('Track')
      .select('id')
      .eq('id', trackId)
      .single()

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Verify car exists
    const { data: car } = await supabase
      .from('Car')
      .select('id')
      .eq('id', carId)
      .single()

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    // Fetch build name if buildId is provided (store as snapshot)
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

    // Create lap time
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
        { error: 'Failed to create lap time', details: error.message },
        { status: 500 }
      )
    }

    console.log('[LAP TIME API] Success! Created lap time:', lapTime?.id)
    return NextResponse.json({ lapTime }, { status: 201 })
  } catch (error) {
    console.error('[LAP TIME API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
