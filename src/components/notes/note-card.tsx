/**
 * NoteCard Component
 *
 * Displays an individual sticky note with inline editing.
 * Click to edit title and content in place, click away to auto-save.
 * Color picker icon button (palette) to change note color.
 * Delete with shadcn Dialog confirmation (design system compliant).
 *
 * Mobile: Tap to edit
 * Desktop: Click to edit
 */

import { useState, useRef, useEffect } from 'react'
import { Trash2, Pin, Palette, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DbNote } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NoteCardProps {
  note: DbNote & {
    user?: {
      id: string
      name?: string | null
      gamertag?: string | null
    } | null
  }
  currentUserId?: string
  isAdmin?: boolean
  isSelected?: boolean
  onSelect?: (noteId: string) => void
  onDeselect?: () => void
  onDelete?: (noteId: string) => void
  onUpdate?: (noteId: string, data: { title?: string; content?: string; color?: string }) => void
  onColorPick?: (noteId: string, button: HTMLButtonElement) => void
  isPending?: boolean
}

const NOTE_COLORS = {
  '#fef08a': 'bg-yellow-200 dark:bg-yellow-900/30 border-yellow-300/50 dark:border-yellow-700/50',
  '#fbcfe8': 'bg-pink-200 dark:bg-pink-900/30 border-pink-300/50 dark:border-pink-700/50',
  '#bfdbfe': 'bg-blue-200 dark:bg-blue-900/30 border-blue-300/50 dark:border-blue-700/50',
  '#bbf7d0': 'bg-green-200 dark:bg-green-900/30 border-green-300/50 dark:border-green-700/50',
  '#e9d5ff': 'bg-purple-200 dark:bg-purple-900/30 border-purple-300/50 dark:border-purple-700/50',
  '#fed7aa': 'bg-orange-200 dark:bg-orange-900/30 border-orange-300/50 dark:border-orange-700/50',
}

export function NoteCard({
  note,
  currentUserId,
  isAdmin = false,
  isSelected = false,
  onSelect,
  onDeselect,
  onDelete,
  onUpdate,
  onColorPick,
  isPending = false,
}: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const [editContent, setEditContent] = useState(note.content)
  const [isPressed, setIsPressed] = useState(false)
  const [currentColor, setCurrentColor] = useState(note.color)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const colorPickerButtonRef = useRef<HTMLButtonElement>(null)

  const colorClass = NOTE_COLORS[currentColor as keyof typeof NOTE_COLORS] || NOTE_COLORS['#fef08a']
  const canEdit = !isPending && !isSaving && currentUserId && (note.createdBy === currentUserId || isAdmin)

  // Update color when note prop changes (from real-time updates)
  useEffect(() => {
    setCurrentColor(note.color)
  }, [note.color])

  // Auto-enter edit mode for newly created empty notes when selected
  useEffect(() => {
    if (isSelected && !note.title && !note.content && canEdit) {
      setIsEditing(true)
      onSelect?.(note.id)
    }
  }, [isSelected, note.title, note.content, canEdit, onSelect, note.id])

  // Auto-save on blur (click away)
  const handleBlur = (e: React.FocusEvent) => {
    // Check if the new focused element is still within this card
    if (cardRef.current?.contains(e.relatedTarget as Node)) {
      return
    }

    // Save changes if any
    if (isEditing) {
      saveChanges()
    }
  }

  // Save changes to server
  const saveChanges = async () => {
    if (!onUpdate) return

    const hasChanges =
      editTitle !== note.title ||
      editContent !== note.content

    if (hasChanges) {
      setIsSaving(true)
      try {
        await onUpdate(note.id, {
          title: editTitle?.trim() || '',
          content: editContent?.trim() || '',
        })
      } finally {
        setIsSaving(false)
      }
    }

    setIsEditing(false)
    onDeselect?.()
  }

  // Handle click to enter edit mode
  const handleClick = () => {
    if (!canEdit) return

    setIsEditing(true)
    setEditTitle(note.title)
    setEditContent(note.content)
    onSelect?.(note.id)
  }

  // Handle escape key to cancel editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditTitle(note.title)
      setEditContent(note.content)
      setIsEditing(false)
      onDeselect?.()
    }
  }

  // Open delete confirmation dialog
  const handleDelete = () => {
    setDeleteDialogOpen(true)
  }

  // Confirm delete and call parent's onDelete handler
  const confirmDelete = () => {
    if (onDelete) {
      onDelete(note.id)
    }
    setDeleteDialogOpen(false)
  }

  // Cancel delete and close dialog
  const cancelDelete = () => {
    setDeleteDialogOpen(false)
  }

  // Handle color picker button
  const handleColorPick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (onColorPick && e.currentTarget) {
      onColorPick(note.id, e.currentTarget)
    }
  }

  const displayName = note.user?.gamertag || note.user?.name || 'Unknown'

  return (
    <>
    <div
      ref={cardRef}
      className={cn(
        // Base styles
        'relative group min-h-[180px] p-5 rounded-xl transition-all duration-200',
        // Apple Notes shadow effect
        'shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)]',
        // Hover effect - note lifts
        'hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.08)]',
        'hover:-translate-y-1',
        // Active/pressed effect - note presses down
        'active:translate-y-0.5 active:shadow-[0_1px_4px_rgba(0,0,0,0.1)]',
        // Selected/editing state - elevated
        isSelected && 'shadow-[0_12px_32px_rgba(0,0,0,0.15),0_6px_12px_rgba(0,0,0,0.1)] -translate-y-1.5 ring-2 ring-primary/50',
        // Border
        'border border-transparent',
        // Smooth color transition - 2 seconds
        'transition-colors duration-[2000ms] ease-in-out',
        colorClass,
        // Cursor
        canEdit && 'cursor-pointer'
      )}
      onClick={canEdit && !isEditing ? handleClick : undefined}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={canEdit ? 0 : undefined}
      onTouchStart={() => canEdit && setIsPressed(true)}
      onTouchEnd={() => canEdit && setIsPressed(false)}
      style={{
        transform: isPressed ? 'scale(0.98)' : undefined,
      }}
    >
      {/* Pinned indicator */}
      {note.pinned && (
        <div className="absolute top-3 right-3">
          <Pin className="h-4 w-4 text-foreground/50" fill="currentColor" />
        </div>
      )}

      {/* Title */}
      {isEditing && canEdit ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Title..."
          className="w-full text-base font-semibold mb-2 bg-transparent border-b border-primary/30 focus:border-primary outline-none placeholder:text-foreground/40"
          autoFocus
        />
      ) : note.title ? (
        <h3 className="text-base font-semibold mb-2 leading-tight">
          {note.title}
        </h3>
      ) : null}

      {/* Content */}
      {isEditing && canEdit ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Start typing..."
          className="w-full text-sm bg-transparent border-b border-primary/30 focus:border-primary outline-none placeholder:text-foreground/40 resize-none min-h-[100px]"
          rows={5}
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words mb-3 text-foreground/90 leading-relaxed">
          {note.content || <span className="text-foreground/40 italic">Empty note</span>}
        </p>
      )}

      {/* Footer: Creator + Actions */}
      {!isEditing && (
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-foreground/10">
          <span className="text-xs text-foreground/60 font-medium">
            {displayName}
          </span>

          {/* Action buttons (owner/admin only) */}
          {canEdit && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Color picker button */}
              {onColorPick && (
                <Button
                  ref={colorPickerButtonRef}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={handleColorPick}
                  aria-label="Change color"
                >
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* Delete button */}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && !isEditing && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {note.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2.5 py-1 text-xs rounded-full bg-foreground/10 text-foreground/70 font-medium"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="px-2.5 py-1 text-xs rounded-full bg-foreground/10 text-foreground/70 font-medium">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Editing/Pending/Saving hint */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg shadow-lg border border-foreground/10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-foreground/70">Creating...</span>
          </div>
        </div>
      )}
      {isSaving && (
        <div className="absolute inset-0 pointer-events-none rounded-xl animate-saving-pulse" />
      )}
      {isEditing && !isPending && !isSaving && (
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-xs text-foreground/40">Press Escape to cancel • Click away to save</span>
        </div>
      )}
    </div>

    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Note</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this note? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={cancelDelete}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
