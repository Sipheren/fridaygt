/**
 * Add Member Dialog Component
 *
 * Dialog for adding a user to a race:
 * - User selection dropdown (eligible active users not in race)
 * - Add/Cancel buttons
 * - Loading and empty states
 * - Error handling
 *
 * Debugging Tips:
 * - Uses shadcn Dialog component (matches delete confirmation pattern)
 * - Displays gamertag with fallback (gamertag → name → email)
 * - 44px touch targets for accessibility
 * - Shows empty state when all users already in race
 */

'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export interface User {
  id: string
  name: string | null
  email: string
  role: string
  gamertag: string | null
}

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  onAddMember: (userId: string) => Promise<void>
  isLoading: boolean
}

export function AddMemberDialog({
  open,
  onOpenChange,
  users,
  onAddMember,
  isLoading,
}: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!selectedUserId) return

    setIsAdding(true)
    setError(null)

    try {
      await onAddMember(selectedUserId)
      setSelectedUserId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setIsAdding(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedUserId('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Race Member</DialogTitle>
          <DialogDescription>
            Select a user to add to this race
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            All active users are already in this race
          </div>
        ) : (
          <div className="space-y-4">
            <Label htmlFor="user">User</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger id="user" className="w-full min-h-[44px]">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="w-full">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.gamertag || user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedUserId || isAdding || isLoading || users.length === 0}
            className="min-h-[44px]"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Member'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
