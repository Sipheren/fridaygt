/**
 * Dropdown Formatting Helpers
 *
 * Purpose: Format database objects into ComboBoxOption format for UI dropdowns
 * - Converts DbCar and DbTrack objects into searchable, grouped dropdown options
 * - Generates search terms for fuzzy matching (manufacturer, year, name, etc.)
 * - Handles optional fields (year, layout, location) with graceful fallbacks
 *
 * **ComboBoxOption Format:**
 * ```tsx
 * {
 *   value: string    // Unique identifier (UUID)
 *   label: string    // Display text shown in dropdown
 *   group: string    // Group header for organization
 *   searchTerms: string // Combined fields for fuzzy search
 * }
 * ```
 *
 * **Car Formatting:**
 * - Label: "{year} {name}" (year omitted if null)
 * - Group: manufacturer (Porsche, Ferrari, etc.)
 * - Search terms: manufacturer, year, name, category
 * - Example: "2024 Porsche 911 GT3" (N Class)
 *
 * **Track Formatting:**
 * - Label: "{name}" or "{name} - {layout}" (if layout exists)
 * - Group: location, country, or "Other" (fallback)
 * - Search terms: name, country, layout, location, category
 * - Example: "Fuji Speedway - Grand Prix" (Japan, Original)
 *
 * **Why Search Terms?**
 * - Enables fuzzy matching in SearchableCombobox component
 * - User can type any part: "porsche", "911", "gt3", "2024"
 * - All searchable fields combined into single string
 * - Improves UX: Natural search without exact matching
 *
 * **Use Cases:**
 * - Build page: Car selection dropdown
 * - Race creation: Track selection dropdown
 * - Lap time entry: Car/track selection
 * - Any searchable dropdown with database entities
 *
 * **Graceful Fallbacks:**
 * - Year null: Omit year from label
 * - Layout null: Show track name only
 * - Location null: Use country, then "Other"
 * - Category null: Exclude from search terms
 *
 * **Debugging Tips:**
 * - Options not grouping: Check group field values are consistent
 * - Search not working: Verify searchTerms includes all relevant fields
 * - Label format wrong: Check optional field handling (year, layout)
 * - Empty options array: Verify database query returned results
 * - Group duplicates: Check data consistency (location spelling)
 *
 * **Related Files:**
 * - @/components/ui/searchable-combobox.tsx: Component using these options
 * - @/types/database.ts: DbCar and DbTrack type definitions
 * - API routes: /api/cars, /api/tracks (source of database objects)
 */

import { ComboBoxOption } from "@/components/ui/searchable-combobox"
import type { DbCar, DbTrack } from "@/types/database"

/**
 * Formats an array of DbCar objects into ComboBoxOption format for car dropdowns.
 * Groups by manufacturer, label shows "{year} {name}" (year omitted if null).
 *
 * **Label Format:**
 * - With year: "2024 Porsche 911 GT3"
 * - Without year: "Porsche 911 GT3"
 * - Year omission: Gracefully handles null/undefined year
 *
 * **Grouping Strategy:**
 * - Group by manufacturer: All Porsches under "Porsche" header
 * - Natural organization: Users think "I want a Porsche"
 * - Sorted alphabetically: Manufacturer order in dropdown
 *
 * **Search Terms:**
 * - Includes: manufacturer, year, name, category
 * - Enables: "porsche", "911", "gt3", "2024", "n class"
 * - Fuzzy match: User can type any part to find car
 *
 * **Usage Example:**
 * ```tsx
 * const { data: cars } = await supabase.from('Car').select('*')
 * const options = formatCarOptions(cars)
 * // Returns: [
 * //   { value: "uuid-1", label: "2024 Porsche 911 GT3", group: "Porsche", searchTerms: "Porsche 911 GT3 2024 N Class" },
 * //   { value: "uuid-2", label: "Ferrari 488 GTB", group: "Ferrari", searchTerms: "Ferrari 488 GTB N Class" }
 * // ]
 * ```
 *
 * @param cars - Array of DbCar objects from the database
 * @returns Array of ComboBoxOption with group, label, and searchTerms
 */
export function formatCarOptions(cars: DbCar[]): ComboBoxOption[] {
  return cars.map((car) => {
    // ============================================================
    // LABEL FORMAT
    // ============================================================
    // Format: "{year} {name}" (year omitted if null)
    // - With year: "2024 Porsche 911 GT3"
    // - Without year: "Porsche 911 GT3"
    // - Gracefully handles null/undefined year
    //
    // Why Year First?
    // - Distinguishes between model years (2023 vs 2024)
    // - Common convention: Year precedes model name
    // - Natural reading: "2024 911 GT3" flows better than "911 GT3 2024"
    //
    // Debugging Tips:
    // - Year not showing: Check car.year is not null
    // - Format wrong: Verify year is a number (not string)
    // ============================================================

    const label = car.year ? `${car.year} ${car.name}` : car.name

    return {
      value: car.id,
      label,
      group: car.manufacturer,
      searchTerms: getCarSearchTerms(car),
    }
  })
}

/**
 * Formats an array of DbTrack objects into ComboBoxOption format for track dropdowns.
 * Groups by country (or "Other" if null), label shows track name.
 *
 * **Label Format:**
 * - Without layout: "Fuji Speedway"
 * - With layout: "Fuji Speedway - Grand Prix"
 * - Layout suffix: Distinguishes track configurations
 *
 * **Grouping Strategy:**
 * - Priority: location > country > "Other"
 * - Location examples: "Japan", "United Kingdom", "Belgium"
 * - Fallback "Other": Catches tracks without location data
 * - Natural organization: Users think "I want a Japanese track"
 *
 * **Search Terms:**
 * - Includes: name, country, layout, location, category
 * - Enables: "fuji", "speedway", "japan", "grand prix", "dlc"
 * - Fuzzy match: User can type any part to find track
 *
 * **Usage Example:**
 * ```tsx
 * const { data: tracks } = await supabase.from('Track').select('*')
 * const options = formatTrackOptions(tracks)
 * // Returns: [
 * //   { value: "uuid-1", label: "Fuji Speedway - Grand Prix", group: "Japan", searchTerms: "Fuji Speedway Grand Prix Japan Original" },
 * //   { value: "uuid-2", label: "Brands Hatch", group: "United Kingdom", searchTerms: "Brands Hatch United Kingdom DLC" }
 * // ]
 * ```
 *
 * @param tracks - Array of DbTrack objects from the database
 * @returns Array of ComboBoxOption with group, label, and searchTerms
 */
export function formatTrackOptions(tracks: DbTrack[]): ComboBoxOption[] {
  return tracks.map((track) => {
    // ============================================================
    // LABEL FORMAT
    // ============================================================
    // Format: "{name}" or "{name} - {layout}" (if layout exists)
    // - Without layout: "Fuji Speedway"
    // - With layout: "Fuji Speedway - Grand Prix"
    // - Layout suffix: Distinguishes track configurations
    //
    // Why Layout Suffix?
    // - Many tracks have multiple layouts (Grand Prix, Short, etc.)
    // - Distinguishes configurations: "Fuji Speedway - Grand Prix" vs "Fuji Speedway - Short"
    // - Clear hierarchy: Track name first, layout second
    //
    // Debugging Tips:
    // - Layout not showing: Check track.layout is not null
    // - Group wrong: Verify track.location/country values are consistent
    // ============================================================

    // Label format: {name} (with layout suffix if applicable)
    const label = track.layout ? `${track.name} - ${track.layout}` : track.name

    // ============================================================
    // GROUP FORMAT
    // ============================================================
    // Priority: location > country > "Other"
    // - location: Specific city/region (preferred)
    // - country: Country name (fallback)
    // - "Other": Catches tracks without location data
    //
    // Why This Priority?
    // - location is more specific: "Tokyo" vs "Japan"
    // - country is good fallback: Still geographically organized
    // - "Other" prevents errors: Tracks without data still shown
    //
    // Debugging Tips:
    // - Group "Other": Check track.location and track.country are set
    // - Inconsistent groups: Verify location spelling is consistent
    // ============================================================

    // Use location for grouping (contains country names like "Australia", "Belgium", etc.)
    // Fallback to country, then "Other"
    const group = track.location || track.country || "Other"

    return {
      value: track.id,
      label,
      group,
      searchTerms: getTrackSearchTerms(track),
    }
  })
}

/**
 * Generates search terms for a car to enable "contains" matching.
 * Includes manufacturer, year, and name.
 *
 * **Search Terms Strategy:**
 * - All searchable fields combined into single string
 * - Space-separated: "Porsche 911 GT3 2024 N Class"
 * - Fuzzy match: "por", "911", "gt3", "2024" all match
 * - Case insensitive: User can type "porsche" or "PORSCHE"
 *
 * **Fields Included:**
 * - manufacturer: "Porsche" (primary search term)
 * - name: "911 GT3" (model name)
 * - year: "2024" (if present)
 * - category: "N Class" (if present)
 *
 * **Why This Combination?**
 * - Manufacturer: How users think ("I want a Porsche")
 * - Name: Model identification ("911 GT3")
 * - Year: Distinguishes model years
 * - Category: Filters by car class
 *
 * **Search Examples:**
 * - "porsche" → Matches all Porsches
 * - "911" → Matches all 911 models
 * - "gt3" → Matches all GT3 variants
 * - "2024" → Matches 2024 models only
 * - "n class" → Matches N Class cars only
 *
 * @param car - DbCar object
 * @returns Combined search terms string
 */
export function getCarSearchTerms(car: DbCar): string {
  const parts = [car.manufacturer, car.name]

  // Add year if present
  if (car.year) {
    parts.push(car.year.toString())
  }

  // Add category if present
  if (car.category) {
    parts.push(car.category)
  }

  return parts.join(" ")
}

/**
 * Generates search terms for a track to enable "contains" matching.
 * Includes country, name, and layout.
 *
 * **Search Terms Strategy:**
 * - All searchable fields combined into single string
 * - Space-separated: "Fuji Speedway Grand Prix Japan Original"
 * - Fuzzy match: "fuji", "speedway", "grand prix", "japan" all match
 * - Case insensitive: User can type "fuji" or "FUJI"
 *
 * **Fields Included:**
 * - name: "Fuji Speedway" (primary search term)
 * - country: "Japan" (geographic grouping)
 * - layout: "Grand Prix" (if present)
 * - location: "Tokyo Region" (if present, more specific than country)
 * - category: "Original" or "DLC" (track type)
 *
 * **Why This Combination?**
 * - Name: Primary identifier ("Fuji Speedway")
 * - Country: Geographic search ("Japanese tracks")
 * - Layout: Configuration identification ("Grand Prix layout")
 * - Location: More specific than country ("Tokyo area")
 * - Category: Filter by track type ("DLC tracks")
 *
 * **Search Examples:**
 * - "fuji" → Matches Fuji Speedway
 * - "speedway" → Matches all speedways
 * - "grand prix" → Matches Grand Prix layouts
 * - "japan" → Matches all Japanese tracks
 * - "dlc" → Matches DLC tracks only
 * - "tokyo" → Matches tracks in Tokyo area
 *
 * @param track - DbTrack object
 * @returns Combined search terms string
 */
export function getTrackSearchTerms(track: DbTrack): string {
  const parts = [track.name]

  // Add country if present
  if (track.country) {
    parts.push(track.country)
  }

  // Add layout if present
  if (track.layout) {
    parts.push(track.layout)
  }

  // Add location if present (often contains city/region)
  if (track.location) {
    parts.push(track.location)
  }

  // Add category if present
  if (track.category) {
    parts.push(track.category)
  }

  return parts.join(" ")
}
