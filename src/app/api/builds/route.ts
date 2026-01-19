import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const carId = searchParams.get('carId')
    const userId = searchParams.get('userId')
    const publicOnly = searchParams.get('public') === 'true'
    const myBuilds = searchParams.get('myBuilds') === 'true'

    let query = supabase
      .from('CarBuild')
      .select(`
        id,
        name,
        description,
        isPublic,
        createdAt,
        updatedAt,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year)
      `)
      .order('createdAt', { ascending: false })

    // Filter by car if specified
    if (carId) {
      query = query.eq('carId', carId)
    }

    // Filter by user if specified
    if (userId) {
      query = query.eq('userId', userId)
    }

    // Filter to only public builds
    if (publicOnly) {
      query = query.eq('isPublic', true)
    }

    // Filter to current user's builds
    if (myBuilds && session?.user?.email) {
      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (userData) {
        query = query.eq('userId', userData.id)
      }
    }

    const { data: builds, error } = await query

    if (error) {
      console.error('Error fetching builds:', error)
      return NextResponse.json(
        { error: 'Failed to fetch builds' },
        { status: 500 }
      )
    }

    return NextResponse.json({ builds: builds || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get current user
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { carId, name, description, isPublic, upgrades, settings } = body

    // Validate required fields
    if (!carId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: carId, name' },
        { status: 400 }
      )
    }

    // Verify car exists
    const { data: car, error: carError } = await supabase
      .from('Car')
      .select('id')
      .eq('id', carId)
      .single()

    if (carError || !car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      )
    }

    // Create the build
    const buildId = nanoid()
    const now = new Date().toISOString()
    const { data: build, error: buildError } = await supabase
      .from('CarBuild')
      .insert({
        id: buildId,
        userId: userData.id,
        carId,
        name,
        description: description || null,
        isPublic: isPublic || false,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (buildError) {
      console.error('Error creating build:', buildError)
      return NextResponse.json(
        { error: 'Failed to create build' },
        { status: 500 }
      )
    }

    // Insert upgrades if provided
    if (upgrades && Array.isArray(upgrades) && upgrades.length > 0) {
      const upgradeRecords = upgrades.map(upgrade => ({
        id: nanoid(),
        buildId,
        category: upgrade.category,
        part: upgrade.part,
      }))

      const { error: upgradesError } = await supabase
        .from('CarBuildUpgrade')
        .insert(upgradeRecords)

      if (upgradesError) {
        console.error('Error inserting upgrades:', upgradesError)
      }
    }

    // Insert tuning settings if provided
    if (settings && Array.isArray(settings) && settings.length > 0) {
      const settingRecords = settings.map(setting => ({
        id: nanoid(),
        buildId,
        category: setting.section,
        setting: setting.setting,
        value: setting.value,
      }))

      const { error: settingsError } = await supabase
        .from('CarBuildSetting')
        .insert(settingRecords)

      if (settingsError) {
        console.error('Error inserting settings:', settingsError)
      }
    }

    // Fetch the complete build with upgrades and settings
    const { data: completeBuild } = await supabase
      .from('CarBuild')
      .select(`
        *,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year),
        upgrades:CarBuildUpgrade(*),
        settings:CarBuildSetting(*)
      `)
      .eq('id', buildId)
      .single()

    return NextResponse.json(completeBuild, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
