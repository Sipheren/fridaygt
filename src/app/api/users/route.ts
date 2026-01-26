import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check authorization - only admins can view users list
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 })
    }

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabase
      .from('User')
      .select('id, name, email, role, gamertag')
      .order('name', { ascending: true })

    // Filter to only active users (USER or ADMIN, not PENDING)
    if (activeOnly) {
      query = query.in('role', ['USER', 'ADMIN'])
    }

    // Always exclude nulluser placeholder (used for race member backfill)
    query = query.not('email', 'eq', 'nulluser')

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
