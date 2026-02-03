/**
 * Build Management API
 *
 * GET /api/builds - List builds with filtering (carId, userId, ids, public, myBuilds)
 * POST /api/builds - Create a new build with upgrades, settings, and gear ratios
 *
 * Debugging Tips:
 * - Check 'carId' filter returns builds for specific car only
 * - 'ids' parameter for batch fetching (comma-separated)
 * - Build creation fails if carId doesn't exist in Car table
 * - Admin users can set userId to create builds for other active users
 * - Gear ratios (gear1-20, finalDrive) stored as text to preserve formatting (e.g., "2.500")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth-utils'
import type { DbPart, DbPartCategory, DbTuningSetting, DbTuningSection } from '@/types/database'
import { CreateBuildSchema, validateBody } from '@/lib/validation'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const carId = searchParams.get('carId')
    const userId = searchParams.get('userId')
    const ids = searchParams.get('ids')
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

    // Filter by multiple IDs if specified (for batch fetching)
    if (ids) {
      const idArray = ids.split(',').filter(id => id.trim().length > 0)
      if (idArray.length > 0) {
        query = query.in('id', idArray)
      }
    }

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
      const userData = await getCurrentUser(session)

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
    // Rate limiting: 20 requests per minute to prevent abuse
    const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

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

    // ============================================================
    // BUILD CREATOR LOGIC
    // ============================================================
    // Admin users can assign builds to other active users (USER or ADMIN role)
    // This is used for admin tools and build management
    // PENDING users cannot be assigned builds (security restriction)
    // ============================================================

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
    const buildId = crypto.randomUUID()
    const now = new Date().toISOString()

    // ============================================================
    // GEAR RATIO STORAGE
    // ============================================================
    // Gear ratios are stored directly on CarBuild as TEXT columns
    // This preserves formatting like "2.500" (leading zeros, decimals)
    // Supports up to 20 gears for GT7's high-end transmissions
    // Empty strings converted to null for cleaner database state
    // ============================================================

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

    // ============================================================
    // PARTS UPGRADES INSERTION
    // ============================================================
    // Parts are validated against the Part catalog before insertion
    // Each upgrade includes: partId (FK), category name, part name
    // Debug: Check PartCategory and Part tables if insertion fails
    // ============================================================

    // Insert upgrades if provided
    if (upgrades && Array.isArray(upgrades) && upgrades.length > 0) {
      const partIds = upgrades.map(u => u.partId).filter(Boolean)

      let partDetails: Array<{ id: string; name: string; categoryName: string }> = []
      if (partIds.length > 0) {
        // Fetch parts with category details using JOIN query
        const { data: parts } = await supabase
          .from('Part')
          .select('id, name, category:PartCategory(id, name)')
          .in('id', partIds)

        partDetails = (parts || []).map(p => ({
          ...p,
          categoryName: (p.category as { name?: string } | null)?.name || ''
        }))
      }

      const partMap = new Map(partDetails.map(p => [p.id, p]))

      const upgradeRecords = upgrades
        .filter((u): u is { partId: string; value?: string | null } => !!u.partId) // Only include upgrades with valid partId
        .map((upgrade) => {
          const part = partMap.get(upgrade.partId)
          return {
            id: crypto.randomUUID(),
            buildId,
            partId: upgrade.partId,
            category: part?.categoryName || '',
            part: part?.name || '',
            // Include value for dropdown parts (GT Auto, Custom Parts)
            // Checkbox parts will have value = undefined (stored as NULL)
            value: upgrade.value || null,
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

    // ============================================================
    // TUNING SETTINGS INSERTION
    // ============================================================
    // Two types of settings:
    // 1. Standard settings: Referenced by settingId FK to TuningSetting table
    // 2. Custom gears: settingId=null, stored as "custom:GearName" for user-added gears
    // Note: Transmission gears are NOT here - they use direct CarBuild columns (gear1-20)
    // ============================================================

    // Insert tuning settings if provided
    if (settings && Array.isArray(settings) && settings.length > 0) {
      // Separate standard settings from custom gears
      const standardSettings = settings.filter(s => s.settingId && !s.settingId.startsWith('custom:'))
      const customGears = settings.filter(s => s.settingId && s.settingId.startsWith('custom:'))

      // Handle standard settings (fetch details from TuningSetting table)
      const settingIds = standardSettings.map(s => s.settingId).filter(Boolean)

      let settingDetails: Array<{ id: string; name: string; sectionName: string }> = []
      if (settingIds.length > 0) {
        // Fetch settings with section details using JOIN query
        const { data: tuningSettings } = await supabase
          .from('TuningSetting')
          .select('id, name, section:TuningSection(id, name)')
          .in('id', settingIds)

        settingDetails = (tuningSettings || []).map(s => ({
          ...s,
          sectionName: (s.section as { name?: string } | null)?.name || ''
        }))
      }

      const settingMap = new Map(settingDetails.map(s => [s.id, s]))

      const settingRecords = standardSettings
        .map((setting) => {
          const tuningSetting = settingMap.get(setting.settingId as string)
          return {
            id: crypto.randomUUID(),
            buildId,
            settingId: setting.settingId as string,
            category: tuningSetting?.sectionName || '',
            setting: tuningSetting?.name || '',
            value: setting.value,
          }
        })

      // Handle custom gears (store with settingId=null and custom name in 'setting' field)
      // Save all custom gears, even with empty values, to preserve user's added gears
      const customGearRecords = customGears.map((gear) => {
        const gearName = (gear.settingId as string).replace('custom:', '')
        return {
          id: crypto.randomUUID(),
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
