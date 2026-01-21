import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params
    const statType = slug[0] // 'tracks', 'cars', 'builds', etc.

    const supabase = createServiceRoleClient()

    let table = ''
    switch (statType) {
      case 'tracks':
        table = 'Track'
        break
      case 'cars':
        table = 'Car'
        break
      case 'builds':
        table = 'CarBuild'
        break
      case 'races':
        table = 'Race'
        break
      case 'lap-times':
        table = 'LapTime'
        break
      case 'users':
        table = 'User'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid stat type' },
          { status: 400 }
        )
    }

    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error(`Error fetching ${statType} count:`, error)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
