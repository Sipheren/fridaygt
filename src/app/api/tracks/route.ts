/**
 * Track Listing API
 *
 * GET /api/tracks - List all tracks (public endpoint)
 *
 * Purpose: Provide reference data for all available tracks in GT7
 * - Public endpoint (no authentication required)
 * - Returns complete track data including layouts and locations
 * - Organized by category for easy navigation
 * - Cacheable response (1 hour CDN cache)
 * - No filtering (all tracks returned, frontend handles filtering)
 *
 * Data Returned:
 * - All track fields: id, name, slug, location, category, layout
 * - Ordered by: category (A-Z)
 * - No pagination (suitable for current track database size)
 *
 * Track Categories:
 * - Original tracks: Fuji, Suzuka, Laguna Seca, etc.
 * - DLC tracks: Goodwood, Brands Hatch, etc.
 * - Category field enables track grouping in UI
 *
 * Caching Strategy:
 * - Cache-Control: public, max-age=3600 (1 hour browser cache)
 * - CDN-Cache-Control: public, max-age=3600 (1 hour CDN cache)
 * - Reference data changes infrequently (only when database updated)
 * - Significantly reduces database load for frequently accessed data
 *
 * Use Cases:
 * - Track selection dropdowns (lap time entry, build page)
 * - Track filtering/searching UI
 * - Track catalog browsing
 * - Lap time recording
 *
 * Security:
 * - Public endpoint (no authentication)
 * - Read-only access (no mutations)
 * - Safe to cache (reference data doesn't change per user)
 *
 * How It Works:
 * 1. Fetch all tracks from Track table
 * 2. Sort by category (A-Z)
 * 3. Return results with cache headers
 *
 * Debugging Tips:
 * - Empty list: Check Track table has records
 * - Sorting issues: Verify category values are consistent
 * - Cache issues: Clear browser cache or use cache-busting query param
 * - Frontend: Group tracks by category for better UX
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// GET /api/tracks - Get all tracks
export async function GET() {
  try {
    // ============================================================
    // FETCH ALL TRACKS
    // ============================================================
    // Fetch all tracks from Track table
    // Returns complete track data including:
    // - id: Track UUID
    // - name: Track display name (e.g., "Fuji Speedway")
    // - slug: URL-friendly track identifier (e.g., "fuji-speedway")
    // - location: Track location (e.g., "Japan", "United Kingdom")
    // - category: Track category for grouping (e.g., "Original", "DLC")
    // - layout: Track layout if applicable (e.g., "Grand Prix", "Short")
    //
    // Sorting:
    // - Order by category ascending (A-Z)
    // - Groups tracks by category (Original, DLC, etc.)
    // - Frontend can further sort within categories
    //
    // Debugging Tips:
    // - Check Track table has records if empty list returned
    // - Verify category values are consistent for proper grouping
    // - Frontend: Display tracks grouped by category
    // ============================================================

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('Track')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      console.error('Error fetching tracks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 }
      )
    }

    // ============================================================
    // RETURN RESULTS WITH CACHE HEADERS
    // ============================================================
    // Return tracks with aggressive caching (1 hour)
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

    return NextResponse.json({ tracks: data }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
