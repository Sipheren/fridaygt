import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// GET /api/run-lists - Get run lists with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const myLists = searchParams.get('myLists') === 'true'
    const publicOnly = searchParams.get('public') === 'true'
    const createdById = searchParams.get('createdById')

    // Build query
    let query = supabase
      .from('RunList')
      .select(`
        id,
        name,
        description,
        isPublic,
        createdAt,
        updatedAt,
        createdBy:User!createdById(id, name, email),
        entries:RunListEntry(count)
      `)
      .order('createdAt', { ascending: false })

    // Apply filters
    if (myLists) {
      const session = await auth()
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      query = query.eq('createdById', userData.id)
    } else if (createdById) {
      query = query.eq('createdById', createdById)
    }

    if (publicOnly) {
      query = query.eq('isPublic', true)
    }

    const { data: runLists, error } = await query

    if (error) {
      console.error('Error fetching run lists:', error)
      return NextResponse.json(
        { error: 'Failed to fetch run lists' },
        { status: 500 }
      )
    }

    return NextResponse.json({ runLists })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/run-lists - Create a new run list
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, isPublic } = body

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get user's ID
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create run list
    const now = new Date().toISOString()
    const { data: runList, error } = await supabase
      .from('RunList')
      .insert({
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic ?? true,
        createdById: userData.id,
        createdAt: now,
        updatedAt: now,
      })
      .select(`
        id,
        name,
        description,
        isPublic,
        createdAt,
        updatedAt,
        createdBy:User!createdById(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating run list:', error)
      return NextResponse.json(
        { error: 'Failed to create run list', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ runList }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
