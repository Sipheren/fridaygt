/**
 * Race Member List Component
 *
 * Main list component with:
 * - Fetches members on mount
 * - DnD context setup (sensors, collision detection)
 * - Optimistic updates with debounced API calls (500ms)
 * - Rollback on error
 * - Haptic feedback on mobile
 * - Saving indicator
 * - Empty state
 *
 * Debugging Tips:
 * - Matches pattern from tonight/sortable-race-list.tsx
 * - Tyre options filtered from Parts table
 * - 8px drag activation threshold prevents accidental drags
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Users } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { RaceMemberCard, type Part, type RaceMember } from './race-member-card'
import { AddMemberButton } from './add-member-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RaceMemberListProps {
  raceId: string
  isAdmin: boolean
}

export function RaceMemberList({ raceId, isAdmin }: RaceMemberListProps) {
  const [members, setMembers] = useState<RaceMember[]>([])
  const [previousMembers, setPreviousMembers] = useState<RaceMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [tyreOptions, setTyreOptions] = useState<Part[]>([])
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)
  const [updatingTyreMemberId, setUpdatingTyreMemberId] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // ============================================================
  // DATA FETCHING
  // ============================================================

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)

        // Fetch members
        const membersRes = await fetch(`/api/races/${raceId}/members`)
        if (!membersRes.ok) throw new Error('Failed to fetch members')
        const membersData = await membersRes.json()
        setMembers(membersData.members || [])
        setPreviousMembers(membersData.members || [])

        // Fetch tyre options (tyres from Parts table)
        const partsRes = await fetch('/api/parts')
        if (!partsRes.ok) throw new Error('Failed to fetch parts')
        const partsData = await partsRes.json()

        // Filter to tyre options only
        const tyreNames = [
          'Comfort: Hard', 'Comfort: Medium', 'Comfort: Soft',
          'Sports: Hard', 'Sports: Medium', 'Sports: Soft',
          'Racing: Hard', 'Racing: Medium', 'Racing: Soft',
          'Dirt Tyre', 'Snow Tyres', 'Intermediate', 'Racing: Heavy Wet',
        ]

        const tyres = (partsData.parts || []).filter((part: Part) =>
          tyreNames.includes(part.name)
        )
        setTyreOptions(tyres)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [raceId])

  // ============================================================
  // EFFECT CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // ============================================================
  // DRAG SENSORS CONFIGURATION
  // ============================================================

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must move 8px before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ============================================================
  // DRAG HANDLERS
  // ============================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(50)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = members.findIndex((m) => m.id === active.id)
    const newIndex = members.findIndex((m) => m.id === over.id)

    // Save previous state for rollback
    setPreviousMembers(members)

    // Optimistic update
    const newMembers = arrayMove(members, oldIndex, newIndex)
    setMembers(newMembers)

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounced API call (500ms)
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/races/${raceId}/members/reorder`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ memberIds: newMembers.map((m) => m.id) }),
        })

        if (!res.ok) {
          throw new Error('Failed to save order')
        }

        const data = await res.json()
        // Update with server response
        if (data.members) {
          setMembers(data.members)
          setPreviousMembers(data.members)
        }

        console.log('Order saved successfully')
      } catch (error) {
        console.error('Failed to save order:', error)
        // Rollback on failure
        setMembers(previousMembers)
        console.error('Rolling back to previous order')
      } finally {
        setIsSaving(false)
      }
    }, 500)
  }, [members, previousMembers, raceId])

  // ============================================================
  // TYRE CHANGE HANDLER
  // ============================================================

  const handleTyreChange = async (memberId: string, partId: string) => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return

    const previousPartId = member.partid

    // Optimistic: Update UI immediately
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, partid: partId, part: { ...m.part, id: partId } }
          : m
      )
    )
    setUpdatingTyreMemberId(memberId)

    try {
      const res = await fetch(`/api/races/${raceId}/members/${memberId}/tyre`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partId }),
      })

      if (!res.ok) {
        // Rollback on error
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, partid: previousPartId } : m
          )
        )
        throw new Error('Failed to update tyre')
      }

      const updatedMember = await res.json()

      // Update with server response
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? updatedMember : m))
      )
    } catch (error) {
      console.error('Failed to update tyre:', error)
      // Rollback already handled above
    } finally {
      setUpdatingTyreMemberId(null)
    }
  }

  // ============================================================
  // DELETE HANDLER
  // ============================================================

  const handleDelete = async (memberId: string) => {
    setDeletingMemberId(memberId)

    try {
      const res = await fetch(`/api/races/${raceId}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete member')
      }

      // Refresh members from server to get updated timestamps
      await refreshMembers()
    } catch (error) {
      console.error('Failed to delete member:', error)
    } finally {
      setDeletingMemberId(null)
    }
  }

  // ============================================================
  // REFRESH MEMBERS
  // ============================================================

  const refreshMembers = async () => {
    try {
      const res = await fetch(`/api/races/${raceId}/members`)
      if (!res.ok) throw new Error('Failed to fetch members')
      const data = await res.json()
      setMembers(data.members || [])
      setPreviousMembers(data.members || [])
    } catch (error) {
      console.error('Failed to refresh members:', error)
    }
  }

  // ============================================================
  // DERIVE CURRENT MEMBER IDs
  // ============================================================

  const currentMemberIds = members.map((m) => m.userid)

  // ============================================================
  // DERIVE LAST UPDATED INFO
  // ============================================================

  // Find the most recent update across all members
  const lastUpdatedMember = members.length > 0
    ? members.reduce((latest, member) => {
      const latestDate = new Date(latest.updatedat)
      const memberDate = new Date(member.updatedat)
      return memberDate > latestDate ? member : latest
    })
    : null

  const lastUpdatedBy = lastUpdatedMember?.updatedByUser?.gamertag || null
  const lastUpdatedAt = lastUpdatedMember?.updatedat || null

  // Format date as "Jan 26, 2026, 3:45 PM" in user's local timezone
  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return null

    // Convert database timestamp to proper ISO 8601 UTC format
    // Database returns: "2026-01-26 01:12:45.918703" (space separator)
    // JavaScript needs: "2026-01-26T01:12:45.918703Z" (T separator + Z for UTC)
    const isoString = dateString.replace(' ', 'T') + 'Z'
    const date = new Date(isoString)

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  // ============================================================
  // RENDER
  // ============================================================

  const canReorder = members.length > 1

  if (isLoading) {
    return <LoadingSection text="Loading members..." />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Race Members
            </CardTitle>
            <CardDescription>Member list with tyre selection</CardDescription>
          </div>
          {isAdmin && (
            <AddMemberButton
              raceId={raceId}
              currentMemberIds={currentMemberIds}
              onMemberAdded={refreshMembers}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Last Updated info */}
        {lastUpdatedBy && lastUpdatedAt && (
          <div className="text-sm text-muted-foreground mb-4">
            Last Updated by {lastUpdatedBy} at {formatLastUpdated(lastUpdatedAt)}
          </div>
        )}

        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No members in this race yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Saving indicator */}
            {isSaving && (
              <div className="text-center text-sm text-muted-foreground animate-pulse">
                Saving new order...
              </div>
            )}

            {/* Sortable member list */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={members.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {members.map((member, index) => (
                  <RaceMemberCard
                    key={member.id}
                    member={member}
                    index={index}
                    isAdmin={isAdmin}
                    canReorder={canReorder}
                    tyreOptions={tyreOptions}
                    onTyreChange={handleTyreChange}
                    onDelete={handleDelete}
                    isDeleting={deletingMemberId === member.id}
                    isUpdatingTyre={updatingTyreMemberId === member.id}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Helper text for drag functionality */}
            {isAdmin && canReorder && (
              <div className="text-center text-sm text-muted-foreground">
                Drag members to reorder • Changes save automatically
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
