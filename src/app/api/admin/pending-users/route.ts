import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isAdmin } from '@/lib/auth-utils'

// GET /api/admin/pending-users - List all pending users
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceRoleClient()

    const { data: users, error } = await supabase
      .from('User')
      .select('id, email, name, createdAt')
      .eq('role', 'PENDING')
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching pending users:', error)
      return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in GET /api/admin/pending-users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
