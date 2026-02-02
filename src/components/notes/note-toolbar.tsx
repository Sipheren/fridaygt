/**
 * NoteToolbar Component
 *
 * Toolbar with "New Note" button and expandable color filter.
 * Color filter is a single "All" button that expands on hover/click.
 */

import { Button } from '@/components/ui/button'
import { Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

interface NoteToolbarProps {
  onNewNote?: () => void
  selectedColor?: string | null
  onColorFilter?: (color: string | null) => void
  noteCount?: number
}

const NOTE_COLORS = [
  { value: null, label: 'All', class: 'bg-muted border-border', indicator: 'bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200' },
  { value: '#fef08a', label: 'Yellow', class: 'bg-yellow-200 dark:bg-yellow-900/30', indicator: 'bg-yellow-200 dark:bg-yellow-900/30' },
  { value: '#fbcfe8', label: 'Pink', class: 'bg-pink-200 dark:bg-pink-900/30', indicator: 'bg-pink-200 dark:bg-pink-900/30' },
  { value: '#bfdbfe', label: 'Blue', class: 'bg-blue-200 dark:bg-blue-900/30', indicator: 'bg-blue-200 dark:bg-blue-900/30' },
  { value: '#bbf7d0', label: 'Green', class: 'bg-green-200 dark:bg-green-900/30', indicator: 'bg-green-200 dark:bg-green-900/30' },
  { value: '#e9d5ff', label: 'Purple', class: 'bg-purple-200 dark:bg-purple-900/30', indicator: 'bg-purple-200 dark:bg-purple-900/30' },
  { value: '#fed7aa', label: 'Orange', class: 'bg-orange-200 dark:bg-orange-900/30', indicator: 'bg-orange-200 dark:bg-orange-900/30' },
]

export function NoteToolbar({
  onNewNote,
  selectedColor = null,
  onColorFilter,
  noteCount = 0,
}: NoteToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Find current filter label
  const currentFilter = NOTE_COLORS.find(c => c.value === selectedColor) || NOTE_COLORS[0]

  // Handle mouse enter with delay for desktop
  const handleMouseEnter = () => {
    if (window.innerWidth >= 768) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsFilterOpen(true)
    }
  }

  // Handle mouse leave with delay for desktop
  const handleMouseLeave = () => {
    if (window.innerWidth >= 768) {
      // Add a small delay so the user can move to the popup
      timeoutRef.current = setTimeout(() => {
        setIsFilterOpen(false)
      }, 150)
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Left: Note count + Color filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
        {/* Note count */}
        <div className="text-sm text-muted-foreground min-w-[80px]">
          {noteCount === 1 ? '1 note' : `${noteCount} notes`}
        </div>

        {/* Expandable Color Filter */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Main Filter Button */}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsFilterOpen(!isFilterOpen)
              }
            }}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border-2 border-border bg-background text-sm font-medium transition-all hover:border-primary hover:shadow-md min-h-[44px]"
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full border border-foreground/10',
                currentFilter.indicator
              )}
            />
            <span>{currentFilter.label}</span>
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isFilterOpen && 'rotate-90'
              )}
            />
          </button>

          {/* Expanded Color Options */}
          {isFilterOpen && (
            <div
              className="absolute left-0 top-full mt-2 z-50 flex gap-2 p-3 rounded-lg border-2 border-border bg-background shadow-xl animate-in fade-in slide-in-from-top-1 duration-200"
              onMouseEnter={() => {
                if (window.innerWidth >= 768 && timeoutRef.current) {
                  clearTimeout(timeoutRef.current)
                }
              }}
              onMouseLeave={handleMouseLeave}
            >
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value || 'all'}
                  type="button"
                  onClick={() => {
                    onColorFilter?.(color.value)
                    if (window.innerWidth < 768) {
                      setIsFilterOpen(false)
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-[60px]',
                    'hover:bg-accent hover:scale-105',
                    selectedColor === color.value
                      ? 'bg-accent ring-2 ring-primary'
                      : ''
                  )}
                  aria-label={`Filter by ${color.label} notes`}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full border-2 border-foreground/10 shadow-sm',
                      color.indicator
                    )}
                  />
                  <span className="text-xs font-medium whitespace-nowrap">
                    {color.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: New Note button */}
      {onNewNote && (
        <Button onClick={onNewNote} size="default" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      )}
    </div>
  )
}
