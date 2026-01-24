import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const sectionId = searchParams.get('sectionId')
    const active = searchParams.get('active')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('TuningSetting')
      .select(`
        *,
        section:TuningSection(*)
      `)

    // Filter by section if specified
    if (sectionId) {
      query = query.eq('sectionId', sectionId)
    }

    // Filter by active status
    if (active === 'true') {
      query = query.eq('isActive', true)
    } else if (active === 'false') {
      query = query.eq('isActive', false)
    } else if (!includeInactive) {
      // Default to only active settings unless explicitly requested
      query = query.eq('isActive', true)
    }

    // Order by sectionId first, then by displayOrder
    const { data: settings, error } = await query.order('sectionId', { ascending: true }).order('displayOrder', { ascending: true, nullsFirst: false })

    if (error) throw error

    // Client-side sort by section displayOrder if sections are included
    if (settings && settings.length > 0 && settings[0].section) {
      settings.sort((a, b) => {
        const sectionOrder = (a.section as any).displayOrder - (b.section as any).displayOrder
        if (sectionOrder !== 0) return sectionOrder
        return (a.displayOrder || 999) - (b.displayOrder || 999)
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching tuning settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tuning settings' },
      { status: 500 }
    )
  }
}
