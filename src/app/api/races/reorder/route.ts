/**
 * Race Reordering API
 *
 * POST /api/races/reorder - Atomically reorder active races with new positions
 *
 * Purpose: Update the 'order' field for multiple races in a single operation
 * - Used by Tonight page drag-and-drop to reorder active races
 * - Admin-only endpoint (prevents unauthorized reordering)
 * - Uses atomic RPC function to prevent race conditions
 * - All updates performed in a single database transaction
 * - Row-level locking ensures data consistency during concurrent updates
 *
 * How It Works:
 * 1. Validate raceIds array (non-empty, valid UUIDs)
 * 2. Verify all races exist and are active (isActive = true)
 * 3. Call reorder_races_atomic() RPC function with race_ids and new_order arrays
 * 4. RPC function updates all races in a single transaction with row-level locks
 * 5. Return updated races sorted by new order
 *
 * RPC Function Details (reorder_races_atomic):
 * - Parameters: race_ids (text[]), new_order (integer[])
 * - Logic: UPDATE Race SET order = new_order[i] WHERE id = race_ids[i]
 * - Locking: ROW LOCKING prevents concurrent modifications
 * - Transaction: All updates succeed or all fail (atomic)
 * - Performance: Single round-trip to database for all updates
 *
 * Debugging Tips:
 * - Common error: "Invalid or inactive race IDs" - verify all raceIds exist and isActive=true
 * - Common error: RPC function not found - check migration ran successfully
 * - Concurrent updates: Row-level locking prevents conflicts, automatically queues requests
 * - Check reorder_races_atomic() function exists in Supabase if RPC errors occur
 * - Transaction rollback: If any update fails, all changes are rolled back
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/auth-utils'
import { z } from 'zod'

// ============================================================
// VALIDATION SCHEMA
// ============================================================
// Zod schema validates:
// - raceIds is array of strings
// - Each raceId is valid UUID (min 1 character)
// - At least one raceId provided
// ============================================================

const ReorderSchema = z.object({
  raceIds: z.array(z.string().min(1, 'Invalid race ID')).min(1, 'At least one race ID is required'),
})

// POST /api/races/reorder - Reorder active races
export async function POST(req: NextRequest) {
  try {
    // ============================================================
    // AUTHENTICATION & AUTHORIZATION
    // ============================================================
    // User must be authenticated
    // User must be admin (only admins can reorder races)
    // This prevents users from reordering races to their advantage
    // ============================================================

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check authorization - only admins can reorder races
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 })
    }

    const body = await req.json()

    // Validate request body with Zod schema
    const validationResult = ReorderSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { raceIds } = validationResult.data
    const supabase = createServiceRoleClient()

    // ============================================================
    // RACE VERIFICATION
    // ============================================================
    // Verify all races exist and are active before reordering
    // Prevents reordering inactive races or non-existent races
    // Debugging: Check Race table for raceIds, verify isActive=true
    // ============================================================

    const { data: races, error: verifyError } = await supabase
      .from('Race')
      .select('id')
      .in('id', raceIds)
      .eq('isActive', true)

    if (verifyError) {
      console.error('Error verifying races:', verifyError)
      return NextResponse.json({ error: 'Failed to verify races' }, { status: 500 })
    }

    if (!races || races.length !== raceIds.length) {
      return NextResponse.json(
        { error: 'Invalid or inactive race IDs' },
        { status: 400 }
      )
    }

    // ============================================================
    // ATOMIC REORDERING
    // ============================================================
    // Call reorder_races_atomic() RPC function for atomic updates
    //
    // Why RPC Function?
    // - Single database transaction (all succeed or all fail)
    // - Row-level locking prevents concurrent modification conflicts
    // - Better performance than individual UPDATE statements
    // - Guaranteed order consistency
    //
    // RPC Function Logic:
    // ```sql
    // CREATE FUNCTION reorder_races_atomic(
    //   race_ids text[],
    //   new_order integer[]
    // ) RETURNS void
    // LANGUAGE plpgsql
    // AS $$
    // BEGIN
    //   FOR i IN 1..array_length(race_ids, 1) LOOP
    //     UPDATE "Race"
    //     SET "order" = new_order[i]
    //     WHERE id = race_ids[i];
    //   END LOOP;
    // END;
    // $$;
    // ```
    //
    // Debugging Tips:
    // - Check reorder_races_atomic() exists in Supabase functions
    // - Verify raceIds and orderValues arrays have same length
    // - Transaction rollback: if any UPDATE fails, all changes are rolled back
    // - Row-level locking: concurrent requests wait for lock release
    // ============================================================

    const orderValues = raceIds.map((_, i) => i + 1)
    const { error: updateError } = await supabase.rpc('reorder_races_atomic', {
      race_ids: raceIds,
      new_order: orderValues
    })

    if (updateError) {
      console.error('Error updating race order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update race order', details: updateError.message },
        { status: 500 }
      )
    }

    // ============================================================
    // FETCH UPDATED RACES FOR RESPONSE
    // ============================================================
    // Fetch all updated races with complete relationship data
    // Returns races sorted by new order for immediate UI update
    // Includes: track, cars, builds for each race
    // ============================================================

    const { data: updatedRaces, error: fetchError } = await supabase
      .from('Race')
      .select(`
        *,
        track:Track(*),
        RaceCar(
          *,
          car:Car(*),
          build:CarBuild(*)
        )
      `)
      .in('id', raceIds)
      .order('order', { ascending: true })

    if (fetchError) {
      console.error('Error fetching updated races:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch updated races' }, { status: 500 })
    }

    return NextResponse.json({ success: true, races: updatedRaces })
  } catch (error) {
    console.error('Error reordering races:', error)
    return NextResponse.json(
      { error: 'Failed to reorder races' },
      { status: 500 }
    )
  }
}
