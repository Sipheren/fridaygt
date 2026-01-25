import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { UpdateBuildSchema, validateBody } from '@/lib/validation'
import type {
  DbCarBuildUpgrade,
  DbCarBuildSetting,
  DbPart,
  DbPartCategory,
  DbTuningSetting,
  DbTuningSection,
} from '@/types/database'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

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
      const userData = await getCurrentUser(session)

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

    // Get lap time statistics for this build using optimized queries
    // Run COUNT and MIN queries in parallel (both database-level operations)
    const [{ count: totalLaps }, { data: fastestLap }] = await Promise.all([
      // Count total laps using Supabase count (database-level, no data transfer)
      supabase
        .from('LapTime')
        .select('id', { count: 'exact', head: true })
        .eq('buildId', id),

      // Get fastest time using optimized query (ORDER BY + LIMIT 1 uses index)
      supabase
        .from('LapTime')
        .select('timeMs')
        .eq('buildId', id)
        .order('timeMs', { ascending: true })
        .limit(1)
        .maybeSingle()
    ])

    // Fetch only timeMs and trackId for remaining calculations (smaller dataset)
    const { data: lapTimesData } = await supabase
      .from('LapTime')
      .select('timeMs, trackId')
      .eq('buildId', id)

    const statistics = {
      totalLaps: totalLaps || 0,
      fastestTime: fastestLap?.timeMs || null,
      averageTime: lapTimesData && lapTimesData.length > 0
        ? Math.round(lapTimesData.reduce((sum, lt) => sum + lt.timeMs, 0) / lapTimesData.length)
        : null,
      uniqueTracks: new Set(lapTimesData?.map(lt => lt.trackId)).size,
    }

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
    // Apply rate limiting
    const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const { id } = await params
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get current user (with id and role fields for authorization)
    const userData = await getCurrentUser(session, ['id', 'role'])

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

    const isOwner = existingBuild.userId === userData.id

    // User must be admin or owner to modify the build
    if (!isAdmin(session) && !isOwner) {
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
          // Fetch parts with category details using JOIN query
          const { data: parts } = await supabase
            .from('Part')
            .select('id, name, category:PartCategory(id, name)')
            .in('id', partIds)

          partDetails = (parts || []).map(p => ({
            ...p,
            categoryName: (p.category as any)?.name || ''
          }))
        }

        const partMap = new Map(partDetails.map(p => [p.id, p]))

        const upgradeRecords = upgrades
          .filter((u): u is { partId?: string } => !!u.partId) // Only include upgrades with valid partId
          .map((upgrade) => {
            const part = partMap.get(upgrade.partId!)
            return {
              id: crypto.randomUUID(),
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
          // Fetch settings with section details using JOIN query
          const { data: tuningSettings } = await supabase
            .from('TuningSetting')
            .select('id, name, section:TuningSection(id, name)')
            .in('id', settingIds)

          settingDetails = (tuningSettings || []).map(s => ({
            ...s,
            sectionName: (s.section as any)?.name || ''
          }))
        }

        const settingMap = new Map(settingDetails.map(s => [s.id, s]))

        // Handle standard settings
        const settingRecords = settings
          .map((setting: any) => {
            const tuningSetting = settingMap.get(setting.settingId!)
            return {
              id: crypto.randomUUID(),
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

    // Transform settings to use 'section' instead of 'category' for frontend compatibility
    const transformedSettings = updatedSettings?.map((setting: any) => {
      return {
        ...setting,
        section: setting.setting?.section?.name || setting.category,
      }
    }) || []

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
    // Apply rate limiting
    const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

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
    const userData = await getCurrentUser(session)

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
