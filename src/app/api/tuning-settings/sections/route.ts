import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data: sections, error } = await supabase
      .from('TuningSection')
      .select('*')
      .order('displayOrder')

    if (error) throw error

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Error fetching tuning sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tuning sections' },
      { status: 500 }
    )
  }
}
