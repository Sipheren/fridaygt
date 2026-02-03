/**
 * StickyNoteCard Component
 *
 * Realistic sticky note effect with:
 * - Dramatic rotation (-6° to +6°)
 * - Strong directional shadows
 * - Scale on hover effect
 * - Paper curl effect on bottom edges
 * - Vibrant Post-it style colors
 *
 * Drop-in compatible with NoteCard - identical props interface.
 *
 * Mobile: Tap to edit
 * Desktop: Click to edit
 */

"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
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

interface StickyNoteCardProps {
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

// Vibrant Post-it style colors (not muted)
const STICKY_NOTE_COLORS = {
  '#fef08a': 'bg-yellow-200 dark:bg-yellow-600/30',      // #ffc - bright yellow
  '#fbcfe8': 'bg-pink-200 dark:bg-pink-600/30',         // Bright pink
  '#bfdbfe': 'bg-blue-200 dark:bg-blue-600/30',         // #ccf - bright blue
  '#bbf7d0': 'bg-green-200 dark:bg-green-600/30',       // #cfc - bright green
  '#e9d5ff': 'bg-purple-200 dark:bg-purple-600/30',     // Bright purple
  '#fed7aa': 'bg-orange-200 dark:bg-orange-600/30',     // Bright orange
}

export function StickyNoteCard({
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
}: StickyNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const [editContent, setEditContent] = useState(note.content)
  const [isPressed, setIsPressed] = useState(false)
  const [currentColor, setCurrentColor] = useState(note.color)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const colorPickerButtonRef = useRef<HTMLButtonElement>(null)

  // Deterministic rotation based on note ID (-6° to +6°) - MORE DRAMATIC
  const rotation = useMemo(() => {
    const hash = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const degrees = (hash % 121) - 60  // -60 to +60 range
    return `rotate(${degrees / 10}deg)`  // Convert to -6° to +6°
  }, [note.id])

  const colorClass = STICKY_NOTE_COLORS[currentColor as keyof typeof STICKY_NOTE_COLORS] || STICKY_NOTE_COLORS['#fef08a']
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

  // Calculate transform based on hover/selected state
  const getTransform = () => {
    const baseTransform = rotation
    if (isHovered || isSelected) {
      // Scale up on hover/selected - 1.1x
      return `${baseTransform} scale(1.1)`
    }
    return baseTransform
  }

  return (
    <>
    <div
      ref={cardRef}
      style={{
        transform: getTransform(),
        transition: 'transform 0.15s linear',
        zIndex: (isHovered || isSelected) ? 5 : 'auto'
      }}
      className={cn(
        // Base styles
        'sticky-note-texture relative group min-h-[180px] p-5 rounded-md transition-all duration-200 origin-top-left',
        // Strong directional shadow (like real Post-its)
        'shadow-[5px_5px_7px_rgba(33,33,33,0.7)]',
        // Hover effect - stronger shadow + lifted
        'hover:shadow-[10px_10px_7px_rgba(0,0,0,0.7)]',
        // Active/pressed effect
        'active:shadow-[3px_3px_5px_rgba(33,33,33,0.5)]',
        // Selected/editing state - elevated with ring
        isSelected && 'shadow-[15px_15px_10px_rgba(0,0,0,0.8)] ring-2 ring-primary/50',
        // Border - subtle
        'border border-foreground/10',
        // Smooth color transition
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Paper curl effect - bottom left */}
      <div className="absolute bottom-0 left-0 w-[40%] h-[10px] pointer-events-none -z-10">
        <div
          className="w-full h-full"
          style={{
            transform: 'skew(-5deg) rotate(-5deg)',
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.3)',
            background: 'transparent',
          }}
        />
      </div>

      {/* Paper curl effect - bottom right */}
      <div className="absolute bottom-0 right-0 w-[40%] h-[10px] pointer-events-none -z-10">
        <div
          className="w-full h-full"
          style={{
            transform: 'skew(5deg) rotate(5deg)',
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.3)',
            background: 'transparent',
          }}
        />
      </div>

      {/* Pin at top-center */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
        {/* Pin head */}
        <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
        {/* Pin needle */}
        <div className="w-0.5 h-2 bg-gray-400 mx-auto rounded-b-full" />
      </div>

      {/* Pinned indicator (for notes.pinned = true) */}
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
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-md shadow-lg border border-foreground/10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-foreground/70">Creating...</span>
          </div>
        </div>
      )}
      {isSaving && (
        <div className="absolute inset-0 pointer-events-none rounded-md animate-saving-pulse" />
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
