import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// DELETE /api/run-lists/[id]/entries/[entryId] - Delete an entry from run list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: runListId, entryId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Check ownership
    const { data: runList } = await supabase
      .from('RunList')
      .select('createdById')
      .eq('id', runListId)
      .single()

    if (!runList || runList.createdById !== userData.id) {
      return NextResponse.json(
        { error: 'Access denied - only the creator can edit this run list' },
        { status: 403 }
      )
    }

    // Get the entry's order before deleting
    const { data: entryData } = await supabase
      .from('RunListEntry')
      .select('order')
      .eq('id', entryId)
      .eq('runListId', runListId)
      .single()

    if (!entryData) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Delete entry
    const { error: deleteError } = await supabase
      .from('RunListEntry')
      .delete()
      .eq('id', entryId)
      .eq('runListId', runListId)

    if (deleteError) {
      console.error('Error deleting entry:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete entry', details: deleteError.message },
        { status: 500 }
      )
    }

    // Reorder remaining entries to close the gap
    const { data: remainingEntries } = await supabase
      .from('RunListEntry')
      .select('id, order')
      .eq('runListId', runListId)
      .gt('order', entryData.order)
      .order('order', { ascending: true })

    if (remainingEntries && remainingEntries.length > 0) {
      for (const entry of remainingEntries) {
        await supabase
          .from('RunListEntry')
          .update({ order: entry.order - 1 })
          .eq('id', entry.id)
      }
    }

    // Update run list updatedAt
    const now = new Date().toISOString()
    await supabase
      .from('RunList')
      .update({ updatedAt: now })
      .eq('id', runListId)

    // Log the edit
    await supabase.from('RunListEdit').insert({
      id: crypto.randomUUID(),
      runListId,
      userId: userData.id,
      action: 'DELETE_ENTRY',
      details: JSON.stringify({ entryId, order: entryData.order }),
      createdAt: now
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
