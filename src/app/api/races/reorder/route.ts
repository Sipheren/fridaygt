import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for reorder request
const ReorderSchema = z.object({
  raceIds: z.array(z.string().min(1, 'Invalid race ID')).min(1, 'At least one race ID is required'),
})

// POST /api/races/reorder - Reorder active races
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate request body
    const validationResult = ReorderSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { raceIds } = validationResult.data
    const supabase = createServiceRoleClient()

    // Verify all races exist and are active
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

    // Update order for each race (first ID = 1, second = 2, etc.)
    for (let i = 0; i < raceIds.length; i++) {
      const { error: updateError } = await supabase
        .from('Race')
        .update({ order: i + 1 })
        .eq('id', raceIds[i])

      if (updateError) {
        console.error('Error updating race order:', updateError)
        return NextResponse.json({ error: 'Failed to update race order' }, { status: 500 })
      }
    }

    // Fetch and return updated races
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
