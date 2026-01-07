import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const id = params.id
    const body = await request.json()
    const { entryId, newOrder } = body

    if (!entryId || typeof newOrder !== 'number') {
      return NextResponse.json(
        { error: 'Entry ID and new order are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get user
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify run list ownership
    const { data: runList, error: runListError } = await supabase
      .from('RunList')
      .select('createdById')
      .eq('id', id)
      .single()

    if (runListError || !runList) {
      return NextResponse.json({ error: 'Run list not found' }, { status: 404 })
    }

    if (runList.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Only the owner can reorder races' },
        { status: 403 }
      )
    }

    // Get all entries for this run list
    const { data: allEntries, error: entriesError } = await supabase
      .from('RunListEntry')
      .select('id, order')
      .eq('runListId', id)
      .order('order', { ascending: true })

    if (entriesError || !allEntries) {
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    // Find the entry being moved
    const oldIndex = allEntries.findIndex((e) => e.id === entryId)
    if (oldIndex === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Reorder the array
    const reordered = [...allEntries]
    const [movedEntry] = reordered.splice(oldIndex, 1)
    reordered.splice(newOrder - 1, 0, movedEntry)

    // Update all orders in a transaction-like manner
    for (let i = 0; i < reordered.length; i++) {
      const { error: updateError } = await supabase
        .from('RunListEntry')
        .update({ order: i + 1 })
        .eq('id', reordered[i].id)

      if (updateError) {
        console.error('Failed to update entry order:', updateError)
        return NextResponse.json(
          { error: 'Failed to update entry order' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
