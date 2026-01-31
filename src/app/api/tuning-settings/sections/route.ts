import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const nocache = searchParams.get('nocache') === 'true'

    const { data: sections, error } = await supabase
      .from('TuningSection')
      .select('*')
      .order('displayOrder')

    if (error) throw error

    // All sections are now valid tuning sections (unused ones removed from DB)
    const filteredSections = sections || []

    // Cache headers - skip if nocache parameter is set for development
    const cacheHeaders = nocache
      ? {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'CDN-Cache-Control': 'no-store',
        }
      : {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'CDN-Cache-Control': 'public, max-age=3600',
        }

    return NextResponse.json({ sections: filteredSections }, {
      headers: cacheHeaders
    })
  } catch (error) {
    console.error('Error fetching tuning sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tuning sections' },
      { status: 500 }
    )
  }
}
