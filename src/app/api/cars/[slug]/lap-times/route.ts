import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    const userOnly = searchParams.get('userOnly') === 'true'

    const supabase = await createClient()

    // Get car by slug
    const { data: car, error: carError } = await supabase
      .from('Car')
      .select('id, name, slug, manufacturer, year')
      .eq('slug', slug)
      .single()

    if (carError || !car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
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
        track:Track(id, name, slug, location, length)
      `)
      .eq('carId', car.id)
      .order('createdAt', { ascending: false })

    // Filter by track if specified
    if (trackId) {
      query = query.eq('trackId', trackId)
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

    // Group lap times by track and calculate personal bests
    const lapTimesByTrack = new Map<string, {
      track: any
      lapTimes: any[]
      personalBest: number
      totalLaps: number
    }>()

    for (const lapTime of lapTimes || []) {
      const track = lapTime.track as any
      const trackId = track?.id

      if (!trackId) continue

      if (!lapTimesByTrack.has(trackId)) {
        lapTimesByTrack.set(trackId, {
          track: track,
          lapTimes: [],
          personalBest: lapTime.timeMs,
          totalLaps: 0
        })
      }

      const trackData = lapTimesByTrack.get(trackId)!
      trackData.lapTimes.push(lapTime)
      trackData.totalLaps++

      // Update personal best if this time is faster
      if (lapTime.timeMs < trackData.personalBest) {
        trackData.personalBest = lapTime.timeMs
      }
    }

    // Convert map to array for response
    const groupedData = Array.from(lapTimesByTrack.values()).map(data => ({
      track: data.track,
      personalBest: data.personalBest,
      totalLaps: data.totalLaps,
      recentLapTimes: data.lapTimes.slice(0, 5), // Last 5 laps per track
    }))

    // Calculate overall statistics
    const allTimes = lapTimes?.map(lt => lt.timeMs) || []
    const statistics = {
      totalLaps: lapTimes?.length || 0,
      fastestTime: allTimes.length > 0 ? Math.min(...allTimes) : null,
      averageTime: allTimes.length > 0
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : null,
      uniqueTracks: lapTimesByTrack.size,
      uniqueDrivers: new Set(lapTimes?.map(lt => (lt.user as any)?.id).filter(Boolean)).size
    }

    return NextResponse.json({
      car,
      lapTimesByTrack: groupedData,
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
