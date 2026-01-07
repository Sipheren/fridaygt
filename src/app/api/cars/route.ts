import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const manufacturer = searchParams.get('manufacturer')
    const category = searchParams.get('category')
    const driveType = searchParams.get('driveType')

    const supabase = await createClient()

    let query = supabase
      .from('Car')
      .select('*')
      .order('manufacturer', { ascending: true })
      .order('name', { ascending: true })

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,manufacturer.ilike.%${search}%`)
    }

    // Apply manufacturer filter if provided
    if (manufacturer && manufacturer !== 'all') {
      query = query.eq('manufacturer', manufacturer)
    }

    // Apply category filter if provided
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Apply drive type filter if provided
    if (driveType && driveType !== 'all') {
      query = query.eq('driveType', driveType)
    }

    const { data: cars, error } = await query

    if (error) {
      console.error('Error fetching cars:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cars' },
        { status: 500 }
      )
    }

    // Get unique manufacturers for filter
    const { data: manufacturersData } = await supabase
      .from('Car')
      .select('manufacturer')
      .order('manufacturer', { ascending: true })

    const manufacturers = [...new Set(manufacturersData?.map(c => c.manufacturer) || [])]

    return NextResponse.json({ cars, manufacturers })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
