import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { UpdateBuildSchema, validateBody } from '@/lib/validation'
import type {
  DbCarBuildUpgrade,
  DbCarBuildSetting,
  DbPart,
  DbPartCategory,
  DbTuningSetting,
  DbTuningSection,
} from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()
    const session = await auth()

    // Fetch the build with all related data including part/setting details
    const { data: build, error } = await supabase
      .from('CarBuild')
      .select(`
        *,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year, category, driveType, maxPower, weight, pp),
        upgrades:CarBuildUpgrade(
          *,
          part:Part(*)
        )
      `)
      .eq('id', id)
      .single()

    // Fetch settings separately to avoid JOIN issues with NULL settingId
    const { data: settings, error: settingsError } = await supabase
      .from('CarBuildSetting')
      .select('id, buildId, settingId, category, setting, value')
      .eq('buildId', id)

    if (error || settingsError) {
      console.error('Supabase error fetching build:', error || settingsError)
      return NextResponse.json(
        { error: 'Build not found' },
        { status: 404 }
      )
    }

    if (!build) {
      console.error('Build not found for id:', id)
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

    console.log('[GET] Build settings from DB:', settings?.length || 0, 'settings')
    console.log('[GET] Settings data:', JSON.stringify(settings, null, 2))

    // Transform settings to use 'section' instead of 'category' for frontend compatibility
    const transformedSettings = settings?.map((setting: any) => {
      return {
        ...setting,
        section: setting.setting?.section?.name || setting.category,
      }
    }) || []

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

    // Check if build exists and get user role for authorization
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

    // Get current user's role to determine permissions
    const { data: currentUserData } = await supabase
      .from('User')
      .select('role')
      .eq('id', userData.id)
      .single()

    const isAdmin = currentUserData?.role === 'ADMIN'
    const isOwner = existingBuild.userId === userData.id

    // User must be admin or owner to modify the build
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this build' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate request body with Zod
    const validationResult = await validateBody(UpdateBuildSchema, body)
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    const { name, description, isPublic, upgrades, settings, userId: requestedUserId, ...gearFields } = validationResult.data

    // Determine if userId can be changed
    // - Only admins can change the creator
    // - Owners cannot change the creator (must be admin)
    let newUserId: string | null | undefined = undefined

    if (requestedUserId !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Only admins can change the creator' },
          { status: 403 }
        )
      }

      // Validate that requested userId is an active user (USER or ADMIN)
      const { data: requestedUser } = await supabase
        .from('User')
        .select('id, role')
        .eq('id', requestedUserId)
        .single()

      if (!requestedUser) {
        return NextResponse.json(
          { error: 'Requested user not found' },
          { status: 404 }
        )
      }

      if (requestedUser.role === 'PENDING') {
        return NextResponse.json(
          { error: 'Cannot assign builds to pending users' },
          { status: 400 }
        )
      }

      newUserId = requestedUserId
    }

    // Update the build
    const updateData: Partial<{
      name: string
      description: string | null
      isPublic: boolean
      userId: string | null
      updatedAt: string
      finalDrive: string | null
      gear1: string | null
      gear2: string | null
      gear3: string | null
      gear4: string | null
      gear5: string | null
      gear6: string | null
      gear7: string | null
      gear8: string | null
      gear9: string | null
      gear10: string | null
      gear11: string | null
      gear12: string | null
      gear13: string | null
      gear14: string | null
      gear15: string | null
      gear16: string | null
      gear17: string | null
      gear18: string | null
      gear19: string | null
      gear20: string | null
    }> = {
      updatedAt: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (newUserId !== undefined) updateData.userId = newUserId

    // Add gear fields if provided (stored as text to preserve formatting)
    for (const [key, value] of Object.entries(gearFields)) {
      if (key.startsWith('gear') || key === 'finalDrive') {
        // Store as string, empty string becomes null
        (updateData as any)[key] = value === '' ? null : value
      }
    }

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
      // Validate partIds and lookup category/part names
      if (upgrades.length > 0) {
        const partIds = upgrades.map(u => u.partId).filter(Boolean)

        if (partIds.length > 0) {
          const { data: parts } = await supabase
            .from('Part')
            .select('id, name, categoryId')
            .in('id', partIds)

          if (!parts || parts.length !== partIds.length) {
            return NextResponse.json(
              { error: 'One or more invalid part IDs' },
              { status: 400 }
            )
          }
        }
      }

      // Delete existing upgrades
      await supabase
        .from('CarBuildUpgrade')
        .delete()
        .eq('buildId', id)

      // Insert new upgrades with validation
      if (upgrades.length > 0) {
        // Fetch part details to populate legacy columns
        const partIds = upgrades.map(u => u.partId).filter(Boolean)

        let partDetails: any[] = []
        if (partIds.length > 0) {
          // Fetch parts with category details using a separate query
          const { data: parts } = await supabase
            .from('Part')
            .select('id, name, categoryId')
            .in('id', partIds)

          // Fetch categories separately
          const categoryIds = parts?.map(p => p.categoryId) || []
          let categories: any[] = []
          if (categoryIds.length > 0) {
            const { data: cats } = await supabase
              .from('PartCategory')
              .select('id, name')
              .in('id', categoryIds)
            categories = cats || []
          }

          const categoryMap = new Map(categories.map(c => [c.id, c.name]))
          partDetails = (parts || []).map(p => ({
            ...p,
            categoryName: categoryMap.get(p.categoryId) || ''
          }))
        }

        const partMap = new Map(partDetails.map(p => [p.id, p]))

        const upgradeRecords = upgrades
          .filter((u): u is { partId?: string } => !!u.partId) // Only include upgrades with valid partId
          .map((upgrade) => {
            const part = partMap.get(upgrade.partId!)
            return {
              id: nanoid(),
              buildId: id,
              partId: upgrade.partId,
              category: part?.categoryName || '',
              part: part?.name || '',
            }
          })

        if (upgradeRecords.length > 0) {
          await supabase
            .from('CarBuildUpgrade')
            .insert(upgradeRecords)
        }
      }
    }

    // Update settings if provided (standard settings only, gears are now direct fields)
    if (settings !== undefined && Array.isArray(settings)) {
      // Validate settingIds and lookup section/setting names
      if (settings.length > 0) {
        const settingIds = settings.map(s => s.settingId).filter(Boolean) as string[]

        if (settingIds.length > 0) {
          const { data: tuningSettings } = await supabase
            .from('TuningSetting')
            .select('id, name, sectionId')
            .in('id', settingIds)

          if (!tuningSettings || tuningSettings.length !== settingIds.length) {
            return NextResponse.json(
              { error: 'One or more invalid setting IDs' },
              { status: 400 }
            )
          }
        }
      }

      // Delete existing settings
      await supabase
        .from('CarBuildSetting')
        .delete()
        .eq('buildId', id)

      // Insert new settings with validation
      if (settings.length > 0) {
        // Fetch setting details to populate legacy columns
        const settingIds = settings
          .map((s) => s.settingId)
          .filter((id): id is string => id !== undefined && id !== null)

        let settingDetails: any[] = []
        if (settingIds.length > 0) {
          // Fetch settings with section details using separate queries
          const { data: tuningSettings } = await supabase
            .from('TuningSetting')
            .select('id, name, sectionId')
            .in('id', settingIds)

          // Fetch sections separately
          const sectionIds = tuningSettings?.map(s => s.sectionId) || []
          let sections: any[] = []
          if (sectionIds.length > 0) {
            const { data: secs } = await supabase
              .from('TuningSection')
              .select('id, name')
              .in('id', sectionIds)
            sections = secs || []
          }

          const sectionMap = new Map(sections.map(s => [s.id, s.name]))
          settingDetails = (tuningSettings || []).map(s => ({
            ...s,
            sectionName: sectionMap.get(s.sectionId) || ''
          }))
        }

        const settingMap = new Map(settingDetails.map(s => [s.id, s]))

        // Handle standard settings
        const settingRecords = settings
          .map((setting: any) => {
            const tuningSetting = settingMap.get(setting.settingId!)
            return {
              id: nanoid(),
              buildId: id,
              settingId: setting.settingId,
              category: tuningSetting?.sectionName || '',
              setting: tuningSetting?.name || '',
              value: setting.value,
            }
          })

        if (settingRecords.length > 0) {
          await supabase
            .from('CarBuildSetting')
            .insert(settingRecords)
        }
      }
    }

    // Fetch the updated build with full details
    const { data: updatedBuild } = await supabase
      .from('CarBuild')
      .select(`
        *,
        user:User(id, name, email),
        car:Car(id, name, slug, manufacturer, year),
        upgrades:CarBuildUpgrade(
          *,
          part:Part(*)
        )
      `)
      .eq('id', id)
      .single()

    // Fetch settings separately to avoid JOIN issues with NULL settingId
    const { data: updatedSettings } = await supabase
      .from('CarBuildSetting')
      .select('id, buildId, settingId, category, setting, value')
      .eq('buildId', id)

    console.log('[PATCH] Updated build settings:', updatedSettings?.length || 0, 'settings')
    console.log('[PATCH] Settings data:', JSON.stringify(updatedSettings, null, 2))

    // Transform settings to use 'section' instead of 'category' for frontend compatibility
    const transformedSettings = updatedSettings?.map((setting: any) => {
      return {
        ...setting,
        section: setting.setting?.section?.name || setting.category,
      }
    }) || []

    console.log('[PATCH] Transformed settings:', transformedSettings.length)

    return NextResponse.json({
      ...updatedBuild,
      settings: transformedSettings,
    })
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
