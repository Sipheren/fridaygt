/**
 * Add Member Button Component
 *
 * Button for adding users to a race:
 * - Opens dialog with eligible users dropdown
 * - Fetches active users and filters out current members
 * - Calls API to add selected user to race
 * - Only visible to admins
 *
 * Debugging Tips:
 * - Fetches active users (USER + ADMIN roles) from /api/users?active=true
 * - Filters out users already in race by currentMemberIds
 * - Calls POST /api/races/[id]/members to add member
 * - Default tyre: Racing: Soft (handled by API)
 * - Shows error if add fails (duplicate, network error, etc.)
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddMemberDialog, type User } from './add-member-dialog'

interface AddMemberButtonProps {
  raceId: string
  currentMemberIds: string[]
  onMemberAdded: () => void
}

export function AddMemberButton({
  raceId,
  currentMemberIds,
  onMemberAdded,
}: AddMemberButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch eligible users on mount and when currentMemberIds changes
  useEffect(() => {
    if (dialogOpen) {
      fetchEligibleUsers()
    }
  }, [dialogOpen, currentMemberIds])

  const fetchEligibleUsers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch active users (USER + ADMIN roles)
      const res = await fetch('/api/users?active=true')

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await res.json()
      const users: User[] = data.users || []

      // Filter out users already in this race
      const eligible = users.filter((user: User) => !currentMemberIds.includes(user.id))

      setEligibleUsers(eligible)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
      setEligibleUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    setIsAdding(true)
    try {
      // Call POST /api/races/[id]/members
      const res = await fetch(`/api/races/${raceId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to add member')
      }

      // Success: close dialog and refresh member list
      setDialogOpen(false)
      onMemberAdded()
    } catch (err) {
      throw err // Re-throw to let dialog display error
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        disabled={isAdding}
        className="min-h-[44px] transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
      >
        {isAdding ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Adding...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </>
        )}
      </Button>

      {error && (
        <div className="text-sm text-destructive mt-2">
          {error}
        </div>
      )}

      <AddMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        users={eligibleUsers}
        onAddMember={handleAddMember}
        isLoading={isLoading}
      />
    </>
  )
}
