import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { gamertag, name } = body

    // Validate gamertag if provided
    if (gamertag !== undefined) {
      if (typeof gamertag !== 'string') {
        return NextResponse.json({ error: 'Gamertag must be a string' }, { status: 400 })
      }

      const trimmedGamertag = gamertag.trim()

      if (trimmedGamertag.length < 3) {
        return NextResponse.json({ error: 'Gamertag must be at least 3 characters' }, { status: 400 })
      }

      if (trimmedGamertag.length > 20) {
        return NextResponse.json({ error: 'Gamertag must be less than 20 characters' }, { status: 400 })
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedGamertag)) {
        return NextResponse.json(
          { error: 'Gamertag can only contain letters, numbers, hyphens, and underscores' },
          { status: 400 }
        )
      }
    }

    const supabase = createServiceRoleClient()

    // Check if gamertag is already taken (if changing gamertag)
    if (gamertag !== undefined) {
      const { data: existingUser } = await supabase
        .from('User')
        .select('id')
        .eq('gamertag', gamertag.trim())
        .neq('id', session.user.id)
        .single()

      if (existingUser) {
        return NextResponse.json({ error: 'Gamertag is already taken' }, { status: 400 })
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    }

    if (gamertag !== undefined) {
      updateData.gamertag = gamertag.trim()
    }

    if (name !== undefined) {
      updateData.name = name.trim()
    }

    // Safety: Ensure user record exists (create if missing)
    // This handles edge case where trigger didn't fire or user was created manually
    const now = new Date().toISOString()
    const { error: ensureError } = await supabase
      .from('User')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: 'PENDING',
        createdAt: now,
        updatedAt: now,
      }, {
        onConflict: 'id',
        ignoreDuplicates: true,
      })

    if (ensureError) {
      console.error('Error ensuring user exists:', ensureError)
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
    }

    // Update user profile
    const { data: updatedUser, error } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', session.user.id)
      .select('id, email, name, gamertag, role')
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error in PATCH /api/user/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    const { data: user, error } = await supabase
      .from('User')
      .select('id, email, name, gamertag, role, createdAt, updatedAt')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
