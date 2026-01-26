/**
 * Add Member Button Component
 *
 * Purpose: Button for adding users to a race with dialog-based user selection
 * - Opens dialog with eligible users dropdown
 * - Fetches active users and filters out current members
 * - Calls API to add selected user to race
 * - Only visible to admins
 * - Shows loading and error states
 *
 * **Key Features:**
 * - Eligible users: Fetches active users (USER + ADMIN roles) not already in race
 * - User filtering: Filters out users already in race by currentMemberIds
 * - Dialog-based: Opens dialog for user selection
 * - Loading states: Shows spinner while fetching users and adding member
 * - Error handling: Displays error message if add fails
 * - Default tyre: Racing: Soft (handled by API)
 *
 * **Data Flow:**
 * 1. Component mounts: No API call until dialog opens
 * 2. User clicks button: Opens dialog, fetches eligible users
 * 3. API call: GET /api/users?active=true
 * 4. Filtering: Remove users already in race (currentMemberIds)
 * 5. User selects: Calls POST /api/races/[id]/members
 * 6. Success: Close dialog, refresh member list
 * 7. Error: Show error message in dialog
 *
 * **State Management:**
 * - dialogOpen: Controls dialog visibility (triggers fetch when true)
 * - eligibleUsers: Array of users eligible to add (not already in race)
 * - isLoading: Loading state for user fetch
 * - isAdding: Loading state for add member API call
 * - error: Error message from fetch or add operations
 *
 * **Eligible Users Calculation:**
 * - Source: All active users (role: USER or ADMIN)
 * - Filter: Remove users already in race (currentMemberIds)
 * - Result: Users that can be added to race
 * - Empty: If all users already in race, show empty state
 *
 * **API Integration:**
 * - Fetch users: GET /api/users?active=true
 * - Add member: POST /api/races/[raceId]/members
 * - Request body: { userId: string }
 * - Response: Created race member object
 * - Error handling: Display error message in dialog
 *
 * **Lazy Loading Strategy:**
 * - Fetch on open: Only fetch eligible users when dialog opens
 * - Trigger: dialogOpen === true
 * - Benefit: Reduces initial page load API calls
 * - Refetch: Fetches again when dialog reopens (in case of changes)
 *
 * **Error Handling:**
 * - Fetch error: "Failed to fetch users" message
 * - Add error: API error message displayed in dialog
 * - Empty state: "All active users are already in this race"
 * - Network errors: Caught and displayed to user
 *
 * **Loading States:**
 * - Fetching users: Spinner in dialog
 * - Adding member: Spinner on button, "Adding..." text
 * - Button disabled: While adding member
 *
 * **Button Styling:**
 * - Size: min-h-[44px] for accessibility
 * - Hover effect: Hover shadow with primary color tint
 * - Transition: Smooth transition on all properties
 * - Disabled: Button disabled while adding member
 *
 * **Dialog:**
 * - Component: AddMemberDialog (separate component)
 * - Props: open, onOpenChange, users, onAddMember, isLoading
 * - User selection: Dropdown with gamertag/name/email fallback
 * - Error display: Shows error message from add operation
 *
 * **Optimistic Updates:**
 * - Not used: Waits for API response before closing dialog
 * - Refresh: Calls onMemberAdded() to refresh member list
 * - Parent handles: RaceMemberList refreshes members from server
 *
 * **Accessibility:**
 * - Touch targets: 44px minimum button height
 * - Loading feedback: Spinner and "Adding..." text
 * - Error feedback: Clear error messages
 * - Keyboard navigation: Default button and dialog behavior
 *
 * **Performance:**
 * - Lazy fetch: Only fetches when dialog opens
 * - Filtering: Client-side filter (currentMemberIds)
 * - Memoization: Not needed (simple component)
 *
 * **Styling:**
 * - Global classes: None used (component-specific styles)
 * - Shadow: hover:shadow-lg hover:shadow-primary/10
 * - Transition: transition-all duration-200
 * - Spacing: Consistent with design system
 *
 * **Debugging Tips:**
 * - Fetches active users (USER + ADMIN roles) from /api/users?active=true
 * - Filters out users already in race by currentMemberIds
 * - Calls POST /api/races/[id]/members to add member
 * - Default tyre: Racing: Soft (handled by API)
 * - Shows error if add fails (duplicate, network error, etc.)
 * - Eligible users empty: Check if all active users already in race
 * - Fetch failing: Check /api/users endpoint is accessible
 * - Add failing: Check /api/races/[id]/members endpoint
 * - Users not filtering: Check currentMemberIds array is correct
 *
 * **Common Issues:**
 * - No users showing: Check if all users already in race
 * - Add failing: Check user has permission to add members
 * - Dialog not opening: Check dialogOpen state is being set
 * - Error not showing: Check error handling in dialog
 *
 * **Related Files:**
 * - @/components/race-members/race-member-list.tsx: Parent component
 * - @/components/race-members/add-member-dialog.tsx: Dialog component
 * - @/app/api/users/route.ts: API endpoint for fetching users
 * - @/app/api/races/[id]/members/route.ts: API endpoint for adding members
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
  // ============================================================
  // STATE
  // ============================================================
  // - dialogOpen: Controls dialog visibility (triggers fetch when true)
  // - eligibleUsers: Users that can be added (not already in race)
  // - isLoading: Loading state for user fetch
  // - isAdding: Loading state for add member API call
  // - error: Error message from fetch or add operations
  // ============================================================

  const [dialogOpen, setDialogOpen] = useState(false)
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================
  // DATA FETCHING
  // ============================================================
  // Fetch eligible users when dialog opens
  // - Triggered by dialogOpen state
  // - Refetches when dialog reopens (in case of changes)
  // - Filters out users already in race
  //
  // Why fetch on dialog open?
  // - Lazy loading: Don't fetch until needed
  // - Fresh data: Get latest users when dialog opens
  // - Performance: Reduce initial page load API calls
  //
  // Filtering logic:
  // 1. Fetch all active users (USER + ADMIN roles)
  // 2. Filter out users already in race (currentMemberIds)
  // 3. Result: Eligible users to add
  //
  // Debugging Tips:
  // - Not fetching: Check dialogOpen state is being set
  // - Empty users: Check if all active users already in race
  // - Wrong users: Check currentMemberIds filtering logic
  // - Error fetching: Check /api/users endpoint is accessible
  // ============================================================

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

  // ============================================================
  // ADD MEMBER HANDLER
  // ============================================================
  // Call API to add selected user to race
  // - Optimistic: No optimistic update (wait for API)
  // - Success: Close dialog, refresh member list
  // - Error: Re-throw to let dialog display error
  //
  // API endpoint: POST /api/races/[raceId]/members
  // Request body: { userId: string }
  // Response: Created race member object
  // Default tyre: Racing: Soft (handled by API)
  //
  // Why no optimistic update?
  // - Simpler: Wait for API response before closing dialog
  // - Reliable: Server response includes created member data
  // - Parent refresh: Calls onMemberAdded() to refresh from server
  //
  // Debugging Tips:
  // - Not adding: Check API endpoint is accessible
  // - Wrong race: Check raceId prop is correct
  // - Permission error: Check user has admin permissions
  // - Duplicate error: Check if user already in race
  // ============================================================

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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* ============================================================
          Add Member Button
          - Opens dialog when clicked
          - Shows loading spinner while adding
          - Disabled during API call
          - 44px minimum for accessibility
          - Hover shadow effect
          ============================================================ */}
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

      {/* Error display */}
      {/* Shows error message if fetch fails */}
      {error && (
        <div className="text-sm text-destructive mt-2">
          {error}
        </div>
      )}

      {/* ============================================================
          Add Member Dialog
          - User selection dropdown
          - Loading state
          - Empty state
          - Error display
          - Add/Cancel buttons
          ============================================================ */}
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
