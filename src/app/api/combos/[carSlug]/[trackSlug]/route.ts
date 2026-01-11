import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carSlug: string; trackSlug: string }> }
) {
  try {
    const { carSlug, trackSlug } = await params
    const session = await auth()
    const supabase = await createClient()

    // Get car by slug
    const { data: car, error: carError } = await supabase
      .from('Car')
      .select('id, name, slug, manufacturer, year, category, driveType, maxPower, weight, pp')
      .eq('slug', carSlug)
      .single()

    if (carError || !car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    // Get track by slug
    const { data: track, error: trackError } = await supabase
      .from('Track')
      .select('id, name, slug, location, length, corners, category, layout')
      .eq('slug', trackSlug)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Get all lap times for this combo
    const { data: allLapTimes, error: lapTimesError } = await supabase
      .from('LapTime')
      .select(`
        id,
        timeMs,
        notes,
        conditions,
        createdAt,
        updatedAt,
        user:User(id, name, email)
      `)
      .eq('carId', car.id)
      .eq('trackId', track.id)
      .order('timeMs', { ascending: true })

    if (lapTimesError) {
      console.error('Error fetching lap times:', lapTimesError)
      return NextResponse.json(
        { error: 'Failed to fetch lap times' },
        { status: 500 }
      )
    }

    // Calculate leaderboard (best time per user)
    const leaderboardMap = new Map<string, {
      userId: string
      userName: string | null
      userEmail: string
      bestTime: number
      totalLaps: number
      bestLapId: string
      lastImprovement: string
    }>()

    for (const lapTime of allLapTimes || []) {
      const user = lapTime.user as any
      const userId = user?.id

      if (!userId) continue

      if (!leaderboardMap.has(userId)) {
        leaderboardMap.set(userId, {
          userId,
          userName: user.name,
          userEmail: user.email,
          bestTime: lapTime.timeMs,
          totalLaps: 1,
          bestLapId: lapTime.id,
          lastImprovement: lapTime.createdAt
        })
      } else {
        const userData = leaderboardMap.get(userId)!
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
    let userStats = null
    if (session?.user?.email) {
      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (userData) {
        const userLapTimes = allLapTimes?.filter(lt => (lt.user as any)?.id === userData.id) || []

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
    const allTimes = allLapTimes?.map(lt => lt.timeMs) || []
    const statistics = {
      totalLaps: allLapTimes?.length || 0,
      uniqueDrivers: leaderboardMap.size,
      fastestTime: allTimes.length > 0 ? Math.min(...allTimes) : null,
      averageTime: allTimes.length > 0
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : null,
      worldRecord: leaderboard.length > 0 ? leaderboard[0] : null
    }

    return NextResponse.json({
      car,
      track,
      leaderboard,
      userStats,
      statistics,
      recentActivity: (allLapTimes || [])
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
