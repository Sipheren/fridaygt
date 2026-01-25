import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data: sections, error } = await supabase
      .from('TuningSection')
      .select('*')
      .order('displayOrder')

    if (error) throw error

    // Filter out Tyres section as tyres are already selected in the parts area
    const filteredSections = sections?.filter(s => s.name !== 'Tyres') || []

    return NextResponse.json({ sections: filteredSections }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error fetching tuning sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tuning sections' },
      { status: 500 }
    )
  }
}
