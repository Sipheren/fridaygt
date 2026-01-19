import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()
    const session = await auth()

    // Fetch the build with all related data
    const { data: build, error } = await supabase
      .from('CarBuild')
      .select(`
        *,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year, category, driveType, maxPower, weight, pp),
        upgrades:CarBuildUpgrade(*),
        settings:CarBuildSetting(*)
      `)
      .eq('id', id)
      .single()

    if (error || !build) {
      return NextResponse.json(
        { error: 'Build not found' },
        { status: 404 }
      )
    }

    // Check if user can view this build
    let canView = build.isPublic

    if (session?.user?.email) {
      const { data: userData } = await supabase
        .from('User')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (userData && userData.id === build.userId) {
        canView = true
      }
    }

    if (!canView) {
      return NextResponse.json(
        { error: 'This build is private' },
        { status: 403 }
      )
    }

    // Get lap time statistics for this build
    const { data: lapTimes } = await supabase
      .from('LapTime')
      .select('timeMs, trackId')
      .eq('buildId', id)

    const statistics = {
      totalLaps: lapTimes?.length || 0,
      fastestTime: lapTimes && lapTimes.length > 0
        ? Math.min(...lapTimes.map(lt => lt.timeMs))
        : null,
      averageTime: lapTimes && lapTimes.length > 0
        ? Math.round(lapTimes.reduce((sum, lt) => sum + lt.timeMs, 0) / lapTimes.length)
        : null,
      uniqueTracks: new Set(lapTimes?.map(lt => lt.trackId)).size,
    }

    // Transform settings to use 'section' instead of 'category' for frontend
    const transformedSettings = build.settings?.map((setting: any) => ({
      ...setting,
      section: setting.category,
    })) || []

    return NextResponse.json({
      ...build,
      settings: transformedSettings,
      statistics,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get current user
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if build exists and user owns it
    const { data: existingBuild, error: fetchError } = await supabase
      .from('CarBuild')
      .select('userId')
      .eq('id', id)
      .single()

    if (fetchError || !existingBuild) {
      return NextResponse.json(
        { error: 'Build not found' },
        { status: 404 }
      )
    }

    if (existingBuild.userId !== userData.id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this build' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, isPublic, upgrades, settings } = body

    // Update the build
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isPublic !== undefined) updateData.isPublic = isPublic

    const { error: updateError } = await supabase
      .from('CarBuild')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating build:', updateError)
      return NextResponse.json(
        { error: 'Failed to update build' },
        { status: 500 }
      )
    }

    // Update upgrades if provided
    if (upgrades !== undefined && Array.isArray(upgrades)) {
      // Delete existing upgrades
      await supabase
        .from('CarBuildUpgrade')
        .delete()
        .eq('buildId', id)

      // Insert new upgrades
      if (upgrades.length > 0) {
        const upgradeRecords = upgrades.map(upgrade => ({
          id: nanoid(),
          buildId: id,
          category: upgrade.category,
          part: upgrade.part,
        }))

        await supabase
          .from('CarBuildUpgrade')
          .insert(upgradeRecords)
      }
    }

    // Update settings if provided
    if (settings !== undefined && Array.isArray(settings)) {
      // Delete existing settings
      await supabase
        .from('CarBuildSetting')
        .delete()
        .eq('buildId', id)

      // Insert new settings
      if (settings.length > 0) {
        const settingRecords = settings.map(setting => ({
          id: nanoid(),
          buildId: id,
          category: setting.section,
          setting: setting.setting,
          value: setting.value,
        }))

        await supabase
          .from('CarBuildSetting')
          .insert(settingRecords)
      }
    }

    // Fetch the updated build
    const { data: updatedBuild } = await supabase
      .from('CarBuild')
      .select(`
        *,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year),
        upgrades:CarBuildUpgrade(*),
        settings:CarBuildSetting(*)
      `)
      .eq('id', id)
      .single()

    return NextResponse.json(updatedBuild)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get current user
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if build exists and user owns it
    const { data: existingBuild, error: fetchError } = await supabase
      .from('CarBuild')
      .select('userId')
      .eq('id', id)
      .single()

    if (fetchError || !existingBuild) {
      return NextResponse.json(
        { error: 'Build not found' },
        { status: 404 }
      )
    }

    if (existingBuild.userId !== userData.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this build' },
        { status: 403 }
      )
    }

    // Delete the build (cascades to upgrades and settings)
    const { error: deleteError } = await supabase
      .from('CarBuild')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting build:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete build' },
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
