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
        ),
        settings:CarBuildSetting(
          *,
          setting:TuningSetting(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error fetching build:', error)
      return NextResponse.json(
        { error: 'Build not found', details: error.message },
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

    // Transform settings to use 'section' instead of 'category' for frontend compatibility
    // For custom gears (settingId is null), convert to "custom:" format
    const transformedSettings = build.settings?.map((setting: any) => {
      // Custom gears have settingId=null and should use "custom:" prefix
      if (setting.settingId === null) {
        return {
          ...setting,
          settingId: `custom:${setting.setting}`,
          section: setting.category,
        }
      }
      // Standard settings
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
          .filter((u: any) => u.partId) // Only include upgrades with valid partId
          .map((upgrade: any) => {
            const part = partMap.get(upgrade.partId)
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

    // Update settings if provided
    if (settings !== undefined && Array.isArray(settings)) {
      // Separate standard settings from custom gears
      const standardSettings = settings.filter((s: any) => s.settingId && !s.settingId.startsWith('custom:'))
      const customGears = settings.filter((s: any) => s.settingId && s.settingId.startsWith('custom:'))

      // Validate standard settingIds and lookup section/setting names
      if (standardSettings.length > 0) {
        const settingIds = standardSettings.map(s => s.settingId).filter(Boolean)

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
        // Fetch standard setting details to populate legacy columns
        const settingIds = standardSettings.map((s: any) => s.settingId).filter(Boolean)

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
        const settingRecords = standardSettings
          .map((setting: any) => {
            const tuningSetting = settingMap.get(setting.settingId)
            return {
              id: nanoid(),
              buildId: id,
              settingId: setting.settingId,
              category: tuningSetting?.sectionName || '',
              setting: tuningSetting?.name || '',
              value: setting.value,
            }
          })

        // Handle custom gears (store with settingId=null and custom name in 'setting' field)
        // Save all custom gears, even with empty values, to preserve user's added gears
        const customGearRecords = customGears.map((gear: any) => {
          const gearName = gear.settingId.replace('custom:', '')
          return {
            id: nanoid(),
            buildId: id,
            settingId: null,
            category: 'Transmission',
            setting: gearName,
            value: gear.value,
          }
        })

        const allRecords = [...settingRecords, ...customGearRecords]

        if (allRecords.length > 0) {
          await supabase
            .from('CarBuildSetting')
            .insert(allRecords)
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
        ),
        settings:CarBuildSetting(
          *,
          setting:TuningSetting(*)
        )
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
