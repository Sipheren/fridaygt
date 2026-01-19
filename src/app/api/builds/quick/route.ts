import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'

// POST /api/builds/quick - Quick build creation for inline modal
// Purpose: Create builds without leaving race creation flow
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { carId, name, description } = body

    // Validation
    if (!carId) {
      return NextResponse.json({ error: 'carId is required' }, { status: 400 })
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify car exists
    const { data: car, error: carError } = await supabase
      .from('Car')
      .select('id, name, manufacturer')
      .eq('id', carId)
      .single()

    if (carError || !car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    // Generate build ID
    const buildId = crypto.randomUUID()

    // Create build (no upgrades or settings initially)
    const { data: build, error: buildError } = await supabase
      .from('CarBuild')
      .insert({
        id: buildId,
        userId: session.user.id,
        carId,
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: false, // Quick builds are private by default
      })
      .select()
      .single()

    if (buildError) {
      console.error('Error creating build:', buildError)
      return NextResponse.json({ error: 'Failed to create build' }, { status: 500 })
    }

    // Fetch complete build data for response
    const { data: completeBuild } = await supabase
      .from('CarBuild')
      .select(`
        *,
        car:Car(id, name, slug, manufacturer, year, category)
      `)
      .eq('id', buildId)
      .single()

    return NextResponse.json(completeBuild, { status: 201 })
  } catch (error) {
    console.error('Error creating quick build:', error)
    return NextResponse.json(
      { error: 'Failed to create build' },
      { status: 500 }
    )
  }
}
