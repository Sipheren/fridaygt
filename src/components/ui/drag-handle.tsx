'use client'

import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DragHandleProps {
  className?: string
  isDragging?: boolean
}

export function DragHandle({ className, isDragging = false }: DragHandleProps) {
  return (
    <div
      className={cn(
        // Base styles - 44px × 44px for WCAG minimum touch target
        'flex items-center justify-center',
        'w-11 h-11', // 44px = 11 * 4px
        'cursor-grab',
        'rounded-md',
        'transition-all duration-200',
        'text-muted-foreground hover:text-foreground',
        // Visual feedback on hover
        'hover:bg-muted/50',
        // Active/dragging state
        isDragging && [
          'cursor-grabbing',
          'bg-primary/10',
          'text-primary',
          'scale-110',
        ],
        className
      )}
      aria-label="Drag to reorder"
      role="button"
      tabIndex={0}
    >
      <GripVertical className="w-5 h-5" />
    </div>
  )
}
