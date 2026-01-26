/**
 * Parts Listing API
 *
 * GET /api/parts - List all parts with optional filtering (public endpoint)
 *
 * Purpose: Provide reference data for all tuning parts available in GT7
 * - Public endpoint (no authentication required)
 * - Supports filtering by category and active status
 * - Returns parts with category relationship data
 * - Two-level sorting (category displayOrder, then part name)
 * - Cacheable response (1 hour CDN cache)
 *
 * Data Returned:
 * - All part fields: id, name, categoryId, isActive, displayOrder
 * - Category relationship: PartCategory (id, name, displayOrder)
 * - Sorted by: category displayOrder, then part name (A-Z)
 *
 * Filtering Options:
 * - categoryId: Filter to specific part category
 * - active=true: Only active parts
 * - active=false: Only inactive parts
 * - includeInactive=true: Show all parts (active + inactive)
 * - Default: Only active parts (isActive=true)
 *
 * Active Status Logic:
 * - Parts have isActive field (soft delete/hide functionality)
 * - Default behavior: Only return active parts
 * - Frontend can request inactive parts if needed (admin, editing)
 * - Active filter takes precedence over includeInactive
 *
 * Two-Level Sorting Strategy:
 * 1. Database sort: categoryId (A-Z), then name (A-Z)
 * 2. Client-side sort: category displayOrder, then part name
 *
 * Why Client-Side Sort?
 * - Supabase doesn't support sorting by relationship fields
 * - Category.displayOrder not accessible in .order() clause
 * - Fetch all parts, then sort in memory by category.displayOrder
 * - Ensures parts appear in correct category order
 *
 * Caching Strategy:
 * - Cache-Control: public, max-age=3600 (1 hour browser cache)
 * - CDN-Cache-Control: public, max-age=3600 (1 hour CDN cache)
 * - Reference data changes infrequently (only when database updated)
 * - Significantly reduces database load for frequently accessed data
 *
 * Use Cases:
 * - Build page part selection (dropdowns, filters)
 * - Part catalog browsing
 * - Build editing interface
 * - Admin part management
 *
 * Security:
 * - Public endpoint (no authentication)
 * - Read-only access (no mutations)
 * - Safe to cache (reference data doesn't change per user)
 *
 * How It Works:
 * 1. Parse query parameters (categoryId, active, includeInactive)
 * 2. Build query with optional filters (default to active parts)
 * 3. Fetch parts with category relationship
 * 4. Sort by category displayOrder (client-side)
 * 5. Return results with cache headers
 *
 * Debugging Tips:
 * - Empty list: Check Part table has records with isActive=true
 * - Wrong sort order: Verify PartCategory.displayOrder values
 * - Inactive parts not showing: Set includeInactive=true
 * - Filter not working: Check categoryId exists in PartCategory table
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { DbPartCategory } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // BUILD QUERY WITH FILTERS
    // ============================================================
    // Parse query parameters for optional filtering
    // - categoryId: Filter to specific part category
    // - active: Explicit filter for active status (true/false)
    // - includeInactive: Override to show both active and inactive
    //
    // Default behavior: Only active parts (isActive=true)
    // This hides deleted/retired parts from normal usage
    //
    // Filter Priority:
    // 1. active=true/false takes precedence
    // 2. includeInactive only applies if active not specified
    // 3. Default to active-only if neither specified
    //
    // Debugging Tips:
    // - Test with ?active=true and ?active=false
    // - Test with ?includeInactive=true for admin views
    // - Check Part.isActive field if parts missing
    // ============================================================

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const categoryId = searchParams.get('categoryId')
    const active = searchParams.get('active')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('Part')
      .select(`
        *,
        category:PartCategory(*)
      `)

    // Filter by category if specified
    if (categoryId) {
      query = query.eq('categoryId', categoryId)
    }

    // Filter by active status
    // Priority: active param > includeInactive param > default active
    if (active === 'true') {
      query = query.eq('isActive', true)
    } else if (active === 'false') {
      query = query.eq('isActive', false)
    } else if (!includeInactive) {
      // Default to only active parts unless explicitly requested
      query = query.eq('isActive', true)
    }

    // ============================================================
    // FETCH PARTS WITH DATABASE SORTING
    // ============================================================
    // Fetch parts with dual sorting at database level:
    // 1. categoryId (A-Z) - Groups parts by category
    // 2. name (A-Z) - Alphabetical within category
    //
    // Why Two-Level Sort?
    // - Database sort: Fast, but can't access relationship fields
    // - Client-side sort: Can use category.displayOrder
    // - Final sort: Use displayOrder for correct category order
    //
    // Note: Supabase doesn't support sorting by relationship fields
    // Must fetch all parts, then sort by category.displayOrder in memory
    //
    // Debugging Tips:
    // - Check PartCategory table has displayOrder values
    // - Verify all categories have displayOrder set
    // - Client sort only runs if category relationship included
    // ============================================================

    // Order by categoryId first, then by name
    const { data: parts, error } = await query.order('categoryId', { ascending: true }).order('name', { ascending: true })

    if (error) throw error

    // ============================================================
    // CLIENT-SIDE SORT BY CATEGORY DISPLAY ORDER
    // ============================================================
    // Sort parts by category.displayOrder (client-side)
    // Supabase doesn't support sorting by relationship fields
    // Must fetch all parts, then sort in memory
    //
    // Sorting Logic:
    // 1. Primary: category.displayOrder (numeric order)
    // 2. Secondary: part name (alphabetical)
    //
    // Why Client-Side Sort?
    // - PartCategory.displayOrder not accessible in .order() clause
    // - Ensures parts appear in correct category order
    // - Only runs if category relationship included in select
    //
    // Display Order Example:
    // - Engine: displayOrder=1 (shown first)
    // - Tires: displayOrder=2 (shown second)
    // - Aero: displayOrder=3 (shown third)
    //
    // Debugging Tips:
    // - Verify PartCategory.displayOrder values are set
    // - Check sort order: Categories should appear in displayOrder sequence
    // - Empty category: Check category relationship is included in select
    // ============================================================

    // Client-side sort by category displayOrder if categories are included
    if (parts && parts.length > 0 && parts[0].category) {
      parts.sort((a, b) => {
        const categoryOrder = ((a.category as any).displayOrder || 0) - ((b.category as any).displayOrder || 0)
        if (categoryOrder !== 0) return categoryOrder
        return a.name.localeCompare(b.name)
      })
    }

    // ============================================================
    // RETURN RESULTS WITH CACHE HEADERS
    // ============================================================
    // Return parts with aggressive caching (1 hour)
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

    return NextResponse.json({ parts }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error fetching parts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parts' },
      { status: 500 }
    )
  }
}
