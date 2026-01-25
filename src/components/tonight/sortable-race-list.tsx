/**
 * Sortable Race List Component
 *
 * Draggable race list on the Tonight page with optimistic updates and rollback.
 * Uses @dnd-kit for drag-and-drop functionality.
 *
 * Debugging Tips:
 * - Drag activation: Must move 8px before drag starts (prevents accidental drags)
 * - Optimistic updates: UI updates immediately, API call debounced by 500ms
 * - Rollback on error: If API fails, restores previousRaces state
 * - Haptic feedback: Mobile devices vibrate on drag start
 * - Keyboard navigation: Arrow keys + Space/Enter for keyboard users
 * - Saving indicator: Shows "Saving new order..." during API call
 * - Only shows drag handle if 2+ races (canReorder check)
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
  const [races, setRaces] = useState<Race[]>(initialRaces)
  const [previousRaces, setPreviousRaces] = useState<Race[]>(initialRaces)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // ============================================================
  // EFFECT CLEANUP
  // ============================================================
  // Clear any pending save timeout when component unmounts
  // Prevents memory leaks and saves after component is gone
  // ============================================================

  // Cleanup timeout on component unmount
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
  // KeyboardSensor: Arrow keys + Space/Enter for accessibility
  // ============================================================

  // Configure sensors for drag and drop
  // Using long-press activation for touch to prevent accidental drags
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
  // handleDragStart: Haptic feedback on mobile (50ms vibration)
  // handleDragEnd: Optimistic update + debounced API call + rollback on error
  // ============================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(50)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = races.findIndex((r) => r.id === active.id)
    const newIndex = races.findIndex((r) => r.id === over.id)

    // Save previous state for rollback
    setPreviousRaces(races)

    // Optimistic update
    const newRaces = arrayMove(races, oldIndex, newIndex)
    setRaces(newRaces)

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounced API call (500ms)
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
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
        if (data.races) {
          setRaces(data.races)
          setPreviousRaces(data.races)
        }

        // Optional: Show success toast here
        console.log('Order saved successfully')
      } catch (error) {
        console.error('Failed to save order:', error)
        // Rollback on failure
        setRaces(previousRaces)
        // Optional: Show error toast here
        console.error('Rolling back to previous order')
      } finally {
        setIsSaving(false)
      }
    }, 500)
  }, [races, previousRaces])

  // Don't show drag handle if there's only one race (nothing to reorder)
  const canReorder = races.length > 1

  return (
    <div className="space-y-6">
      {/* Saving indicator */}
      {isSaving && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          Saving new order...
        </div>
      )}

      {/* Sortable race list */}
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

      {/* Helper text for drag functionality */}
      {canReorder && (
        <div className="text-center text-xs text-muted-foreground">
          Drag races to reorder • Changes save automatically
        </div>
      )}
    </div>
  )
}
