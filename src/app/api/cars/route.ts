import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const manufacturer = searchParams.get('manufacturer')

    let query = supabase
      .from('Car')
      .select('*')

    // Filter by category if specified
    if (category) {
      query = query.eq('category', category)
    }

    // Filter by manufacturer if specified
    if (manufacturer) {
      query = query.eq('manufacturer', manufacturer)
    }

    // Order by manufacturer, then by name
    const { data: cars, error } = await query
      .order('manufacturer', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ cars }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error fetching cars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cars' },
      { status: 500 }
    )
  }
}
