import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { UpdateUserProfileSchema, validateBody } from '@/lib/validation'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body with Zod
    const validationResult = await validateBody(UpdateUserProfileSchema, body)
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    const { gamertag, name } = validationResult.data

    const supabase = createServiceRoleClient()

    // Check if gamertag is already taken (if changing gamertag)
    if (gamertag !== undefined) {
      const { data: existingUser } = await supabase
        .from('User')
        .select('id')
        .eq('gamertag', gamertag)
        .neq('id', session.user.id)
        .single()

      if (existingUser) {
        return NextResponse.json({ error: 'Gamertag is already taken' }, { status: 400 })
      }
    }

    // Build update object
    const updateData: Partial<{
      name: string | null
      gamertag: string | null
      updatedAt: string
    }> = {
      updatedAt: new Date().toISOString(),
    }

    if (gamertag !== undefined) {
      updateData.gamertag = gamertag
    }

    if (name !== undefined) {
      updateData.name = name
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
