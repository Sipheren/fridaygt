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

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  createdat: string
  updatedat: string
  updatedbyid: string | null
  user: User
  updatedByUser: User | null
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
  isDeleting: boolean
  isUpdatingTyre: boolean
}

export function RaceMemberCard({
  member,
  index,
  isAdmin,
  canReorder,
  tyreOptions,
  onTyreChange,
  onDelete,
  isDeleting,
  isUpdatingTyre,
}: RaceMemberCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    onDelete(member.id)
    setDeleteDialogOpen(false)
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
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
    <>
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full h-auto p-4 border border-border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 gt-hover-card transition-all duration-200',
        isDragging && 'opacity-50 shadow-lg',
        isDeleting && 'opacity-50 animate-pulse'
      )}
    >
      {/* Row 1: Position + Gamertag (full width on mobile) */}
      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto sm:flex-1 sm:min-w-0">
        {/* Position number */}
        <div className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-primary/10 font-bold text-primary shrink-0">
          {index + 1}
        </div>

        {/* User info - gamertag only */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{member.user.gamertag}</p>
        </div>
      </div>

      {/* Row 2: Controls (stacked on mobile, horizontal on desktop) */}
      {isAdmin && (
        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-shrink-0 gap-3 sm:gap-4">
          {/* Tyre selector */}
          <Select
            value={member.partid}
            onValueChange={handleTyreChange}
            disabled={isUpdatingTyre}
          >
            <SelectTrigger
              size="sm"
              className={cn(
                "w-full sm:w-fit transition-all duration-200",
                isUpdatingTyre && "opacity-50"
              )}
            >
              <SelectValue />
              {isUpdatingTyre && (
                <Loader2 className="h-3 w-3 ml-2 animate-spin" />
              )}
            </SelectTrigger>
            <SelectContent className="w-full">
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

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gt-hover-icon-btn"
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>

            {/* Drag handle (only when 2+ members) */}
            {canReorder && (
              <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onClick={(e) => e.stopPropagation()}
              >
                <DragHandle isDragging={isDragging} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Delete confirmation dialog */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Race Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {member.user.gamertag} from this race?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={cancelDelete}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
