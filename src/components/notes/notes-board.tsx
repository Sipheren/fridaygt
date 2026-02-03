"use client"

/**
 * NotesBoard Component
 *
 * Responsive container for displaying notes.
 * Mobile: Vertical scrollable list (no drag)
 * Desktop: Grid layout with drag & drop
 */

import { NoteCard } from './note-card'
import { StickyNoteCard } from './sticky-note-card'
import { EmptyNotesState } from './empty-notes-state'
import { ColorPickerPopover } from './color-picker-popover'
import { Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState, useCallback, useEffect } from 'react'
import type { DbNoteWithUser } from '@/types/database'

interface NotesBoardProps {
  notes: DbNoteWithUser[]
  loading?: boolean
  onDeleteNote?: (noteId: string) => void
  onUpdateNote?: (noteId: string, data: { title?: string; content?: string; color?: string }) => void
  selectedColorFilter?: string | null
  newNoteId?: string | null
  pendingNoteId?: string | null
  useStickyStyle?: boolean
}

export function NotesBoard({
  notes,
  loading = false,
  onDeleteNote,
  onUpdateNote,
  selectedColorFilter = null,
  newNoteId,
  pendingNoteId,
  useStickyStyle = true,
}: NotesBoardProps) {
  const { data: session } = useSession()
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [colorPickerNoteId, setColorPickerNoteId] = useState<string | null>(null)
  const [colorPickerButton, setColorPickerButton] = useState<HTMLButtonElement | null>(null)

  // Filter notes by selected color
  const filteredNotes = selectedColorFilter
    ? notes.filter((note) => note.color === selectedColorFilter)
    : notes

  // Check if user is admin
  const isAdmin = session?.user?.role === 'ADMIN'

  // Auto-select newly created note for editing
  useEffect(() => {
    if (newNoteId) {
      setSelectedNoteId(newNoteId)
    }
  }, [newNoteId])

  // Handle note selection
  const handleSelectNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId)
  }, [])

  // Handle note deselection (click away)
  const handleDeselectNote = useCallback(() => {
    setSelectedNoteId(null)
  }, [])

  // Handle update (inline edit)
  const handleUpdateNote = useCallback(async (noteId: string, data: { title?: string; content?: string; color?: string }) => {
    if (onUpdateNote) {
      await onUpdateNote(noteId, data)
    }
  }, [onUpdateNote])

  // Handle delete
  const handleDelete = async (noteId: string) => {
    if (onDeleteNote) {
      await onDeleteNote(noteId)
    }
  }

  // Handle color picker button click
  const handleColorPick = useCallback((noteId: string, button: HTMLButtonElement) => {
    setColorPickerNoteId(noteId)
    setColorPickerButton(button)
    setIsColorPickerOpen(true)
  }, [])

  // Handle color picker close
  const handleColorPickerClose = useCallback(() => {
    setIsColorPickerOpen(false)
    // Reset state after a short delay to prevent flicker
    setTimeout(() => {
      setColorPickerNoteId(null)
      setColorPickerButton(null)
    }, 100)
  }, [])

  // Handle color selection
  const handleColorSelect = useCallback(async (color: string) => {
    if (colorPickerNoteId && onUpdateNote) {
      await onUpdateNote(colorPickerNoteId, { color })
    }
  }, [colorPickerNoteId, onUpdateNote])

  // Create a ref-like object from the button element
  const colorPickerButtonRef = useCallback(() => ({ current: colorPickerButton }), [colorPickerButton])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Empty state
  if (filteredNotes.length === 0) {
    return <EmptyNotesState />
  }

  // Mobile: Vertical list (< 768px)
  // Desktop: Grid layout (≥ 768px)
  return (
    <div className="space-y-4">
      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" onClick={handleDeselectNote}>
        {filteredNotes.map((note) => (
          <div key={note.id} onClick={(e) => e.stopPropagation()}>
            {useStickyStyle !== false ? (
              <StickyNoteCard
                note={note}
                currentUserId={session?.user?.id}
                isAdmin={isAdmin}
                isSelected={selectedNoteId === note.id}
                onSelect={handleSelectNote}
                onDeselect={handleDeselectNote}
                onUpdate={handleUpdateNote}
                onDelete={handleDelete}
                onColorPick={handleColorPick}
                isPending={note.id === pendingNoteId}
              />
            ) : (
              <NoteCard
                note={note}
                currentUserId={session?.user?.id}
                isAdmin={isAdmin}
                isSelected={selectedNoteId === note.id}
                onSelect={handleSelectNote}
                onDeselect={handleDeselectNote}
                onUpdate={handleUpdateNote}
                onDelete={handleDelete}
                onColorPick={handleColorPick}
                isPending={note.id === pendingNoteId}
              />
            )}
          </div>
        ))}
      </div>

      {/* Color Picker Popover */}
      {colorPickerButton && (
        <ColorPickerPopover
          isOpen={isColorPickerOpen}
          onClose={handleColorPickerClose}
          onColorSelect={handleColorSelect}
          triggerRef={colorPickerButtonRef}
        />
      )}
    </div>
  )
}
