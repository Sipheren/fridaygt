/**
 * Build Clone API
 *
 * POST /api/builds/[id]/clone - Clone an existing build to current user
 *
 * Purpose: Create a deep copy of a build with all upgrades and settings
 * - Users can clone public builds or their own builds
 * - Private builds cannot be cloned by other users
 * - Cloned build is assigned to current user (userId changes)
 * - Name appended with " (Copy)" to distinguish from original
 * - Description includes attribution to original creator
 * - Cloned builds are private by default (isPublic = false)
 *
 * Debugging Tips:
 * - Common error: "Build not found" - verify buildId exists in CarBuild table
 * - Common error: "Cannot clone private build" - check build.isPublic flag
 * - Upgrades and settings copied with new IDs to maintain referential integrity
 * - If upgrades/settings fail to copy, build is still created (logged error)
 * - Check console logs for partial clone errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import type { DbCarBuildUpgrade, DbCarBuildSetting } from '@/types/database'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function POST(
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

    // ============================================================
    // FETCH ORIGINAL BUILD
    // ============================================================
    // Fetch complete build data including all upgrades and settings
    // Used for deep copy - all data will be duplicated with new IDs
    // Debugging: Check buildId exists in CarBuild table
    // ============================================================

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

    // ============================================================
    // AUTHORIZATION CHECK
    // ============================================================
    // Users can clone:
    // - Public builds (isPublic = true)
    // - Their own builds (userId = current user)
    // Private builds of other users cannot be cloned
    // Debugging: Check build.isPublic flag and originalBuild.userId match
    // ============================================================

    const canClone = originalBuild.isPublic || originalBuild.userId === userData.id

    if (!canClone) {
      return NextResponse.json(
        { error: 'Cannot clone private build' },
        { status: 403 }
      )
    }

    // ============================================================
    // CREATE CLONED BUILD
    // ============================================================
    // Create new CarBuild record with:
    // - New UUID (newBuildId) - unique identifier for cloned build
    // - Current user as owner (userData.id) - build assigned to cloner
    // - Same carId - duplicate of same car setup
    // - Name appended with " (Copy)" - distinguishes from original
    // - Attribution in description - credits original creator
    // - isPublic = false - cloned builds are private by default
    //
    // Debugging Tips:
    // - Check carId exists in Car table
    // - Verify userData.id is valid User table ID
    // ============================================================

    const newBuildId = crypto.randomUUID()
    const now = new Date().toISOString()
    const { error: buildError } = await supabase
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

    // ============================================================
    // CLONE UPGRADES
    // ============================================================
    // Copy all CarBuildUpgrade records with new IDs
    // Each upgrade gets a new UUID but references newBuildId
    // Preserves: category, part name, value
    // Note: partId FK is NOT preserved in this version (uses legacy columns)
    //
    // Debugging Tips:
    // - Check console logs for upgrade clone errors
    // - Build is still created if upgrades fail (partial clone)
    // - Verify CarBuildUpgrade table has proper FK constraints
    // ============================================================

    if (originalBuild.upgrades && originalBuild.upgrades.length > 0) {
      const upgradeRecords = originalBuild.upgrades.map((upgrade: DbCarBuildUpgrade) => ({
        id: crypto.randomUUID(),
        buildId: newBuildId,
        category: upgrade.category,
        part: upgrade.part,
        value: upgrade.value,
      }))

      const { error: upgradesError } = await supabase
        .from('CarBuildUpgrade')
        .insert(upgradeRecords)

      if (upgradesError) {
        console.error('Error cloning upgrades:', upgradesError)
        // Don't fail the entire operation, but log the error
        // The build is created, just without upgrades
      }
    }

    // ============================================================
    // CLONE SETTINGS
    // ============================================================
    // Copy all CarBuildSetting records with new IDs
    // Each setting gets a new UUID but references newBuildId
    // Preserves: category, setting name, value
    // Note: settingId FK is NOT preserved in this version (uses legacy columns)
    //
    // Debugging Tips:
    // - Check console logs for setting clone errors
    // - Build is still created if settings fail (partial clone)
    // - Verify CarBuildSetting table has proper FK constraints
    // ============================================================

    if (originalBuild.settings && originalBuild.settings.length > 0) {
      const settingRecords = originalBuild.settings.map((setting: DbCarBuildSetting) => ({
        id: crypto.randomUUID(),
        buildId: newBuildId,
        category: setting.category,
        setting: setting.setting,
        value: setting.value,
      }))

      const { error: settingsError } = await supabase
        .from('CarBuildSetting')
        .insert(settingRecords)

      if (settingsError) {
        console.error('Error cloning settings:', settingsError)
        // Don't fail the entire operation, but log the error
        // The build is created, just without settings
      }
    }

    // ============================================================
    // FETCH COMPLETE CLONED BUILD FOR RESPONSE
    // ============================================================
    // Fetch the newly created build with all relationships
    // Returns complete build data to frontend for immediate use
    // Includes: user, car, upgrades, settings
    // ============================================================

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
