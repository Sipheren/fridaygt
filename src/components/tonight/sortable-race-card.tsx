/**
 * Sortable Race Card Component
 *
 * Purpose: Individual race card in the draggable Tonight page list
 * - Displays race information in a card format
 * - Shows track, cars, builds, and race configuration
 * - Drag handle for reordering (when 2+ races)
 * - Link to race detail page
 * - Visual feedback during drag
 *
 * **Key Features:**
 * - Race number badge: Shows position in list (1, 2, 3, etc.)
 * - Display name: Race name or generated from track + car
 * - Track info: Name, layout, location with MapPin icon
 * - Builds section: Shows all cars and builds for this race
 * - Race configuration: Laps, weather, track length badges
 * - Description: Optional race description
 * - View details link: Navigates to race detail page
 * - Drag handle: For reordering (only shown when 2+ races)
 * - Visual states: Default, dragging, hover
 *
 * **Data Flow:**
 * 1. Props: race object, index position
 * 2. useSortable: Hook provides drag functionality
 * 3. User drags: Parent SortableRaceList handles reordering
 * 4. User clicks link: Navigates to race detail page
 * 5. Visual feedback: Changes appearance during drag
 *
 * **State Management:**
 * - No local state: All state from parent
 * - DnD state: isDragging, transform, transition from useSortable hook
 *
 * **Drag and Drop:**
 * - Library: @dnd-kit/sortable
 * - Hook: useSortable for drag functionality
 * - Attributes: ARIA attributes for accessibility
 * - Listeners: Event listeners for drag interactions
 * - Transform: CSS transform for smooth animations
 *
 * **Display Name Logic:**
 * - Priority: race.name (if set) → generated from track + car
 * - Generated format: "{trackName} + {carName}"
 * - Example: "Fuji Speedway + Porsche 911 GT3"
 * - Purpose: Provide meaningful name when race.name is null
 *
 * **Track Information:**
 * - Track name: Always shown
 * - Layout: Shown in parentheses if exists (e.g., "Grand Prix")
 * - Location: Shown with bullet separator if exists
 * - Icon: MapPin icon for visual clarity
 *
 * **Builds Section:**
 * - Header: Shows "X Builds" count (e.g., "2 Builds")
 * - Empty: Shows "No Builds" if no cars
 * - Car display: Manufacturer + name (e.g., "Porsche 911 GT3")
 * - Build link: Build name with chevron, links to build detail
 * - Styling: Background changes on hover
 *
 * **Race Configuration Badges:**
 * - Laps: Flag icon + lap count (e.g., "🏁 5 Laps")
 * - Weather: Weather emoji + condition (☀️ Dry, 💧 Wet, 🌤️ Mixed)
 * - Track length: Trophy icon + length in km (e.g., "🏆 12.5km")
 * - Purpose: Quick overview of race settings
 *
 * **Description:**
 * - Optional: Only shown if race.description exists
 * - Styling: Text-muted-foreground, smaller font
 * - Separator: Border-top for visual separation
 * - Purpose: Additional context about the race
 *
 * **View Details Link:**
 * - Entire card not clickable: Prevents accidental navigation
 * - Only link footer clickable: Explicit action
 * - Chevron animation: Slides right on hover
 * - Hover effect: Text color changes to foreground
 *
 * **Visual States:**
 * - Default: gt-card-shine effect, border-primary/20
 * - Hover: border-primary/50, shadow-xl, shadow-primary/10
 * - Dragging: scale-[1.02], z-50, ring-2 ring-primary, opacity-90
 * - Group hover: Builds section background changes
 *
 * **Responsive Design:**
 * - Mobile: Stacked layout, full-width cards
 * - Desktop: Same layout, cards can be wider
 * - Touch: Drag handle sized for touch (44px minimum)
 *
 * **Accessibility:**
 * - Drag handle: Keyboard accessible, ARIA attributes
 * - Focus management: Default @dnd-kit behavior
 * - Screen readers: Semantic HTML structure
 * - Touch targets: 44px minimum for interactive elements
 *
 * **Styling:**
 * - Global classes: gt-card-shine (card shine effect)
 * - Gradient: Header has gradient background (from-primary/10 to transparent)
 * - Borders: 2px border with hover effects
 * - Animations: Smooth transitions (200ms duration)
 * - Icons: Lucide icons for visual clarity
 *
 * **Performance:**
 * - No memoization: Simple component, not needed
 * - CSS transforms: Hardware-accelerated drag animations
 * - Optimized re-renders: Only re-renders when props change
 *
 * **Error Handling:**
 * - Missing data: Graceful fallbacks (e.g., "Unknown Track")
 * - Null checks: Safe navigation for optional fields
 * - Empty states: "No Builds" message when no cars
 *
 * **Debugging Tips:**
 * - Not dragging: Check attributes and listeners are on drag handle
 * - Link not working: Check race.id is correct
 * - Builds not showing: Check race.RaceCar array is populated
 * - Layout broken: Check CSS classes are correct
 * - Display name wrong: Check getDisplayName() logic
 * - Drag handle not showing: Check parent's canReorder prop (requires 2+ races)
 *
 * **Common Issues:**
 * - Drag not working: Check parent's canReorder is true
 * - Link not navigating: Check race.id is valid UUID
 * - Builds not displaying: Check race.RaceCar relationship
 * - Layout issues: Check CardContent padding is set to p-0
 * - Hover effects not working: Check group class is applied
 *
 * **Related Files:**
 * - @/components/tonight/sortable-race-list.tsx: Parent component that manages state
 * - @/components/ui/drag-handle.tsx: Drag handle component
 * - @/components/ui/card.tsx: shadcn Card component
 * - @/components/ui/badge.tsx: shadcn Badge component
 * - @/app/races/[id]/page.tsx: Race detail page
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DragHandle } from '@/components/ui/drag-handle'
import {
  MapPin,
  Car as CarIcon,
  Flag,
  Trophy,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// TYPE DEFINITIONS
// ============================================================
// Car: Car data from Car table
// RaceCar: Junction table linking Race, Car, and Build
// Track: Track data from Track table
// Race: Complete race object with relationships
// ============================================================

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
}

interface RaceCar {
  id: string
  carId: string
  buildId: string
  car: Car
  build: {
    id: string
    name: string
    description: string | null
  }
}

interface Track {
  id: string
  name: string
  slug: string
  location: string | null
  category: string
  layout: string | null
  length: number | null
}

interface Race {
  id: string
  name: string | null
  description: string | null
  laps: number | null
  weather: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  track: Track
  RaceCar: RaceCar[]
}

interface SortableRaceCardProps {
  race: Race
  index: number
}

export function SortableRaceCard({ race, index }: SortableRaceCardProps) {
  // ============================================================
  // DRAG AND DROP
  // ============================================================
  // useSortable hook provides drag functionality
  // - attributes: ARIA attributes for accessibility
  // - listeners: Event listeners for drag interactions
  // - setNodeRef: Ref for the draggable node
  // - transform: Current transform (x, y, scale)
  // - transition: CSS transition for smooth animations
  // - isDragging: Boolean indicating if currently dragging
  //
  // Why useSortable?
  // - Provides drag functionality for sortable lists
  // - Handles keyboard navigation
  // - ARIA attributes for screen readers
  // - Smooth animations with CSS transforms
  //
  // Visual feedback during drag:
  // - Scale increased (scale-[1.02])
  // - Shadow increased (shadow-xl)
  // - Ring border (ring-2 ring-primary)
  // - Opacity reduced (opacity-90)
  // - Z-index increased (z-50)
  //
  // Debugging Tips:
  // - Not dragging: Check listeners are applied to drag handle
  // - Choppy animation: Check CSS transition is applied
  // - Not sorting: Check parent SortableContext items prop
  // - Keyboard not working: Check parent KeyboardSensor
  // ============================================================

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: race.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // ============================================================
  // DISPLAY NAME LOGIC
  // ============================================================
  // Generate display name for race
  // - Priority: race.name (if set) → generated from track + car
  // - Generated format: "{trackName} + {carName}"
  // - Example: "Fuji Speedway + Porsche 911 GT3"
  //
  // Why generated name?
  // - Not all races have custom names
  // - Track + car is meaningful identifier
  // - Consistent format across races
  //
  // Fallback chain:
  // 1. race.name: Custom name (if set)
  // 2. track.name + car.name: Generated name
  // 3. "Unknown Track" + "Unknown Car": Last resort
  //
  // Debugging Tips:
  // - Wrong name: Check race.name is being checked first
  // - Track not showing: Check race.track relationship
  // - Car not showing: Check race.RaceCar[0] exists
  // ============================================================

  const getDisplayName = (race: Race): string => {
    // Use custom name if set
    if (race.name) return race.name

    // Generate from track + first car
    const trackName = race.track?.name || 'Unknown Track'
    const firstCar = race.RaceCar?.[0]?.car
    const carName = firstCar ? `${firstCar.manufacturer} ${firstCar.name}` : 'Unknown Car'

    return `${trackName} + ${carName}`
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card
        className={cn(
          'gt-card-shine h-full border-2 transition-all duration-200 cursor-pointer overflow-hidden',
          'border-primary/20 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10',
          // Dragging state visual feedback
          isDragging && [
            'shadow-xl scale-[1.02] z-50 ring-2 ring-primary',
            'opacity-90',
          ]
        )}
      >
        <CardContent className="p-0">
          {/* ============================================================
              Race Header
              - Gradient background for visual interest
              - Race number badge on left
              - Drag handle on right
              - Race display name
              - Track information (name, layout, location)
              ============================================================ */}
          <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
            {/* Top row: Race number on left, Drag handle on right */}
            <div className="flex items-start justify-between gap-4">
              {/* Race Number Badge */}
              {/* Shows position in list (1, 2, 3, etc.) */}
              {/* Large, prominent for visibility */}
              {/* Destructive color for contrast */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive text-destructive-foreground font-bold text-sm shadow-lg">
                {index + 1}
              </div>

              {/* Drag Handle */}
              {/* Only interactable part for dragging */}
              {/* Attributes and listeners from useSortable */}
              {/* Cursor changes to 'grabbing' during drag */}
              {/* Prevents click propagation to avoid triggering card click */}
              <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onClick={(e) => e.stopPropagation()}
              >
                <DragHandle isDragging={isDragging} />
              </div>
            </div>

            {/* Race Display Name */}
            {/* Large, bold for prominence */}
            {/* pr-14: Prevents text overlap with drag handle */}
            <h2 className="text-2xl font-bold pr-14 mt-4">{getDisplayName(race)}</h2>

            {/* Track Information */}
            {/* MapPin icon for visual clarity */}
            {/* Track name always shown */}
            {/* Layout in parentheses if exists */}
            {/* Location with bullet separator if exists */}
            <div className="flex items-center gap-2 mt-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-semibold">{race.track.name}</span>
              {race.track.layout && (
                <span className="text-sm text-muted-foreground">
                  ({race.track.layout})
                </span>
              )}
              {race.track.location && (
                <span className="text-xs text-muted-foreground">• {race.track.location}</span>
              )}
            </div>
          </div>

          {/* ============================================================
              Race Details
              - Builds section: Shows all cars and builds
              - Configuration badges: Laps, weather, track length
              - Description: Optional race description
              - View details link: Navigates to race detail page
              ============================================================ */}
          <div className="p-6 space-y-4">
            {/* Builds Section */}
            {/* Shows header with build count */}
            {/* Lists all cars and builds for this race */}
            {/* Empty state: "No Builds" if no cars */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <CarIcon className="h-4 w-4" />
                <span>
                  {race.RaceCar.length === 0
                    ? 'No Builds'
                    : race.RaceCar.length === 1
                    ? '1 Build'
                    : `${race.RaceCar.length} Builds`}
                </span>
              </div>

              {/* Builds List */}
              {race.RaceCar.length > 0 && (
                <div className="space-y-2">
                  {race.RaceCar.map((rc) => (
                    <div
                      key={rc.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors"
                    >
                      {/* Car and Build Information */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Car manufacturer and name */}
                          <span className="font-medium">
                            {rc.car.manufacturer} {rc.car.name}
                          </span>
                          {/* Build link (if build exists) */}
                          {/* Chevron icon with slide animation on hover */}
                          {/* Links to build detail page */}
                          {rc.build && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Link
                                href={`/builds/${rc.build.id}`}
                                className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {rc.build.name}
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Race Configuration Badges */}
            {/* Laps: Flag icon + lap count */}
            {/* Weather: Weather emoji + condition */}
            {/* Track length: Trophy icon + length in km */}
            {/* Only shown if data exists */}
            <div className="flex flex-wrap gap-2">
              {race.laps && (
                <Badge variant="secondary" className="gap-1">
                  <Flag className="h-3 w-3" />
                  {race.laps} {race.laps === 1 ? 'Lap' : 'Laps'}
                </Badge>
              )}
              {race.weather && (
                <Badge variant="outline" className="gap-1">
                  {race.weather === 'Dry' ? (
                    <span className="text-orange-500">☀️</span>
                  ) : race.weather === 'Wet' ? (
                    <span>💧</span>
                  ) : (
                    <span>🌤️</span>
                  )}
                  {race.weather}
                </Badge>
              )}
              {race.track.length && (
                <Badge variant="outline" className="gap-1">
                  <Trophy className="h-3 w-3" />
                  {race.track.length}km
                </Badge>
              )}
            </div>

            {/* Description */}
            {/* Only shown if race.description exists */}
            {/* Border-top separator for visual distinction */}
            {/* Text-muted-foreground for subtlety */}
            {race.description && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {race.description}
                </p>
              </div>
            )}

            {/* View Details CTA */}
            {/* Only this part is clickable, not entire card */}
            {/* Prevents accidental navigation during drag */}
            {/* Chevron animates right on group hover */}
            <Link
              href={`/races/${race.id}`}
              className="pt-4 border-t flex items-center justify-center text-sm text-muted-foreground font-medium hover:text-foreground transition-colors"
            >
              View Race Details
              <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
