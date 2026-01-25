import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import type { DbPart, DbPartCategory, DbTuningSetting, DbTuningSection } from '@/types/database'
import { CreateBuildSchema, validateBody } from '@/lib/validation'

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

    // Validate request body with Zod
    const validationResult = await validateBody(CreateBuildSchema, body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      )
    }

    const { carId, name, description, isPublic, upgrades, settings, userId: requestedUserId, ...gearFields } = validationResult.data

    // Determine the build creator userId
    // - If userId is provided and current user is ADMIN, validate and use it
    // - Otherwise, default to current user
    let buildUserId = userData.id

    if (requestedUserId) {
      // Check if current user is admin
      const { data: currentUserData } = await supabase
        .from('User')
        .select('role')
        .eq('id', userData.id)
        .single()

      if (currentUserData?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Only admins can set a custom creator' },
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

      buildUserId = requestedUserId
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

    // Create the build with gear fields
    const buildId = nanoid()
    const now = new Date().toISOString()

    // Prepare gear fields (empty string becomes null)
    const gearData: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(gearFields)) {
      if (key.startsWith('gear') || key === 'finalDrive') {
        gearData[key] = value === '' ? null : value
      }
    }

    const { data: build, error: buildError } = await supabase
      .from('CarBuild')
      .insert({
        id: buildId,
        userId: buildUserId,
        carId,
        name,
        description: description || null,
        isPublic: isPublic || false,
        createdAt: now,
        updatedAt: now,
        ...gearData,
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
      const partIds = upgrades.map(u => u.partId).filter(Boolean)

      let partDetails: any[] = []
      if (partIds.length > 0) {
        // Fetch parts with category details
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
        .filter(u => u.partId) // Only include upgrades with valid partId
        .map(upgrade => {
          const part = partMap.get(upgrade.partId)
          return {
            id: nanoid(),
            buildId,
            partId: upgrade.partId,
            category: part?.categoryName || '',
            part: part?.name || '',
          }
        })

      if (upgradeRecords.length > 0) {
        const { error: upgradesError } = await supabase
          .from('CarBuildUpgrade')
          .insert(upgradeRecords)

        if (upgradesError) {
          console.error('Error inserting upgrades:', upgradesError)
        }
      }
    }

    // Insert tuning settings if provided
    if (settings && Array.isArray(settings) && settings.length > 0) {
      // Separate standard settings from custom gears
      const standardSettings = settings.filter(s => s.settingId && !s.settingId.startsWith('custom:'))
      const customGears = settings.filter(s => s.settingId && s.settingId.startsWith('custom:'))

      // Handle standard settings (fetch details from TuningSetting table)
      const settingIds = standardSettings.map(s => s.settingId).filter(Boolean)

      let settingDetails: any[] = []
      if (settingIds.length > 0) {
        // Fetch settings with section details
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

      const settingRecords = standardSettings
        .map((setting: any) => {
          const tuningSetting = settingMap.get(setting.settingId)
          return {
            id: nanoid(),
            buildId,
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
          buildId,
          settingId: null,
          category: 'Transmission',
          setting: gearName,
          value: gear.value,
        }
      })

      const allRecords = [...settingRecords, ...customGearRecords]

      if (allRecords.length > 0) {
        const { error: settingsError } = await supabase
          .from('CarBuildSetting')
          .insert(allRecords)

        if (settingsError) {
          console.error('Error inserting settings:', settingsError)
        }
      }
    }

    // Fetch the complete build with upgrades and settings
    const { data: completeBuild } = await supabase
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
