/**
 * Note Details API
 *
 * PATCH /api/notes/[id] - Update a note (owner or admin only)
 * DELETE /api/notes/[id] - Delete a note (owner or admin only)
 *
 * Debugging Tips:
 * - Only note creator or admins can modify/delete notes
 * - RLS policies enforce permissions at database level
 * - Mutation rate limit applies (20 requests/min)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { UpdateNoteSchema, validateBody } from '@/lib/validation'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// PATCH /api/notes/[id] - Update a note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting (Mutation tier - 20 requests/min)
    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body with Zod
    const body = await req.json()
    const validationResult = await validateBody(UpdateNoteSchema, body)

    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    // Await params (Next.js 15 requirement)
    const { id } = await params
    const supabase = createServiceRoleClient()

    // Check if note exists and user has permission (owner or admin)
    const { data: existingNote, error: fetchError } = await supabase
      .from('Note')
      .select('id, createdBy')
      .eq('id', id)
      .single()

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Check permission: owner or admin
    const { data: currentUser } = await supabase
      .from('User')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const isOwner = existingNote.createdBy === session.user.id
    const isAdmin = currentUser?.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own notes' },
        { status: 403 }
      )
    }

    // Update note
    const { data: note, error: updateError } = await supabase
      .from('Note')
      .update(validationResult.data)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating note:', updateError)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error in PATCH /api/notes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting (Mutation tier - 20 requests/min)
    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params (Next.js 15 requirement)
    const { id } = await params
    const supabase = createServiceRoleClient()

    // Check if note exists and user has permission (owner or admin)
    const { data: existingNote, error: fetchError } = await supabase
      .from('Note')
      .select('id, createdBy')
      .eq('id', id)
      .single()

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Check permission: owner or admin
    const { data: currentUser } = await supabase
      .from('User')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const isOwner = existingNote.createdBy === session.user.id
    const isAdmin = currentUser?.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own notes' },
        { status: 403 }
      )
    }

    // Delete note
    const { error: deleteError } = await supabase
      .from('Note')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting note:', deleteError)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
