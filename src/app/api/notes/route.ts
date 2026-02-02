/**
 * Notes API
 *
 * GET /api/notes - List all notes with user info
 * POST /api/notes - Create a new note
 *
 * Debugging Tips:
 * - All notes are publicly readable (community board)
 * - Creating requires authentication
 * - Pinned notes appear first, then sorted by createdAt DESC
 * - Real-time updates via Supabase Realtime (client-side)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { CreateNoteSchema, validateBody } from '@/lib/validation'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// GET /api/notes - List all notes
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting (Query tier - 100 requests/min)
    const rateLimit = await checkRateLimit(req, RateLimit.Query())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const supabase = createServiceRoleClient()

    // Fetch all notes with user info, ordered by pinned (DESC), then createdAt (DESC)
    const { data: notes, error } = await supabase
      .from('Note')
      .select(`
        *,
        user:User(id, name, gamertag)
      `)
      .order('pinned', { ascending: false })
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    return NextResponse.json({ notes: notes || [] })
  } catch (error) {
    console.error('Error in GET /api/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/notes - Create a new note
export async function POST(req: NextRequest) {
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
    const validationResult = await validateBody(CreateNoteSchema, body)

    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    const { title, content, color, positionX, positionY } = validationResult.data

    const supabase = createServiceRoleClient()

    // Generate note ID
    const noteId = crypto.randomUUID()

    // Create note
    const { data: note, error } = await supabase
      .from('Note')
      .insert({
        id: noteId,
        title: title || '',
        content: content || '',
        color: color || '#fef08a',
        positionX: positionX || 0,
        positionY: positionY || 0,
        createdBy: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
