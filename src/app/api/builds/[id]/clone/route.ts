import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import type { DbCarBuildUpgrade, DbCarBuildSetting } from '@/types/database'

export async function POST(
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

    // Fetch the original build
    const { data: originalBuild, error: fetchError } = await supabase
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

    if (fetchError || !originalBuild) {
      return NextResponse.json(
        { error: 'Build not found' },
        { status: 404 }
      )
    }

    // Check if build is public or owned by user
    const canClone = originalBuild.isPublic || originalBuild.userId === userData.id

    if (!canClone) {
      return NextResponse.json(
        { error: 'Cannot clone private build' },
        { status: 403 }
      )
    }

    // Create the cloned build
    const newBuildId = nanoid()
    const now = new Date().toISOString()
    const { data: newBuild, error: buildError } = await supabase
      .from('CarBuild')
      .insert({
        id: newBuildId,
        userId: userData.id,
        carId: originalBuild.carId,
        name: `${originalBuild.name} (Copy)`,
        description: originalBuild.description
          ? `${originalBuild.description}\n\nCloned from ${originalBuild.user.name || originalBuild.user.email}'s build`
          : `Cloned from ${originalBuild.user.name || originalBuild.user.email}'s build`,
        isPublic: false, // Cloned builds are private by default
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (buildError) {
      console.error('Error creating cloned build:', buildError)
      return NextResponse.json(
        { error: 'Failed to clone build' },
        { status: 500 }
      )
    }

    // Clone upgrades
    if (originalBuild.upgrades && originalBuild.upgrades.length > 0) {
      const upgradeRecords = originalBuild.upgrades.map((upgrade: any) => ({
        id: nanoid(),
        buildId: newBuildId,
        category: upgrade.category,
        part: upgrade.part,
        value: upgrade.value,
      }))

      await supabase
        .from('CarBuildUpgrade')
        .insert(upgradeRecords)
    }

    // Clone settings
    if (originalBuild.settings && originalBuild.settings.length > 0) {
      const settingRecords = originalBuild.settings.map((setting: any) => ({
        id: nanoid(),
        buildId: newBuildId,
        category: setting.category,
        setting: setting.setting,
        value: setting.value,
      }))

      await supabase
        .from('CarBuildSetting')
        .insert(settingRecords)
    }

    // Fetch the complete cloned build
    const { data: completeBuild } = await supabase
      .from('CarBuild')
      .select(`
        *,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year),
        upgrades:CarBuildUpgrade(*),
        settings:CarBuildSetting(*)
      `)
      .eq('id', newBuildId)
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
