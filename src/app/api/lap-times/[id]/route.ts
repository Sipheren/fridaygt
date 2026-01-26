/**
 * Single Lap Time Deletion API
 *
 * DELETE /api/lap-times/[id] - Delete a specific lap time (owner only)
 *
 * Purpose: Allow users to delete their own lap times
 * - Only the lap time owner can delete (admin override not available)
 * - Lap times are personal data - users have full control
 * - No cascade effects on leaderboards (front-end recalculates)
 * - No cascade effects on personal bests (front-end recalculates)
 *
 * Ownership Model:
 * - Lap times have userId field (owner)
 * - Only owner can delete their lap times
 * - Admins cannot delete others' lap times (intentional restriction)
 * - This prevents accidental deletion of personal performance data
 *
 * Cascade Effects:
 * - None at database level (lap times are standalone records)
 * - Leaderboards: Front-end recalculates after deletion
 * - Personal bests: Front-end recalculates after deletion
 * - Build statistics: Front-end recalculates after deletion
 * - Deleted lap times are permanently removed (no soft delete)
 *
 * How It Works:
 * 1. Authenticate user
 * 2. Verify lap time exists
 * 3. Verify ownership (lapTime.userId === current user's id)
 * 4. Delete lap time record
 * 5. Return success confirmation
 *
 * Debugging Tips:
 * - Common error: "Lap time not found" - verify lapTimeId exists in LapTime table
 * - Common error: "You can only delete your own lap times" - check ownership
 * - Admin users: Still bound by ownership rule (cannot delete others' times)
 * - After deletion: Frontend leaderboards/personal bests will recalculate
 * - No undo: Deletion is permanent (consider confirmation UI)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth-utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================
    // User must be authenticated to delete lap times
    // Debugging: Check session.user.email is set
    // ============================================================

    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServiceRoleClient()

    // Get user's ID for ownership check
    const userData = await getCurrentUser(session)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ============================================================
    // LAP TIME VERIFICATION & OWNERSHIP CHECK
    // ============================================================
    // Verify lap time exists before deletion
    // Verify ownership: Only owner can delete (no admin override)
    //
    // Why No Admin Override?
    // - Lap times are personal performance data
    // - Users should have full control over their own data
    // - Prevents admins from accidentally deleting user's records
    // - Intentional restriction to preserve personal data integrity
    //
    // Ownership Logic:
    // - lapTime.userId must match userData.id
    // - Admin users still bound by ownership rule
    // - No special privileges for deletion
    //
    // Debugging Tips:
    // - Check LapTime table for lapTimeId
    // - Verify lapTime.userId matches userData.id
    // - Admin users: Check you're the owner, not just an admin
    // ============================================================

    const { data: lapTime } = await supabase
      .from('LapTime')
      .select('id, userId')
      .eq('id', id)
      .single()

    if (!lapTime) {
      return NextResponse.json({ error: 'Lap time not found' }, { status: 404 })
    }

    if (lapTime.userId !== userData.id) {
      return NextResponse.json(
        { error: 'You can only delete your own lap times' },
        { status: 403 }
      )
    }

    // ============================================================
    // DELETE LAP TIME
    // ============================================================
    // Delete the LapTime record
    // No cascade effects at database level
    // Frontend applications will recalculate:
    // - Leaderboards (filter out deleted times)
    // - Personal bests (find next best time)
    // - Build statistics (update counts, averages, etc.)
    //
    // Debugging Tips:
    // - Deletion is permanent (no soft delete, no undo)
    // - Consider confirmation UI before deletion
    // - Check FK constraints if deletion fails
    // - Frontend should refresh data after deletion
    // ============================================================

    const { error } = await supabase
      .from('LapTime')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting lap time:', error)
      return NextResponse.json(
        { error: 'Failed to delete lap time' },
        { status: 500 }
      )
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
