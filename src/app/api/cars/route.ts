/**
 * Car Listing API
 *
 * GET /api/cars - List all cars with optional filtering (public endpoint)
 *
 * Purpose: Provide reference data for all available cars in GT7
 * - Public endpoint (no authentication required)
 * - Supports filtering by category and manufacturer
 * - Returns complete car data including specifications
 * - Optimized for frontend car selection components
 * - Cacheable response (1 hour CDN cache)
 *
 * Data Returned:
 * - All car fields: id, name, slug, manufacturer, year, category, etc.
 * - Ordered by: manufacturer (A-Z), then name (A-Z)
 * - No pagination (suitable for current car database size)
 *
 * Filtering Options:
 * - category: Filter by car category (e.g., 'N Class', 'Gr.3', 'Gr.4')
 * - manufacturer: Filter by manufacturer (e.g., 'Porsche', 'Ferrari')
 * - No filters: Returns all cars sorted by manufacturer, then name
 *
 * Caching Strategy:
 * - Cache-Control: public, max-age=3600 (1 hour browser cache)
 * - CDN-Cache-Control: public, max-age=3600 (1 hour CDN cache)
 * - Reference data changes infrequently (only when database updated)
 * - Significantly reduces database load for frequently accessed data
 *
 * Use Cases:
 * - Car selection dropdowns (build creation, lap time entry)
 * - Car filtering/searching UI
 * - Car catalog browsing
 * - Build page car selector
 *
 * Security:
 * - Public endpoint (no authentication)
 * - Read-only access (no mutations)
 * - Safe to cache (reference data doesn't change per user)
 *
 * How It Works:
 * 1. Parse query parameters (category, manufacturer)
 * 2. Build query with optional filters
 * 3. Order by manufacturer, then name
 * 4. Return results with cache headers
 *
 * Debugging Tips:
 * - Empty list: Check Car table has records
 * - Filter not working: Verify category/manufacturer values match database
 * - Cache issues: Clear browser cache or use cache-busting query param
 * - Sorting: Verify manufacturer and name are indexed for performance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // BUILD QUERY WITH FILTERS
    // ============================================================
    // Parse query parameters for optional filtering
    // - category: Filter by car category (N Class, Gr.3, Gr.4, etc.)
    // - manufacturer: Filter by car manufacturer (Porsche, Ferrari, etc.)
    //
    // Default behavior: No filters applied (returns all cars)
    //
    // Debugging Tips:
    // - Check category values match Car.category enum
    // - Check manufacturer values match Car.manufacturer strings
    // - Test with/without filters to verify query building
    // ============================================================

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const manufacturer = searchParams.get('manufacturer')

    let query = supabase
      .from('Car')
      .select('*')

    // Filter by category if specified
    if (category) {
      query = query.eq('category', category)
    }

    // Filter by manufacturer if specified
    if (manufacturer) {
      query = query.eq('manufacturer', manufacturer)
    }

    // ============================================================
    // FETCH CARS WITH SORTING
    // ============================================================
    // Fetch cars with dual sorting:
    // 1. manufacturer (A-Z) - Groups cars by brand
    // 2. name (A-Z) - Alphabetical within manufacturer
    //
    // This sorting creates natural organization:
    // - All Porsches together
    // - Porsches sorted alphabetically (911 GT3, 911 Turbo, etc.)
    //
    // Debugging Tips:
    // - Verify sorting: Check manufacturer groups are together
    // - Performance: Ensure manufacturer and name columns are indexed
    // - Frontend: Display cars in returned order (no client-side sort needed)
    // ============================================================

    // Order by manufacturer, then by name
    const { data: cars, error } = await query
      .order('manufacturer', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    // ============================================================
    // RETURN RESULTS WITH CACHE HEADERS
    // ============================================================
    // Return cars with aggressive caching (1 hour)
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

    return NextResponse.json({ cars }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error fetching cars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cars' },
      { status: 500 }
    )
  }
}
