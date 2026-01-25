import { ComboBoxOption } from "@/components/ui/searchable-combobox"
import type { DbCar, DbTrack } from "@/types/database"

/**
 * Formats an array of DbCar objects into ComboBoxOption format for car dropdowns.
 * Groups by manufacturer, label shows "{year} {name}" (year omitted if null).
 *
 * @param cars - Array of DbCar objects from the database
 * @returns Array of ComboBoxOption with group, label, and searchTerms
 */
export function formatCarOptions(cars: DbCar[]): ComboBoxOption[] {
  return cars.map((car) => {
    // Label format: {year} {name} (year omitted if null)
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
 * @param tracks - Array of DbTrack objects from the database
 * @returns Array of ComboBoxOption with group, label, and searchTerms
 */
export function formatTrackOptions(tracks: DbTrack[]): ComboBoxOption[] {
  return tracks.map((track) => {
    // Label format: {name} (with layout suffix if applicable)
    const label = track.layout ? `${track.name} - ${track.layout}` : track.name

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
