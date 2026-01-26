/**
 * Race Member Card Component
 *
 * Individual race member card with:
 * - Position badge
 * - Gamertag display
 * - Tyre selection dropdown (admin only)
 * - Delete button (admin only)
 * - Drag handle (admin only, 2+ members)
 *
 * Debugging Tips:
 * - Uses gt-hover-card for hover effect (global class)
 * - 44px touch targets for accessibility
 * - Optimistic updates handled by parent component
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DragHandle } from '@/components/ui/drag-handle'
import { cn } from '@/lib/utils'

export interface Part {
  id: string
  name: string
  category: {
    id: string
    name: string
  }
}

export interface User {
  id: string
  gamertag: string
}

export interface RaceMember {
  id: string
  raceid: string
  userid: string
  order: number
  partid: string
  user: User
  part: Part
}

interface RaceMemberCardProps {
  member: RaceMember
  index: number
  isAdmin: boolean
  canReorder: boolean
  tyreOptions: Part[]
  onTyreChange: (memberId: string, partId: string) => void
  onDelete: (memberId: string) => void
}

export function RaceMemberCard({
  member,
  index,
  isAdmin,
  canReorder,
  tyreOptions,
  onTyreChange,
  onDelete,
}: RaceMemberCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleTyreChange = (value: string) => {
    onTyreChange(member.id, value)
  }

  const handleDelete = () => {
    if (confirm(`Remove ${member.user.gamertag} from this race?`)) {
      onDelete(member.id)
    }
  }

  // Group tyres by category
  const tyresByCategory = tyreOptions.reduce((acc, tyre) => {
    const category = tyre.category.name
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(tyre)
    return acc
  }, {} as Record<string, Part[]>)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full h-auto p-4 border border-border rounded-lg flex items-center justify-between gap-4 gt-hover-card',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Position number */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 font-bold text-primary shrink-0">
        {index + 1}
      </div>

      {/* User info - gamertag only */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{member.user.gamertag}</p>
      </div>

      {/* Tyre selector (admin only) */}
      {isAdmin && (
        <Select value={member.partid} onValueChange={handleTyreChange}>
          <SelectTrigger size="sm" className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(tyresByCategory).map(([category, tyres]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  {category}
                </div>
                {tyres.map((tyre) => (
                  <SelectItem key={tyre.id} value={tyre.id}>
                    {tyre.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Delete button (admin only) */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="gt-hover-icon-btn"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Drag handle (admin only, 2+ members) */}
      {isAdmin && canReorder && (
        <DragHandle {...attributes} {...listeners} isDragging={isDragging} />
      )}
    </div>
  )
}
