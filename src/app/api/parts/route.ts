import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const categoryId = searchParams.get('categoryId')
    const active = searchParams.get('active')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('Part')
      .select(`
        *,
        category:PartCategory(*)
      `)

    // Filter by category if specified
    if (categoryId) {
      query = query.eq('categoryId', categoryId)
    }

    // Filter by active status
    if (active === 'true') {
      query = query.eq('isActive', true)
    } else if (active === 'false') {
      query = query.eq('isActive', false)
    } else if (!includeInactive) {
      // Default to only active parts unless explicitly requested
      query = query.eq('isActive', true)
    }

    // Order by categoryId first, then by name
    const { data: parts, error } = await query.order('categoryId', { ascending: true }).order('name', { ascending: true })

    if (error) throw error

    // Client-side sort by category displayOrder if categories are included
    if (parts && parts.length > 0 && parts[0].category) {
      parts.sort((a, b) => {
        const categoryOrder = (a.category as any).displayOrder - (b.category as any).displayOrder
        if (categoryOrder !== 0) return categoryOrder
        return a.name.localeCompare(b.name)
      })
    }

    return NextResponse.json({ parts })
  } catch (error) {
    console.error('Error fetching parts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parts' },
      { status: 500 }
    )
  }
}
