/**
 * NOTES PAGE
 *
 * Purpose:
 * Collaborative sticky notes board for team members to share quick notes, links, and ideas in real-time.
 *
 * Key Features:
 * - Real-time updates via Supabase Realtime
 * - Create, edit, delete notes (owner/admin only)
 * - Color filtering (6 colors)
 * - Mobile: Vertical scrollable list
 * - Desktop: Grid layout with responsive columns
 * - Note count display
 *
 * Data Flow:
 * 1. useNotesRealtime hook fetches notes and subscribes to changes
 * 2. NotesBoard displays notes with filtering
 * 3. Click "New Note" → creates empty note immediately
 * 4. Click note to edit inline (auto-saves)
 * 5. Delete via confirmation dialog
 *
 * Security:
 * - Public read (all users can view)
 * - Authenticated create (must be logged in)
 * - Owner/admin update/delete
 * - RLS policies enforce permissions
 */

'use client'

import { useState, useEffect } from 'react'
import { StickyNote } from 'lucide-react'
import { NotesBoard } from '@/components/notes/notes-board'
import { NoteToolbar } from '@/components/notes/note-toolbar'
import { LoadingSection } from '@/components/ui/loading'
import { useNotesRealtime } from '@/hooks/use-notes-realtime'
import { useSession } from 'next-auth/react'
import type { DbNoteWithUser } from '@/types/database'

export default function NotesPage() {
  const { notes, loading, createNoteOptimistically, deleteNoteOptimistically, updateNoteOptimistically, removeNoteOptimistically } = useNotesRealtime()
  const { data: session } = useSession()
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [useStickyStyle, setUseStickyStyle] = useState(true)

  // Read sticky note style preference from localStorage on mount
  useEffect(() => {
    const storedStyle = localStorage.getItem('useStickyNoteStyle')
    setUseStickyStyle(storedStyle !== 'false') // Default to true
  }, [])
  const [newNoteId, setNewNoteId] = useState<string | null>(null)
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = session?.user?.role === 'ADMIN'
  const canCreate = session?.user?.id // Any authenticated user can create

  // Handle create new note - immediately create empty note
  const handleCreateNote = async () => {
    // Generate temporary ID for optimistic update
    const tempId = crypto.randomUUID()
    setPendingNoteId(tempId)

    // Optimistic create - show note immediately
    const tempNote: DbNoteWithUser = {
      id: tempId,
      title: '',
      content: '',
      color: '#fef08a', // yellow default
      positionX: 0,
      positionY: 0,
      width: 'medium',
      pinned: false,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session?.user?.id || '',
      user: {
        id: session?.user?.id || '',
        email: session?.user?.email || '',
        name: session?.user?.name || null,
        role: (session?.user?.role || 'USER') as 'PENDING' | 'USER' | 'ADMIN',
        gamertag: session?.user?.gamertag || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
    createNoteOptimistically(tempNote)

    // Create in database
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: '',
          color: '#fef08a',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create note')
      }

      const result = await response.json()

      // Remove temp note and add real note with user data
      removeNoteOptimistically(tempId)
      const realNote: DbNoteWithUser = {
        ...result,
        user: {
          id: session?.user?.id || '',
          name: session?.user?.name || null,
          gamertag: session?.user?.gamertag || null,
        },
      }
      createNoteOptimistically(realNote)

      // Clear pending state and select the real note for editing
      setPendingNoteId(null)
      setNewNoteId(result.id)
    } catch (error) {
      console.error('Failed to create note:', error)
      setPendingNoteId(null)
    }
  }

  // Handle delete note
  const handleDeleteNote = async (noteId: string) => {
    // Optimistic delete - remove from UI immediately
    deleteNoteOptimistically(noteId)

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete note')
      }
    } catch (error) {
      console.error('Delete failed, refetching notes:', error)
      // Real-time sync will eventually correct this
    }
  }

  // Handle inline update note
  const handleUpdateNote = async (noteId: string, data: { title?: string; content?: string; color?: string }) => {
    // Optimistic update - show changes immediately
    if (data.color) {
      updateNoteOptimistically(noteId, { color: data.color })
    }
    if (data.title !== undefined || data.content !== undefined) {
      updateNoteOptimistically(noteId, {
        title: data.title,
        content: data.content,
      })
    }

    // Save to database
    const response = await fetch(`/api/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update note')
    }

    return response.json()
  }

  // Initial loading
  if (loading) {
    return <LoadingSection />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <StickyNote className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Team Notes</h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm">
            Share ideas, links, and quick thoughts
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <NoteToolbar
        onNewNote={canCreate ? handleCreateNote : undefined}
        selectedColor={selectedColor}
        onColorFilter={setSelectedColor}
        noteCount={notes.length}
      />

      {/* Notes Board */}
      <NotesBoard
        notes={notes}
        loading={loading}
        onDeleteNote={handleDeleteNote}
        onUpdateNote={handleUpdateNote}
        selectedColorFilter={selectedColor}
        newNoteId={newNoteId}
        pendingNoteId={pendingNoteId}
        useStickyStyle={useStickyStyle}
      />
    </div>
  )
}
