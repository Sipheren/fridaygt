import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'

// GET /api/tracks/[slug]/lap-times - Get lap times for a specific track
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const carId = searchParams.get('carId')
    const userOnly = searchParams.get('userOnly') === 'true'

    const supabase = await createClient()

    // Get track by slug
    const { data: track, error: trackError } = await supabase
      .from('Track')
      .select('id, name, slug')
      .eq('slug', slug)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Build query for lap times
    let query = supabase
      .from('LapTime')
      .select(`
        id,
        timeMs,
        notes,
        conditions,
        createdAt,
        updatedAt,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year)
      `)
      .eq('trackId', track.id)
      .order('createdAt', { ascending: false })

    // Filter by car if specified
    if (carId) {
      query = query.eq('carId', carId)
    }

    // Filter by current user if specified and user is logged in
    if (userOnly && session?.user?.email) {
      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (userData) {
        query = query.eq('userId', userData.id)
      }
    }

    const { data: lapTimes, error: lapTimesError } = await query

    if (lapTimesError) {
      console.error('Error fetching lap times:', lapTimesError)
      return NextResponse.json(
        { error: 'Failed to fetch lap times' },
        { status: 500 }
      )
    }

    // Group lap times by car and calculate personal bests
    const lapTimesByCar = new Map<string, {
      car: any
      lapTimes: any[]
      personalBest: number
      totalLaps: number
    }>()

    for (const lapTime of lapTimes || []) {
      const car = lapTime.car as any
      const carId = car?.id

      if (!carId) continue

      if (!lapTimesByCar.has(carId)) {
        lapTimesByCar.set(carId, {
          car: car,
          lapTimes: [],
          personalBest: lapTime.timeMs,
          totalLaps: 0
        })
      }

      const carData = lapTimesByCar.get(carId)!
      carData.lapTimes.push(lapTime)
      carData.totalLaps++

      // Update personal best if this time is faster
      if (lapTime.timeMs < carData.personalBest) {
        carData.personalBest = lapTime.timeMs
      }
    }

    // Convert map to array for response
    const groupedData = Array.from(lapTimesByCar.values()).map(data => ({
      car: data.car,
      personalBest: data.personalBest,
      totalLaps: data.totalLaps,
      recentLapTimes: data.lapTimes.slice(0, 5), // Last 5 laps per car
    }))

    // Calculate overall statistics
    const allTimes = lapTimes?.map(lt => lt.timeMs) || []
    const statistics = {
      totalLaps: lapTimes?.length || 0,
      fastestTime: allTimes.length > 0 ? Math.min(...allTimes) : null,
      averageTime: allTimes.length > 0
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : null,
      uniqueCars: lapTimesByCar.size,
      uniqueDrivers: new Set(lapTimes?.map(lt => (lt.user as any)?.id).filter(Boolean)).size
    }

    return NextResponse.json({
      track,
      lapTimesByCar: groupedData,
      statistics,
      allLapTimes: lapTimes || []
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
