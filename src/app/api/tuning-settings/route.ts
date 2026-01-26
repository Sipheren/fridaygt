/**
 * Tuning Settings Listing API
 *
 * GET /api/tuning-settings - List all tuning settings with optional filtering (public endpoint)
 *
 * Purpose: Provide reference data for all tuning settings available in GT7
 * - Public endpoint (no authentication required)
 * - Supports filtering by section and active status
 * - Returns settings with section relationship data
 * - Two-level sorting (section displayOrder, then setting displayOrder)
 * - Cacheable response (1 hour CDN cache)
 *
 * Data Returned:
 * - All setting fields: id, name, sectionId, isActive, displayOrder
 * - Section relationship: TuningSection (id, name, displayOrder)
 * - Sorted by: section displayOrder, then setting displayOrder
 *
 * Filtering Options:
 * - sectionId: Filter to specific tuning section
 * - active=true: Only active settings
 * - active=false: Only inactive settings
 * - includeInactive=true: Show all settings (active + inactive)
 * - Default: Only active settings (isActive=true)
 *
 * Active Status Logic:
 * - Settings have isActive field (soft delete/hide functionality)
 * - Default behavior: Only return active settings
 * - Frontend can request inactive settings if needed (admin, editing)
 * - Active filter takes precedence over includeInactive
 *
 * Two-Level Sorting Strategy:
 * 1. Database sort: sectionId (A-Z), then displayOrder (ascending)
 * 2. Client-side sort: section displayOrder, then setting displayOrder
 *
 * Why Client-Side Sort?
 * - Supabase doesn't support sorting by relationship fields
 * - Section.displayOrder not accessible in .order() clause
 * - Fetch all settings, then sort in memory by section.displayOrder
 * - Ensures settings appear in correct section order
 *
 * Display Order vs Null Handling:
 * - displayOrder: Numeric order within section (1, 2, 3, etc.)
 * - null displayOrder: Treated as 999 (shown last within section)
 * - nullsFirst: false ensures null values sorted after numbered values
 *
 * Caching Strategy:
 * - Cache-Control: public, max-age=3600 (1 hour browser cache)
 * - CDN-Cache-Control: public, max-age=3600 (1 hour CDN cache)
 * - Reference data changes infrequently (only when database updated)
 * - Significantly reduces database load for frequently accessed data
 *
 * Use Cases:
 * - Build page tuning interface (sections, settings inputs)
 * - Tuning catalog browsing
 * - Build editing interface
 * - Admin tuning management
 *
 * Security:
 * - Public endpoint (no authentication)
 * - Read-only access (no mutations)
 * - Safe to cache (reference data doesn't change per user)
 *
 * How It Works:
 * 1. Parse query parameters (sectionId, active, includeInactive)
 * 2. Build query with optional filters (default to active settings)
 * 3. Fetch settings with section relationship
 * 4. Sort by section displayOrder (client-side)
 * 5. Return results with cache headers
 *
 * Debugging Tips:
 * - Empty list: Check TuningSetting table has records with isActive=true
 * - Wrong sort order: Verify TuningSection.displayOrder and displayOrder values
 * - Inactive settings not showing: Set includeInactive=true
 * - Filter not working: Check sectionId exists in TuningSection table
 * - Settings out of order: Check displayOrder values (should be sequential)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { DbTuningSection } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // BUILD QUERY WITH FILTERS
    // ============================================================
    // Parse query parameters for optional filtering
    // - sectionId: Filter to specific tuning section
    // - active: Explicit filter for active status (true/false)
    // - includeInactive: Override to show both active and inactive
    //
    // Default behavior: Only active settings (isActive=true)
    // This hides deleted/retired settings from normal usage
    //
    // Filter Priority:
    // 1. active=true/false takes precedence
    // 2. includeInactive only applies if active not specified
    // 3. Default to active-only if neither specified
    //
    // Debugging Tips:
    // - Test with ?active=true and ?active=false
    // - Test with ?includeInactive=true for admin views
    // - Check TuningSetting.isActive field if settings missing
    // ============================================================

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const sectionId = searchParams.get('sectionId')
    const active = searchParams.get('active')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('TuningSetting')
      .select(`
        *,
        section:TuningSection(*)
      `)

    // Filter by section if specified
    if (sectionId) {
      query = query.eq('sectionId', sectionId)
    }

    // Filter by active status
    // Priority: active param > includeInactive param > default active
    if (active === 'true') {
      query = query.eq('isActive', true)
    } else if (active === 'false') {
      query = query.eq('isActive', false)
    } else if (!includeInactive) {
      // Default to only active settings unless explicitly requested
      query = query.eq('isActive', true)
    }

    // ============================================================
    // FETCH SETTINGS WITH DATABASE SORTING
    // ============================================================
    // Fetch settings with dual sorting at database level:
    // 1. sectionId (A-Z) - Groups settings by section
    // 2. displayOrder (ascending, nulls last) - Custom order within section
    //
    // Display Order Logic:
    // - Numeric order (1, 2, 3, etc.) for custom sorting
    // - null values sorted last (nullsFirst: false)
    // - Treated as 999 in client-side sort for consistency
    //
    // Why Two-Level Sort?
    // - Database sort: Fast, but can't access relationship fields
    // - Client-side sort: Can use section.displayOrder
    // - Final sort: Use displayOrder for correct section/setting order
    //
    // Note: Supabase doesn't support sorting by relationship fields
    // Must fetch all settings, then sort by section.displayOrder in memory
    //
    // Debugging Tips:
    // - Check TuningSection table has displayOrder values
    // - Check TuningSetting.displayOrder values are sequential
    // - Verify null values sorted last (should be 999 in client sort)
    // - Client sort only runs if section relationship included
    // ============================================================

    // Order by sectionId first, then by displayOrder
    const { data: settings, error } = await query.order('sectionId', { ascending: true }).order('displayOrder', { ascending: true, nullsFirst: false })

    if (error) throw error

    // ============================================================
    // CLIENT-SIDE SORT BY SECTION DISPLAY ORDER
    // ============================================================
    // Sort settings by section.displayOrder (client-side)
    // Supabase doesn't support sorting by relationship fields
    // Must fetch all settings, then sort in memory
    //
    // Sorting Logic:
    // 1. Primary: section.displayOrder (numeric order)
    // 2. Secondary: setting.displayOrder (numeric order, nulls as 999)
    //
    // Why Client-Side Sort?
    // - TuningSection.displayOrder not accessible in .order() clause
    // - Ensures settings appear in correct section order
    // - Only runs if section relationship included in select
    //
    // Display Order Example:
    // - Engine: section.displayOrder=1, settings ordered by displayOrder
    // - Tires: section.displayOrder=2, settings ordered by displayOrder
    // - Aero: section.displayOrder=3, settings ordered by displayOrder
    //
    // Null Handling:
    // - displayOrder=null treated as 999
    // - Ensures unnumbered settings appear last within section
    // - Consistent with database nullsFirst: false behavior
    //
    // Debugging Tips:
    // - Verify TuningSection.displayOrder values are set
    // - Check sort order: Sections should appear in displayOrder sequence
    // - Check settings order: Should be displayOrder within each section
    // - Empty section: Check section relationship is included in select
    // ============================================================

    // Client-side sort by section displayOrder if sections are included
    if (settings && settings.length > 0 && settings[0].section) {
      settings.sort((a, b) => {
        const sectionOrder = ((a.section as any).displayOrder || 0) - ((b.section as any).displayOrder || 0)
        if (sectionOrder !== 0) return sectionOrder
        return (a.displayOrder || 999) - (b.displayOrder || 999)
      })
    }

    // ============================================================
    // RETURN RESULTS WITH CACHE HEADERS
    // ============================================================
    // Return settings with aggressive caching (1 hour)
    // Reference data changes infrequently (only when DB updated)
    // Cache headers reduce database load for frequently accessed data
    //
    // Cache Strategy:
    // - Cache-Control: Browser cache for 1 hour
    // - CDN-Cache-Control: CDN edge cache for 1 hour
    // - Reduces database queries for repeated requests
    //
    // Debugging Tips:
    // - Cache not updating: Clear browser cache or use cache buster
    // - Testing: Add ?nocache=true to bypass cache during development
    // - CDN propagation: Changes may take up to 1 hour to reach all edge nodes
    // ============================================================

    return NextResponse.json({ settings }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error fetching tuning settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tuning settings' },
      { status: 500 }
    )
  }
}
