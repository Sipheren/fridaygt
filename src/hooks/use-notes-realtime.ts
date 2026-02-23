/**
 * useNotesRealtime Hook
 *
 * Real-time hook for subscribing to Note table changes via Supabase Realtime.
 * Automatically fetches initial notes and subscribes to INSERT/UPDATE/DELETE events.
 *
 * Usage:
 *   const { notes, loading } = useNotesRealtime()
 *
 * Features:
 * - Initial fetch on mount
 * - Real-time updates (INSERT, UPDATE, DELETE)
 * - Automatic cleanup on unmount
 * - Loading state
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DbNoteWithUser } from '@/types/database'

export function useNotesRealtime() {
  const [notes, setNotes] = useState<DbNoteWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const isMounted = useRef(true)

  // Refetch via API (includes vote enrichment)
  const refetch = useCallback(async () => {
    if (!isMounted.current) return

    try {
      const response = await fetch('/api/notes')
      if (!response.ok) return
      const data = await response.json()
      if (isMounted.current && data.notes) {
        setNotes(data.notes as DbNoteWithUser[])
      }
    } catch {
      // Silently ignore refetch errors
    }
  }, [])

  useEffect(() => {
    isMounted.current = true

    // Initial fetch via API (includes vote counts + userVote)
    const fetchNotes = async () => {
      try {
        const response = await fetch('/api/notes')
        if (response.ok) {
          const data = await response.json()
          if (isMounted.current && data.notes) {
            setNotes(data.notes as DbNoteWithUser[])
          }
        }
      } catch {
        // Silently ignore fetch errors
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }

    fetchNotes()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Note' },
        (payload) => {
          if (isMounted.current) {
            const newNote = { ...(payload.new as DbNoteWithUser), thumbsUp: 0, thumbsDown: 0, userVote: null }
            setNotes((prev) => [newNote, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Note' },
        (payload) => {
          if (isMounted.current) {
            setNotes((prev) =>
              prev.map((note) =>
                note.id === payload.new.id
                  ? {
                      // Merge realtime data with existing vote fields (not stored in Note table)
                      ...(payload.new as DbNoteWithUser),
                      user: note.user,
                      thumbsUp: note.thumbsUp,
                      thumbsDown: note.thumbsDown,
                      userVote: note.userVote,
                    }
                  : note
              )
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'Note' },
        (payload) => {
          if (isMounted.current) {
            setNotes((prev) => prev.filter((note) => note.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      isMounted.current = false
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Optimistic update function
  const updateNoteOptimistically = useCallback((noteId: string, updates: Partial<DbNoteWithUser>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, ...updates } : note
      )
    )
  }, [])

  // Optimistic delete function
  const deleteNoteOptimistically = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
  }, [])

  // Remove note by ID (for cleanup)
  const removeNoteOptimistically = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
  }, [])

  // Optimistic create function
  const createNoteOptimistically = useCallback((note: DbNoteWithUser) => {
    setNotes((prev) => [note, ...prev])
  }, [])

  return { notes, loading, refetch, updateNoteOptimistically, deleteNoteOptimistically, createNoteOptimistically, removeNoteOptimistically }
}
