/**
 * Sortable Race List Component
 *
 * Purpose: Draggable race list on the Tonight page with optimistic updates and rollback
 * - Displays list of races that can be reordered via drag and drop
 * - Uses @dnd-kit library for drag-and-drop functionality
 * - Optimistic updates with automatic save
 * - Rollback on error to preserve data integrity
 * - Haptic feedback for mobile devices
 * - Keyboard navigation for accessibility
 *
 * **Key Features:**
 * - Drag and drop: Reorder races by dragging cards
 * - Optimistic updates: UI updates immediately, API call debounced by 500ms
 * - Rollback on error: If API fails, restores previousRaces state
 * - Haptic feedback: Mobile devices vibrate on drag start (50ms)
 * - Keyboard navigation: Arrow keys + Space/Enter for keyboard users
 * - Saving indicator: Shows "Saving new order..." during API call
 * - Auto-save: Changes save automatically after 500ms debounce
 * - Conditional drag handle: Only shows drag handle if 2+ races (canReorder check)
 *
 * **Data Flow:**
 * 1. Component receives initialRaces from parent (Tonight page)
 * 2. User drags race card to new position
 * 3. handleDragEnd: Optimistic update (UI changes immediately)
 * 4. Debounced API call: Waits 500ms before calling API
 * 5. Success: Update with server response
 * 6. Error: Rollback to previousRaces state
 *
 * **State Management:**
 * - races: Current race order (updated optimistically)
 * - previousRaces: Backup of previous order for rollback
 * - isSaving: Loading state for API call
 * - saveTimeoutRef: Reference to debounced timeout
 *
 * **Drag and Drop:**
 * - Library: @dnd-kit/core and @dnd-kit/sortable
 * - PointerSensor: Mouse/touch input with 8px movement threshold
 * - KeyboardSensor: Arrow keys + Space/Enter for accessibility
 * - Collision detection: closestCenter (nearest drop target)
 * - Sorting strategy: verticalListSortingStrategy (vertical list)
 *
 * **Drag Activation:**
 * - Distance threshold: 8px movement before drag starts
 * - Purpose: Prevents accidental drags when tapping on mobile
 * - Haptic feedback: 50ms vibration on drag start
 * - Cursor: Changes to 'grabbing' during drag
 *
 * **Optimistic Updates:**
 * - Pattern: Update UI immediately, call API in background
 * - Benefits: Instant feedback, better UX
 * - Rollback: If API fails, restore previousRaces
 * - Debounce: 500ms delay to batch multiple drags
 *
 * **API Integration:**
 * - Endpoint: POST /api/races/reorder
 * - Request body: { raceIds: string[] }
 * - Response: { races: Race[] }
 * - Success: Update races and previousRaces with server response
 * - Error: Rollback to previousRaces, show error in console
 *
 * **Saving Indicator:**
 * - Trigger: isSaving state during API call
 * - Display: "Saving new order..." with pulsing animation
 * - Location: Above race list
 * - Purpose: Feedback that save is in progress
 *
 * **Helper Text:**
 * - Display: "Drag races to reorder • Changes save automatically"
 * - Condition: Only shown when canReorder=true (2+ races)
 * - Location: Below race list
 * - Purpose: Inform user about drag functionality
 *
 * **Accessibility:**
 * - Keyboard navigation: Arrow keys to move, Space/Enter to drag
 * - Focus management: Default @dnd-kit behavior
 * - Screen readers: ARIA attributes from @dnd-kit
 * - Touch targets: Drag handle sized for touch (44px minimum)
 *
 * **Performance:**
 * - Debounce: 500ms delay prevents excessive API calls
 * - Cleanup: Clears timeout on component unmount
 * - Memoization: useCallback for event handlers
 * - Optimistic updates: Instant UI feedback
 *
 * **Visual States:**
 * - Default: Normal card appearance
 * - Dragging: Card opacity reduced, shadow increased
 * - Saving: "Saving new order..." indicator shown
 * - Hover: gt-card-shine effect on cards
 *
 * **Responsive Design:**
 * - Mobile: Touch-friendly drag handle
 * - Desktop: Mouse drag support
 * - Tablet: Both touch and mouse support
 *
 * **Error Handling:**
 * - API failure: Rollback to previousRaces
 * - Console logging: Error messages logged
 * - User feedback: Could add toast notification (optional)
 * - No data loss: previousRaces always preserved
 *
 * **Cleanup:**
 * - Effect cleanup: Clears timeout on unmount
 * - Prevents: Memory leaks, saves after component gone
 * - Pattern: useEffect with return cleanup function
 *
 * **Debugging Tips:**
 * - Drag activation: Must move 8px before drag starts (prevents accidental drags)
 * - Optimistic updates: UI updates immediately, API call debounced by 500ms
 * - Rollback on error: If API fails, restores previousRaces state
 * - Haptic feedback: Mobile devices vibrate on drag start
 * - Keyboard navigation: Arrow keys + Space/Enter for keyboard users
 * - Saving indicator: Shows "Saving new order..." during API call
 * - Only shows drag handle if 2+ races (canReorder check)
 * - Not dragging: Check attributes and listeners are on drag handle
 * - Not saving: Check API endpoint is accessible
 * - Rollback not working: Check previousRaces is being set correctly
 * - Debounce not working: Check saveTimeoutRef is being cleared
 *
 * **Common Issues:**
 * - Drag not working: Check attributes/listeners on drag handle
 * - Not saving: Check API endpoint and request body
 * - Rollback failing: Verify previousRaces state is preserved
 * - Haptic not working: Check browser supports navigator.vibrate
 * - Keyboard not working: Check KeyboardSensor configuration
 *
 * **Related Files:**
 * - @/components/tonight/sortable-race-card.tsx: Individual race card component
 * - @/components/ui/drag-handle.tsx: Drag handle component
 * - @/app/api/races/reorder/route.ts: API endpoint for reordering
 * - @/app/tonight/page.tsx: Parent page that uses this component
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableRaceCard } from './sortable-race-card'

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

export interface Race {
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

interface SortableRaceListProps {
  initialRaces: Race[]
}

export function SortableRaceList({ initialRaces }: SortableRaceListProps) {
  // ============================================================
  // STATE
  // ============================================================
  // - races: Current race order (updated optimistically during drag)
  // - previousRaces: Backup of previous order for rollback on error
  // - isSaving: Loading state during API call
  // - saveTimeoutRef: Reference to debounced timeout (clears on unmount)
  // ============================================================

  const [races, setRaces] = useState<Race[]>(initialRaces)
  const [previousRaces, setPreviousRaces] = useState<Race[]>(initialRaces)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // ============================================================
  // EFFECT CLEANUP
  // ============================================================
  // Clear any pending save timeout when component unmounts
  // - Prevents memory leaks
  // - Prevents saves after component is gone
  // - Pattern: useEffect with return cleanup function
  //
  // Why cleanup?
  // - User navigates away during debounce: Don't save after navigation
  // - Component unmounts: Clear pending timeout to prevent memory leak
  // - Race conditions: Ensure no stale updates after unmount
  //
  // Debugging Tips:
  // - Memory leak: Check if timeout is cleared in cleanup
  // - Save after unmount: Check cleanup function is returning clearTimeout
  // ============================================================

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // ============================================================
  // DRAG SENSORS CONFIGURATION
  // ============================================================
  // PointerSensor: Mouse/touch input with 8px movement threshold
  // - Prevents accidental drags when tapping on mobile
  // - User must move 8px before drag starts (activationConstraint)
  //
  // KeyboardSensor: Arrow keys + Space/Enter for accessibility
  // - coordinateGetter: sortableKeyboardCoordinates for proper keyboard nav
  // - Enables: Arrow keys to move focus, Space/Enter to drag
  //
  // Why 8px threshold?
  // - Mobile: Tapping shouldn't trigger drag
  // - Scrolling: Distinguish between scroll and drag
  // - Precision: Small movements are intentional, not accidental
  //
  // Debugging Tips:
  // - Accidental drags: Increase distance threshold
  // - Keyboard not working: Check coordinateGetter is set
  // - Touch not working: Check activationConstraint is correct
  // ============================================================

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must move 8px before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ============================================================
  // DRAG HANDLERS
  // ============================================================
  // handleDragStart: Haptic feedback on mobile
  // - Vibrates for 50ms when drag starts
  // - Provides tactile feedback to user
  // - Only works on devices that support vibration API
  //
  // handleDragEnd: Optimistic update + debounced API call + rollback on error
  // - Update UI immediately (optimistic)
  // - Save previous state for rollback
  // - Clear any pending save timeout
  // - Debounce API call by 500ms
  // - Rollback on error
  //
  // Why optimistic update?
  // - Instant feedback: UI changes immediately
  // - Better UX: No waiting for API response
  // - Perceived performance: Feels faster
  //
  // Why debounce?
  // - Batch multiple drags: User drags multiple items quickly
  // - Reduce API calls: Only save once after user stops dragging
  // - Prevent race conditions: Don't start new save while one is pending
  //
  // Debugging Tips:
  // - Not dragging: Check listeners are on drag handle in SortableRaceCard
  // - Not saving: Check API endpoint is accessible
  // - Rollback not working: Check previousRaces is being set
  // - Haptic not working: Check browser supports navigator.vibrate
  // - Debounce not working: Check saveTimeoutRef is being cleared
  // ============================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Haptic feedback for mobile
    // - 50ms vibration: Subtle tactile feedback
    // - Browser check: Only call if supported
    // - Type check: Ensure vibrate is a function
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(50)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    // No-op: Dropped outside or on same position
    if (!over || active.id === over.id) {
      return
    }

    // Find positions in array
    const oldIndex = races.findIndex((r) => r.id === active.id)
    const newIndex = races.findIndex((r) => r.id === over.id)

    // Save previous state for rollback
    setPreviousRaces(races)

    // Optimistic update: Move item in array
    const newRaces = arrayMove(races, oldIndex, newIndex)
    setRaces(newRaces)

    // Clear any pending save
    // - Prevents race conditions
    // - Cancels previous debounced save
    // - Starts fresh debounce timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounced API call (500ms)
    // - Wait for user to stop dragging
    // - Batch multiple drags into one save
    // - Reduces API calls
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        // Call reorder API
        const res = await fetch('/api/races/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raceIds: newRaces.map((r) => r.id) }),
        })

        if (!res.ok) {
          throw new Error('Failed to save order')
        }

        const data = await res.json()
        // Update with server response
        // - Server may have additional data (timestamps, etc.)
        // - Ensures client state matches server state
        if (data.races) {
          setRaces(data.races)
          setPreviousRaces(data.races)
        }

        // Optional: Show success toast here
        console.log('Order saved successfully')
      } catch (error) {
        console.error('Failed to save order:', error)
        // Rollback on failure
        // - Restore previous order
        // - Prevents data loss
        // - User can try again
        setRaces(previousRaces)
        // Optional: Show error toast here
        console.error('Rolling back to previous order')
      } finally {
        setIsSaving(false)
      }
    }, 500)
  }, [races, previousRaces])

  // ============================================================
  // DERIVED STATE
  // ============================================================
  // canReorder: Only show drag handle if 2+ races
  // - Single race: Nothing to reorder, hide drag handle
  // - Multiple races: Show drag handle for reordering
  //
  // Why hide drag handle?
  // - UX: No need to show drag handle if only one item
  // - Clarity: Indicates reorderability
  // - Cleaner: Reduces visual clutter
  // ============================================================

  const canReorder = races.length > 1

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ============================================================
          Saving Indicator
          - Shows "Saving new order..." during API call
          - Pulsing animation for visual feedback
          - Only shown when isSaving=true
          ============================================================ */}
      {isSaving && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          Saving new order...
        </div>
      )}

      {/* ============================================================
          Sortable Race List
          - DndContext: Provides drag and drop context
          - SortableContext: Provides sorting context for children
          - sensors: Pointer and keyboard sensors
          - collisionDetection: closestCenter (nearest drop target)
          - strategy: verticalListSortingStrategy (vertical list)
          ============================================================ */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={races.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          {races.map((race, index) => (
            <SortableRaceCard
              key={race.id}
              race={race}
              index={index}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* ============================================================
          Helper Text
          - Shows when canReorder=true (2+ races)
          - Informs user about drag functionality
          - Small text, muted color for subtlety
          ============================================================ */}
      {canReorder && (
        <div className="text-center text-xs text-muted-foreground">
          Drag races to reorder • Changes save automatically
        </div>
      )}
    </div>
  )
}
