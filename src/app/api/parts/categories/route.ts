import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data: categories, error } = await supabase
      .from('PartCategory')
      .select('*')
      .order('displayOrder')

    if (error) throw error

    return NextResponse.json({ categories }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error fetching part categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch part categories' },
      { status: 500 }
    )
  }
}
