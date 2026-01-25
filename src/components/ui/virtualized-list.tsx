"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComboBoxOption } from "./searchable-combobox"

export interface VirtualizedListItem {
  type: 'header' | 'item'
  data: string | ComboBoxOption
}

interface VirtualizedListProps {
  items: VirtualizedListItem[]
  onSelect: (value: string) => void
  selectedValue: string
  estimateSize?: number
  className?: string
}

/**
 * VirtualizedList - Mobile-first list rendering with @tanstack/react-virtual
 *
 * Optimized for touch scrolling on mobile devices. Renders only visible items
 * for smooth 60fps scrolling through large lists (500+ items).
 *
 * Keyboard navigation is NOT a priority - this is mobile-first.
 */
export function VirtualizedList({
  items,
  onSelect,
  selectedValue,
  estimateSize = 40,
  className,
}: VirtualizedListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5, // Render 5 extra items above/below viewport for smoother scrolling
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{
        height: '300px',
        width: '100%',
        WebkitOverflowScrolling: 'touch', // Smooth iOS scrolling
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index]
          if (!item) return null

          return (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.type === 'header' ? (
                <GroupHeader name={item.data as string} />
              ) : (
                <VirtualItem
                  option={item.data as ComboBoxOption}
                  selected={(item.data as ComboBoxOption).value === selectedValue}
                  onClick={() => onSelect((item.data as ComboBoxOption).value)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * GroupHeader - Displays group/section headers
 */
function GroupHeader({ name }: { name: string }) {
  return (
    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0 z-10">
      {name}
    </div>
  )
}

/**
 * VirtualItem - Displays individual list items with touch-optimized interaction
 */
function VirtualItem({
  option,
  selected,
  onClick,
}: {
  option: ComboBoxOption
  selected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-2 cursor-pointer",
        "hover:bg-accent hover:text-accent-foreground",
        "active:bg-accent/80", // Better touch feedback on mobile
        selected && "bg-accent text-accent-foreground",
        "transition-colors duration-150", // Smooth color transitions
        "min-h-[44px]", // Touch target size (44px minimum for mobile)
        "select-none" // Prevent text selection on touch
      )}
      role="option"
      aria-selected={selected}
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0",
          selected ? "opacity-100" : "opacity-0"
        )}
      />
      <span className="flex-1 truncate">{option.label}</span>
    </div>
  )
}
