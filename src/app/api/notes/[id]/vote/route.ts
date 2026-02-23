/**
 * Note Vote API
 *
 * POST /api/notes/[id]/vote   - Cast or switch a vote (any authenticated user)
 * DELETE /api/notes/[id]/vote - Remove your vote
 *
 * Voting is open to all authenticated users, not just note owner/admin.
 * One vote per user per note - switching type replaces the existing vote.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { VoteNoteSchema, validateBody } from '@/lib/validation'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// POST /api/notes/[id]/vote - Cast or switch a vote
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validationResult = await validateBody(VoteNoteSchema, body)

    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    const { id: noteId } = await params
    const { voteType } = validationResult.data
    const userId = session.user.id
    const supabase = createServiceRoleClient()

    // Check note exists
    const { data: note, error: noteError } = await supabase
      .from('Note')
      .select('id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from('NoteVote')
      .select('id, voteType')
      .eq('noteId', noteId)
      .eq('userId', userId)
      .single()

    if (existingVote) {
      // Already voted this type - no-op, return current state
      if (existingVote.voteType === voteType) {
        return NextResponse.json({ voteType, changed: false })
      }

      // Voted the other type - switch it
      const { error: updateError } = await supabase
        .from('NoteVote')
        .update({ voteType })
        .eq('id', existingVote.id)

      if (updateError) {
        console.error('Error updating vote:', updateError)
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 })
      }

      return NextResponse.json({ voteType, changed: true })
    }

    // No existing vote - insert new
    const { error: insertError } = await supabase
      .from('NoteVote')
      .insert({
        id: crypto.randomUUID(),
        noteId,
        userId,
        voteType,
      })

    if (insertError) {
      console.error('Error inserting vote:', insertError)
      return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
    }

    return NextResponse.json({ voteType, changed: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/notes/[id]/vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/notes/[id]/vote - Remove your vote
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: noteId } = await params
    const userId = session.user.id
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('NoteVote')
      .delete()
      .eq('noteId', noteId)
      .eq('userId', userId)

    if (error) {
      console.error('Error deleting vote:', error)
      return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]/vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
