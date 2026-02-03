/**
 * Single Build Management API
 *
 * GET /api/builds/[id] - Fetch single build with upgrades, settings, and statistics
 * PATCH /api/builds/[id] - Update build details, upgrades, settings, and gear ratios
 * DELETE /api/builds/[id] - Delete build (cascades to upgrades and settings)
 *
 * Debugging Tips:
 * - GET returns statistics (total laps, fastest time, average time, unique tracks)
 * - Statistics calculated using parallel COUNT and MIN queries for performance
 * - PATCH requires admin OR ownership (owners can't change creator, only admins can)
 * - DELETE cascades to CarBuildUpgrade and CarBuildSetting tables
 * - Gear ratios (gear1-20, finalDrive) stored as text to preserve formatting
 * - Settings fetched separately to avoid JOIN issues with NULL settingId (custom gears)
 * - Common error: "Build not found" - verify buildId exists in CarBuild table
 * - Common error: "Unauthorized to modify" - check user is admin or owner
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { UpdateBuildSchema, validateBody } from '@/lib/validation'
import type {
  DbCarBuildUpgrade,
  DbCarBuildSetting,
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

    // ============================================================
    // FETCH BUILD WITH RELATED DATA
    // ============================================================
    // Fetch build with user, car, and upgrade details in single query
    // Settings fetched separately to avoid JOIN issues with NULL settingId (custom gears)
    // Debugging: Check Supabase query logs if build not found
    // ============================================================

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

    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // Public builds: viewable by anyone
    // Private builds: only viewable by owner
    // Debugging: Check build.isPublic flag and user.id match
    // ============================================================

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

    // ============================================================
    // STATISTICS CALCULATION
    // ============================================================
    // Calculate lap time statistics using optimized parallel queries
    // 1. Total laps: Database-level COUNT (no data transfer)
    // 2. Fastest time: ORDER BY + LIMIT 1 (uses index)
    // 3. Average time: Calculate from timeMs data
    // 4. Unique tracks: Count distinct trackId values
    //
    // Debugging Tips:
    // - Promise.all() runs COUNT and MIN queries in parallel
    // - Check LapTime table has records for this buildId if stats are empty
    // - Common issue: NULL times not excluded properly
    // ============================================================

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

    // ============================================================
    // TRANSFORM SETTINGS FOR FRONTEND
    // ============================================================
    // Settings stored with 'category' column, but frontend expects 'section'
    // Transform to match frontend data structure
    // Also handles cases where setting.setting.section is NULL (custom gears)
    // ============================================================

    const transformedSettings = settings?.map((setting: DbCarBuildSetting & { setting?: { section?: { name?: string } } }) => {
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
    // ============================================================
    // RATE LIMITING & AUTHENTICATION
    // ============================================================
    // Apply rate limiting: 20 requests per minute to prevent abuse
    // Debugging: Check rate limit headers in response if 429 errors occur
    // ============================================================

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

    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // User must be admin OR owner to modify the build
    // - Owners can edit name, description, isPublic, upgrades, settings, gears
    // - Only admins can change the creator (userId field)
    // Debugging: Check userData.role and existingBuild.userId match
    // ============================================================

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

    // ============================================================
    // BUILD CREATOR LOGIC
    // ============================================================
    // Admin users can assign builds to other active users (USER or ADMIN role)
    // This is used for admin tools and build management
    // PENDING users cannot be assigned builds (security restriction)
    // Owners cannot change the creator - only admins can
    // ============================================================

    let newUserId: string | null | undefined = undefined

    if (requestedUserId !== undefined) {
      if (!isAdmin(session)) {
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

    // ============================================================
    // BUILD UPDATE
    // ============================================================
    // Update CarBuild table with provided fields
    // Gear ratios stored as TEXT to preserve formatting (e.g., "2.500")
    // Empty strings converted to null for cleaner database state
    // ============================================================

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
        (updateData as Record<string, unknown>)[key] = value === '' ? null : value
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

    // ============================================================
    // PARTS UPGRADES UPDATE
    // ============================================================
    // Delete all existing upgrades and insert new ones
    // Parts validated against Part catalog before insertion
    // Foreign key relationships: CarBuildUpgrade.partId → Part.id
    //
    // Debugging Tips:
    // - Check Part table exists and partId is valid
    // - Verify FK constraint: CarBuildUpgrade.partId → Part.id
    // - Common error: "Invalid part IDs" - check partId exists in Part table
    // ============================================================

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
          .filter((u): u is { partId?: string; value?: string | null | undefined } => !!u.partId) // Only include upgrades with valid partId
          .map((upgrade) => {
            const part = partMap.get(upgrade.partId!)
            return {
              id: crypto.randomUUID(),
              buildId: id,
              partId: upgrade.partId,
              category: part?.categoryName || '',
              part: part?.name || '',
              // Include value for dropdown parts (GT Auto, Custom Parts)
              // Checkbox parts will have value = undefined (stored as NULL)
              value: upgrade.value || null,
            }
          })

        if (upgradeRecords.length > 0) {
          await supabase
            .from('CarBuildUpgrade')
            .insert(upgradeRecords)
        }
      }
    }

    // ============================================================
    // TUNING SETTINGS UPDATE
    // ============================================================
    // Delete all existing settings and insert new ones
    // Settings validated against TuningSetting catalog before insertion
    // Foreign key relationships: CarBuildSetting.settingId → TuningSetting.id
    //
    // Debugging Tips:
    // - Check TuningSetting table exists and settingId is valid
    // - Verify FK constraint: CarBuildSetting.settingId → TuningSetting.id
    // - Common error: "Invalid setting IDs" - check settingId exists in TuningSetting table
    // ============================================================

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

        // Handle standard settings
        const settingRecords = settings
          .map((setting: { settingId?: string | null; value?: string | number | null }) => {
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

    // ============================================================
    // FETCH UPDATED BUILD FOR RESPONSE
    // ============================================================
    // Fetch complete build data with all relationships
    // Settings fetched separately to avoid JOIN issues with NULL settingId
    // Transform settings to match frontend expectations ('section' instead of 'category')
    // ============================================================

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
    const transformedSettings = updatedSettings?.map((setting: DbCarBuildSetting & { setting?: { section?: { name?: string } } }) => {
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
    // ============================================================
    // RATE LIMITING & AUTHENTICATION
    // ============================================================
    // Apply rate limiting: 20 requests per minute to prevent abuse
    // Debugging: Check rate limit headers in response if 429 errors occur
    // ============================================================

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

    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // Only the build owner can delete it (admin cannot delete others' builds)
    // This is intentional - builds are user-owned data
    // Debugging: Check existingBuild.userId matches userData.id
    // ============================================================

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

    // ============================================================
    // DELETE BUILD WITH CASCADE
    // ============================================================
    // Delete CarBuild record, which cascades to:
    // - CarBuildUpgrade (parts installed on build)
    // - CarBuildSetting (tuning settings for build)
    // - LapTime records that reference this buildId (if cascade is configured)
    //
    // Debugging Tips:
    // - Check FK cascade constraints in database schema
    // - Common error: "Foreign key violation" - check cascade rules
    // ============================================================

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
