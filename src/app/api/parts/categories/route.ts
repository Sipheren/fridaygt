import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data: categories, error } = await supabase
      .from('PartCategory')
      .select('*')
      .order('displayOrder')

    if (error) throw error

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching part categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch part categories' },
      { status: 500 }
    )
  }
}
