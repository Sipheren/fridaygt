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
import type { DbNote, DbNoteWithUser } from '@/types/database'

export function useNotesRealtime() {
  const [notes, setNotes] = useState<DbNoteWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const isMounted = useRef(true)

  // Refetch function
  const refetch = useCallback(async () => {
    if (!isMounted.current) return

    const { data, error } = await supabase
      .from('Note')
      .select(`
        *,
        user:User(id, name, gamertag)
      `)
      .order('pinned', { ascending: false })
      .order('createdAt', { ascending: false })

    if (!error && data) {
      setNotes(data as DbNoteWithUser[])
    }
  }, [supabase])

  useEffect(() => {
    isMounted.current = true

    // Initial fetch
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from('Note')
        .select(`
          *,
          user:User(id, name, gamertag)
        `)
        .order('pinned', { ascending: false })
        .order('createdAt', { ascending: false })

      if (!error && data && isMounted.current) {
        setNotes(data as DbNoteWithUser[])
      }
      setLoading(false)
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
            setNotes((prev) => [payload.new as DbNoteWithUser, ...prev])
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
                note.id === payload.new.id ? (payload.new as DbNoteWithUser) : note
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
  }, [])

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
