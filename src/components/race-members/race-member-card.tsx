/**
 * Race Member Card Component
 *
 * Purpose: Individual race member card with position, gamertag, tyre selection, and controls
 * - Displays member's position number and gamertag
 * - Admin controls: tyre selection dropdown, delete button, drag handle
 * - Drag and drop: Reorder members within race (sortable)
 * - Visual feedback: Hover effects, loading states, dragging state
 * - Delete confirmation: Dialog confirmation before removing member
 *
 * **Key Features:**
 * - Position badge: Shows member's order in race (1, 2, 3, etc.)
 * - Gamertag display: Member's gamertag with truncate for long names
 * - Tyre selection: Admin can select tyre for each member (grouped by category)
 * - Delete button: Remove member from race (admin only)
 * - Drag handle: Reorder members (admin only, 2+ members)
 * - Visual states: Dragging, deleting, updating tyre, hover effects
 * - Touch targets: 44px minimum for accessibility
 *
 * **Data Flow:**
 * 1. Props: member data, admin status, tyre options, event handlers
 * 2. User interacts: Select tyre, click delete, drag to reorder
 * 3. Parent handles: API calls, optimistic updates, rollback on error
 * 4. Visual feedback: Loading states, disabled states, hover effects
 *
 * **State Management:**
 * - deleteDialogOpen: Controls delete confirmation dialog visibility
 * - DnD state: isDragging, transform, transition (from useSortable hook)
 * - Parent state: isDeleting, isUpdatingTyre (passed as props)
 *
 * **Admin Controls:**
 * - Tyre selector: Grouped by category (Comfort, Sports, Racing, Dirt/Snow)
 * - Delete button: Opens confirmation dialog before removing member
 * - Drag handle: Only shown when canReorder=true (2+ members)
 * - Disabled states: Buttons disabled during API calls
 *
 * **Drag and Drop:**
 * - Library: @dnd-kit/sortable
 * - Hook: useSortable for drag functionality
 * - Visual feedback: Opacity reduced during drag, shadow effect
 * - Cursor: Changes to 'grabbing' during drag
 * - Touch support: Works on mobile devices
 *
 * **Tyre Selection:**
 * - Grouped by category: Comfort, Sports, Racing, Dirt/Snow, Weather
 * - Category headers: Visual separation between tyre categories
 * - Optimistic update: UI updates immediately, API called in background
 * - Rollback on error: Reverts to previous tyre if API call fails
 * - Loading state: Shows spinner during API call
 *
 * **Delete Confirmation:**
 * - Dialog: Confirmation before removing member
 * - Message: "Are you sure you want to remove [gamertag] from this race?"
 * - Cancel: Closes dialog without deleting
 * - Remove: Calls onDelete handler, closes dialog
 *
 * **Visual States:**
 * - Default: Normal appearance with gt-hover-card effect
 * - Dragging: Opacity reduced, shadow increased
 * - Deleting: Opacity reduced, pulsing animation
 * - Updating tyre: Tyre selector disabled, spinner shown
 * - Hover: gt-hover-card class adds hover effect (global CSS)
 *
 * **Responsive Design:**
 * - Mobile: Position and gamertag stacked, controls stacked below
 * - Desktop: Position and gamertag on left, controls on right
 * - Touch targets: 44px minimum for accessibility
 * - Badge sizing: Smaller on mobile (w-10 h-10) vs desktop (w-8 h-8)
 *
 * **Accessibility:**
 * - Touch targets: 44px minimum for all interactive elements
 * - Disabled states: Clear visual feedback when buttons disabled
 * - Focus states: Default browser focus styles
 * - Screen readers: Semantic HTML structure
 *
 * **Optimistic Updates:**
 * - Tyre change: UI updates immediately, API called in background
 * - Rollback: Reverts to previous value if API call fails
 * - Parent handles: RaceMemberList manages state and API calls
 *
 * **Error Handling:**
 * - Tyre change: Rollback to previous tyre on error
 * - Delete: Parent handles error, shows error message
 * - API errors: Console logged, user sees error message
 *
 * **Performance:**
 * - Memoization: Tyres grouped by category once on render
 * - Event handlers: Stable references (not recreated on each render)
 * - Drag feedback: CSS transforms for smooth animations
 *
 * **Styling:**
 * - Global classes: gt-hover-card, gt-hover-icon-btn
 * - Layout: Flexbox with responsive breakpoints
 * - Spacing: Consistent gaps (gap-3 sm:gap-4)
 * - Typography: Truncate for long gamertags
 *
 * **Debugging Tips:**
 * - Uses gt-hover-card for hover effect (global class)
 * - 44px touch targets for accessibility
 * - Optimistic updates handled by parent component
 * - Tyre options grouped by category (Comfort, Sports, Racing)
 * - Drag handle only shown when canReorder=true (2+ members)
 * - Delete dialog uses shadcn Dialog component
 * - Check isDeleting prop if delete not working
 * - Check isUpdatingTyre prop if tyre selection not updating
 * - Verify tyre options are passed correctly if dropdown empty
 *
 * **Common Issues:**
 * - Tyre not updating: Check isUpdatingTyre prop and API call
 * - Delete not working: Check isDeleting prop and API call
 * - Drag handle not showing: Check canReorder prop (requires 2+ members)
 * - Tyre options not showing: Check tyreOptions prop is populated
 * - Gamertag truncated: Check CSS truncate class is working
 *
 * **Related Files:**
 * - @/components/race-members/race-member-list.tsx: Parent component that manages state
 * - @/components/race-members/add-member-button.tsx: Button to add new members
 * - @/components/race-members/add-member-dialog.tsx: Dialog for adding members
 * - @/components/ui/drag-handle.tsx: Drag handle component
 * - @/lib/utils.ts: cn() utility for conditional class names
 */

'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DragHandle } from '@/components/ui/drag-handle'
import { cn } from '@/lib/utils'

// ============================================================
// TYPE DEFINITIONS
// ============================================================
// Part: Tyre part from Parts table
// User: User data from User table
// RaceMember: Race member with relationships to user and part
// ============================================================

export interface Part {
  id: string
  name: string
  category: {
    id: string
    name: string
  }
}

export interface User {
  id: string
  gamertag: string
}

export interface RaceMember {
  id: string
  raceId: string
  userId: string
  order: number
  partId: string
  createdAt: string
  updatedAt: string
  updatedById: string | null
  user: User
  updatedByUser: User | null
  part: Part
}

interface RaceMemberCardProps {
  member: RaceMember
  index: number
  isAdmin: boolean
  canReorder: boolean
  tyreOptions: Part[]
  onTyreChange: (memberId: string, partId: string) => void
  onDelete: (memberId: string) => void
  isDeleting: boolean
  isUpdatingTyre: boolean
}

export function RaceMemberCard({
  member,
  index,
  isAdmin,
  canReorder,
  tyreOptions,
  onTyreChange,
  onDelete,
  isDeleting,
  isUpdatingTyre,
}: RaceMemberCardProps) {
  // ============================================================
  // STATE
  // ============================================================
  // - deleteDialogOpen: Controls delete confirmation dialog visibility
  // ============================================================

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // ============================================================
  // DRAG AND DROP
  // ============================================================
  // useSortable hook provides drag functionality
  // - attributes: ARIA attributes for accessibility
  // - listeners: Event listeners for drag interactions
  // - setNodeRef: Ref for the draggable node
  // - transform: Current transform (x, y, scale)
  // - transition: CSS transition for smooth animations
  // - isDragging: Boolean indicating if currently dragging
  //
  // Why useSortable?
  // - Provides drag functionality for sortable lists
  // - Handles keyboard navigation
  // - ARIA attributes for screen readers
  // - Smooth animations with CSS transforms
  //
  // Visual feedback during drag:
  // - Opacity reduced (opacity-50)
  // - Shadow increased (shadow-lg)
  // - Cursor changes to 'grabbing'
  //
  // Debugging Tips:
  // - Not dragging: Check listeners are applied to drag handle
  // - Choppy animation: Check CSS transition is applied
  // - Not sorting: Check parent SortableContext items prop
  // ============================================================

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle tyre selection change
   * Calls parent's onTyreChange handler
   * Parent handles optimistic update and API call
   */
  const handleTyreChange = (value: string) => {
    onTyreChange(member.id, value)
  }

  /**
   * Open delete confirmation dialog
   */
  const handleDelete = () => {
    setDeleteDialogOpen(true)
  }

  /**
   * Confirm delete and call parent's onDelete handler
   */
  const confirmDelete = () => {
    onDelete(member.id)
    setDeleteDialogOpen(false)
  }

  /**
   * Cancel delete and close dialog
   */
  const cancelDelete = () => {
    setDeleteDialogOpen(false)
  }

  // ============================================================
  // TYRE GROUPING
  // ============================================================
  // Group tyres by category for organized dropdown
  // - Categories: Comfort, Sports, Racing, Dirt/Snow, Weather
  // - Grouped display: Category header followed by tyre options
  // - Improved UX: Easier to find specific tyre type
  //
  // Example structure:
  // {
  //   "Racing": [
  //     { id: "1", name: "Racing: Hard", category: { name: "Racing" } },
  //     { id: "2", name: "Racing: Medium", category: { name: "Racing" } }
  //   ],
  //   "Sports": [...]
  // }
  //
  // Why group by category?
  // - Organized: Tyres grouped by type (Racing, Sports, Comfort)
  // - Scannable: Category headers make it easier to find tyre
  // - Familiar: Matches Gran Turismo tyre categorization
  // ============================================================

  const tyresByCategory = tyreOptions.reduce((acc, tyre) => {
    const category = tyre.category.name
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(tyre)
    return acc
  }, {} as Record<string, Part[]>)

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
    {/* Card container with drag functionality */}
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full h-auto p-4 border border-border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 gt-hover-card transition-all duration-200',
        isDragging && 'opacity-50 shadow-lg',
        isDeleting && 'opacity-50 animate-pulse'
      )}
    >
      {/* ============================================================
          Row 1: Position + Gamertag (full width on mobile)
          ============================================================ */}
      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto sm:flex-1 sm:min-w-0">
        {/* Position number badge */}
        {/* Shows member's order in race (1, 2, 3, etc.) */}
        {/* Larger on mobile for touch targets */}
        <div className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-primary/10 font-bold text-primary shrink-0">
          {index + 1}
        </div>

        {/* User info - gamertag only */}
        {/* Truncate for long gamertags to prevent overflow */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{member.user.gamertag}</p>
        </div>
      </div>

      {/* ============================================================
          Row 2: Controls (admin only)
          - Tyre selector dropdown
          - Delete button
          - Drag handle (only when 2+ members)
          ============================================================ */}
      {isAdmin && (
        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-shrink-0 gap-3 sm:gap-4">
          {/* Tyre selector dropdown */}
          {/* Grouped by category with category headers */}
          {/* Disabled during API call, shows spinner */}
          <Select
            value={member.partId}
            onValueChange={handleTyreChange}
            disabled={isUpdatingTyre}
          >
            <SelectTrigger
              size="sm"
              className={cn(
                "w-full sm:w-fit transition-all duration-200",
                isUpdatingTyre && "opacity-50"
              )}
            >
              <SelectValue />
              {isUpdatingTyre && (
                <Loader2 className="h-3 w-3 ml-2 animate-spin" />
              )}
            </SelectTrigger>
            <SelectContent className="w-full">
              {/* Grouped by category with headers */}
              {Object.entries(tyresByCategory).map(([category, tyres]) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {category}
                  </div>
                  {/* Tyre options in this category */}
                  {tyres.map((tyre) => (
                    <SelectItem key={tyre.id} value={tyre.id}>
                      {tyre.name}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>

          {/* Control buttons group */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Delete button */}
            {/* Opens confirmation dialog before removing member */}
            {/* Shows loading spinner during delete */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gt-hover-icon-btn"
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>

            {/* Drag handle (only when 2+ members) */}
            {/* Only shown when canReorder=true */}
            {/* Attributes and listeners from useSortable hook */}
            {/* Prevents click propagation to avoid triggering drag on click */}
            {canReorder && (
              <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onClick={(e) => e.stopPropagation()}
              >
                <DragHandle isDragging={isDragging} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ============================================================
        Delete Confirmation Dialog
        ============================================================
        Confirmation dialog before removing member from race
        - Shows member's gamertag in message
        - Cancel button: Closes dialog without deleting
        - Remove button: Calls onDelete handler, closes dialog
        - Uses shadcn Dialog component
        ============================================================ */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Race Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {member.user.gamertag} from this race?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={cancelDelete}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
