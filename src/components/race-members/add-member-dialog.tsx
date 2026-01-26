/**
 * Add Member Dialog Component
 *
 * Purpose: Dialog for selecting and adding a user to a race
 * - User selection dropdown with eligible active users
 * - Add/Cancel buttons with loading states
 * - Loading and empty states
 * - Error handling and display
 * - Gamertag fallback (gamertag → name → email)
 *
 * **Key Features:**
 * - User selection: Dropdown with eligible users (not already in race)
 * - Gamertag priority: Shows gamertag, falls back to name, then email
 * - Loading state: Spinner while fetching users
 * - Empty state: Message when all users already in race
 * - Error handling: Displays error message if add fails
 * - Validation: Add button disabled until user selected
 * - Reset state: Clears selection and error when dialog closes
 *
 * **Data Flow:**
 * 1. Props: open, onOpenChange, users, onAddMember, isLoading
 * 2. User selects: Choose user from dropdown
 * 3. User clicks Add: Calls onAddMember(userId)
 * 4. Parent handles: API call, error handling, dialog close
 * 5. Success: Parent closes dialog, refreshes member list
 * 6. Error: Displays error message in dialog
 *
 * **State Management:**
 * - selectedUserId: ID of selected user in dropdown
 * - isAdding: Loading state for add member API call
 * - error: Error message from add operation
 *
 * **User Selection:**
 * - Component: shadcn Select component
 * - Options: Eligible users (not already in race)
 * - Display: Gamertag (fallback: name → email)
 * - Search: No search (dropdown only)
 * - Validation: Add button disabled until user selected
 *
 * **Gamertag Fallback:**
 * - Priority: gamertag → name → email
 * - Why? Gamertag is most relevant, name is fallback, email is last resort
 * - Display: Shows in dropdown and error messages
 * - Example: "SpeedRacer" (gamertag) vs "John Doe" (name) vs "john@example.com" (email)
 *
 * **Loading States:**
 * - Fetching users: Spinner in dialog (isLoading prop)
 * - Adding member: Spinner on button, "Adding..." text (isAdding state)
 * - Button disabled: While adding, loading, or no users available
 *
 * **Empty State:**
 * - Trigger: users.length === 0
 * - Display: "All active users are already in this race"
 * - Add button disabled: No users to add
 *
 * **Error Handling:**
 * - Display: Shows error message below dropdown
 * - Styling: Destructive color (red)
 * - Source: Re-thrown from parent's addMember handler
 * - Examples: "Failed to add member", "Network error"
 *
 * **Dialog Control:**
 * - Controlled: open prop controls dialog visibility
 * - Callback: onOpenChange called when dialog state changes
 * - Reset: Clears selectedUserId and error when closing
 * - Why reset? Prevents stale state on next open
 *
 * **Validation:**
 * - User required: Add button disabled until user selected
 * - Loading: Button disabled while adding or fetching
 * - Empty users: Button disabled when no users available
 *
 * **Accessibility:**
 * - Touch targets: 44px minimum button height (min-h-[44px])
 * - Focus management: Default Dialog behavior
 * - Screen readers: Semantic HTML structure
 * - Keyboard navigation: Default Select and Dialog behavior
 *
 * **Button Styling:**
 * - Size: min-h-[44px] for accessibility
 * - Cancel: Outline variant (secondary action)
 * - Add: Primary variant (primary action)
 * - Disabled: Visual feedback when disabled
 *
 * **Layout:**
 * - Vertical: Stacked layout (Label → Select → Error → Buttons)
 * - Spacing: Consistent gaps (space-y-4)
 * - Footer: DialogFooter with button grouping
 *
 * **Dialog Component:**
 * - Library: shadcn Dialog component
 * - Pattern: Controlled component with open/onOpenChange
 * - Parts: DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
 * - Usage: Confirmation pattern (matches delete confirmation)
 *
 * **Optimistic Updates:**
 * - Not used: Waits for API response before allowing close
 * - Parent handles: AddMemberButton manages API call and error handling
 *
 * **Performance:**
 * - No memoization: Simple component, not needed
 * - Efficient: Minimal re-renders
 *
 * **Styling:**
 * - Global classes: None used (component-specific styles)
 * - Spacing: Consistent with design system
 * - Typography: Default font weights and sizes
 *
 * **Debugging Tips:**
 * - Uses shadcn Dialog component (matches delete confirmation pattern)
 * - Displays gamertag with fallback (gamertag → name → email)
 * - 44px touch targets for accessibility
 * - Shows empty state when all users already in race
 * - Add button disabled until user selected
 * - Error handling: Re-throws error from parent handler
 * - State reset: Clears selection and error when closing
 * - Users not showing: Check users prop is populated
 * - Add not working: Check onAddMember prop is correct
 * - Dialog not closing: Check onOpenChange callback
 * - Error not showing: Check error handling in parent
 *
 * **Common Issues:**
 * - No users: Check users prop is populated
 * - Add button disabled: Check user is selected
 * - Dialog not closing: Check parent is calling onOpenChange(false)
 * - Error not showing: Check parent is re-throwing error
 * - Gamertag not showing: Check user data has gamertag field
 *
 * **Related Files:**
 * - @/components/race-members/add-member-button.tsx: Parent component
 * - @/components/race-members/race-member-list.tsx: Grandparent component
 * - @/components/ui/dialog.tsx: shadcn Dialog component
 * - @/components/ui/select.tsx: shadcn Select component
 * - @/components/ui/label.tsx: shadcn Label component
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

// ============================================================
// TYPE DEFINITIONS
// ============================================================
// User: User data from User table
// - id: User ID (UUID)
// - name: User's full name (optional)
// - email: User's email address
// - role: User's role (PENDING, USER, ADMIN)
// - gamertag: User's gamertag (optional, primary display name)
// ============================================================

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
  // ============================================================
  // STATE
  // ============================================================
  // - selectedUserId: ID of selected user in dropdown
  // - isAdding: Loading state for add member API call
  // - error: Error message from add operation
  // ============================================================

  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================
  // ADD MEMBER HANDLER
  // ============================================================
  // Call parent's onAddMember handler with selected user ID
  // - Parent handles: API call, error handling, dialog close
  // - Success: Parent closes dialog, refreshes member list
  // - Error: Re-thrown error caught and displayed here
  //
  // Validation:
  // - Check selectedUserId is not empty
  // - Parent validates: User exists, not already in race, etc.
  //
  // Error handling:
  // - Clear previous error before calling parent
  // - Catch error from parent and display message
  // - Keep dialog open on error (don't close)
  //
  // Debugging Tips:
  // - Not adding: Check selectedUserId is set
  // - Error not showing: Check parent is re-throwing error
  // - Dialog closing on error: Check parent is not calling onOpenChange
  // ============================================================

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

  // ============================================================
  // DIALOG CLOSE HANDLER
  // ============================================================
  // Reset state when closing dialog
  // - Clear selectedUserId
  // - Clear error message
  // - Call parent's onOpenChange callback
  //
  // Why reset state?
  // - Prevents stale state on next open
  // - Clean slate for next dialog open
  // - No confusion from previous interaction
  //
  // Called by:
  // - User clicks Cancel button
  // - User clicks outside dialog
  // - Parent closes dialog on success
  // ============================================================

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedUserId('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  // ============================================================
  // GAMERTAG FALLBACK
  // ============================================================
  // Display user's name with priority: gamertag → name → email
  // - Gamertag: Primary display name (most relevant in GT context)
  // - Name: Fallback if gamertag not set
  // - Email: Last resort (always present)
  //
  // Example display:
  // - "SpeedRacer" (gamertag)
  // - "John Doe" (name, if no gamertag)
  // - "john@example.com" (email, if no gamertag or name)
  //
  // Why this priority?
  // - Gamertag: How users are known in GT community
  // - Name: Real name if gamertag not set
  // - Email: Unique identifier (always present)
  // ============================================================

  const getUserDisplayName = (user: User): string => {
    return user.gamertag || user.name || user.email
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {/* ============================================================
            Dialog Header
            - Title: "Add Race Member"
            - Description: "Select a user to add to this race"
            ============================================================ */}
        <DialogHeader>
          <DialogTitle>Add Race Member</DialogTitle>
          <DialogDescription>
            Select a user to add to this race
          </DialogDescription>
        </DialogHeader>

        {/* ============================================================
            Dialog Content
            - Loading state: Spinner while fetching users
            - Empty state: Message when no users available
            - User selection: Dropdown with eligible users
            - Error display: Error message below dropdown
            ============================================================ */}
        {isLoading ? (
          // Loading state: Spinner while fetching users
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          // Empty state: No users available
          <div className="text-center py-4 text-muted-foreground">
            All active users are already in this race
          </div>
        ) : (
          // User selection dropdown
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
                {/* User options with gamertag fallback */}
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {getUserDisplayName(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Error display */}
            {/* Shows error message if add fails */}
            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            Dialog Footer
            - Cancel button: Closes dialog without adding
            - Add button: Calls handleAdd to add selected user
            - Button states: Disabled, loading, normal
            ============================================================ */}
        <DialogFooter>
          {/* Cancel button */}
          {/* Closes dialog without adding member */}
          {/* Disabled while adding */}
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
            className="min-h-[44px]"
          >
            Cancel
          </Button>

          {/* Add button */}
          {/* Calls handleAdd to add selected user */}
          {/* Disabled: No user selected, adding, loading, or no users */}
          {/* Shows spinner while adding */}
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
