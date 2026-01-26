# Add/Delete Loading Feedback Plan

**Date:** 2026-01-26
**Issue:** Add Member and Delete operations have no visual feedback during processing
**Reference Pattern:** `/src/app/admin/users/page.tsx` (lines 320-409)

---

## Problem

Currently, when users:
1. Click "Add Member" → Button doesn't show loading state during API call
2. Click "Delete" → Card doesn't show loading state during API call
3. No optimistic updates → UI waits for API response before changing
4. Users can't tell if operation is working

**User Experience Issue:** No feedback during operations leads to confusion and double-clicks

---

## Solution Pattern (from admin/users/page.tsx)

**State Management:**
```typescript
const [processingId, setProcessingId] = useState<string | null>(null)
const [processingAction, setProcessingAction] = useState<'add' | 'delete' | null>(null)
```

**Button Loading State:**
```typescript
<Button
  disabled={processingId === userId}
  className="min-h-[44px]"
>
  {processingId === userId && processingAction === 'approve' ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Approving...
    </>
  ) : (
    <>
      <UserCheck className="h-4 w-4 mr-2" />
      Approve
    </>
  )}
</Button>
```

---

## Implementation Plan

### 1. Add Member Button Loading State

**File:** `src/components/race-members/add-member-button.tsx`

**Changes:**
1. Add state: `const [addingUserId, setAddingUserId] = useState<string | null>(null)`
2. Update `handleAddMember` function:
   - Set `setAddingUserId(userId)` before API call
   - Clear after success/error
3. Update button to show loading state:
   - Disable button while any add is in progress
   - Show loader + "Adding..." text
   - Change icon to `Loader2` during processing

**Current Code (lines 99-107):**
```tsx
<Button
  onClick={() => setDialogOpen(true)}
  className="min-h-[44px] transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
>
  <Plus className="h-4 w-4 mr-2" />
  Add Member
</Button>
```

**Proposed Change:**
```tsx
<Button
  onClick={() => setDialogOpen(true)}
  disabled={addingUserId !== null}
  className="min-h-[44px] transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
>
  {addingUserId ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Adding...
    </>
  ) : (
    <>
      <Plus className="h-4 w-4 mr-2" />
      Add Member
    </>
  )}
</Button>
```

---

### 2. Delete Operation Loading State

**Option A: Optimistic Update (Preferred)**

**File:** `src/components/race-members/race-member-list.tsx`

**Changes:**
1. Add state: `const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)`
2. Update `handleDelete` function:
   ```typescript
   const handleDelete = async (memberId: string) => {
     // Optimistic: remove immediately from UI
     setDeletingMemberId(memberId)
     const previousMembers = members

     // Remove from local state immediately
     setMembers((prev) => prev.filter((m) => m.id !== memberId))

     try {
       const res = await fetch(`/api/races/${raceId}/members/${memberId}`, {
         method: 'DELETE',
       })

       if (!res.ok) {
         // Rollback on error
         setMembers(previousMembers)
         throw new Error('Failed to delete member')
       }
     } catch (error) {
       console.error('Failed to delete member:', error)
       // Rollback on error (already done above)
     } finally {
       setDeletingMemberId(null)
     }
   }
   ```

**File:** `src/components/race-members/race-member-card.tsx`

**Changes:**
1. Add `isDeleting` prop
2. Show loading state on card when deleting:
   ```typescript
   <div
     className={cn(
       'w-full h-auto p-4 border border-border rounded-lg flex items-center justify-between gap-4',
       'gt-hover-card transition-all duration-200',
       isDeleting && 'opacity-50 animate-pulse',
       isDragging && 'opacity-50 shadow-lg'
     )}
   >
     {/* ... existing content ... */}

     {/* Delete button - disable and show loader */}
     {isAdmin && (
       <Button
         variant="ghost"
         size="icon"
         onClick={handleDelete}
         disabled={isDeleting}
         className="gt-hover-icon-btn"
       >
         {isDeleting ? (
           <Loader2 className="h-4 w-4 animate-spin" />
         ) : (
           <Trash2 className="h-4 w-4" />
         )}
       </Button>
     )}
   </div>
   ```

**Pass prop from RaceMemberList:**
```tsx
<RaceMemberCard
  ...
  isDeleting={deletingMemberId === member.id}
  onDelete={handleDelete}
/>
```

---

### 3. Dialog Button Loading States

**File:** `src/components/race-members/add-member-dialog.tsx`

**Already Implemented:** ✅
- Lines 88-92: Dialog buttons already show loading state with `isAdding` state
- Lines 119-124: Loader2 spinner + "Adding..." text
- No changes needed here!

---

## Implementation Steps

### Phase 1: Add Member Button (5 min)
- [ ] Add `addingUserId` state to `add-member-button.tsx`
- [ ] Update `handleAddMember` to set/clear state
- [ ] Update button JSX to show loader + disable
- [ ] Test: Button shows "Adding..." during API call

### Phase 2: Delete with Optimistic Update (10 min)
- [ ] Add `deletingMemberId` state to `race-member-list.tsx`
- [ ] Update `handleDelete` with optimistic update + rollback
- [ ] Add `isDeleting` prop to `race-member-card.tsx`
- [ ] Update card to show opacity + pulse when deleting
- [ ] Update delete button to show loader when `isDeleting`
- [ ] Pass `isDeleting` prop from RaceMemberList
- [ ] Test: Card fades + loader shows, rollback on error

### Phase 3: Verify (5 min)
- [ ] Build succeeds
- [ ] Test add member flow
- [ ] Test delete member flow
- [ ] Test error scenarios (network failure, etc.)
- [ ] Verify rollback works correctly

---

## Design System Compliance

**Components Used:**
- `Loader2` from lucide-react with `animate-spin`
- `disabled` prop for buttons
- `opacity-50` for fading
- `animate-pulse` for visual feedback
- `transition-all duration-200` for smooth animations

**Pattern Consistency:**
- Matches `admin/users/page.tsx` exactly
- Same loading indicator approach
- Same disabled state pattern
- Same optimistic update pattern

---

## Benefits

1. **Immediate Feedback:** Users see operation is in progress
2. **Prevents Double-Clicks:** Disabled state prevents duplicate requests
3. **Optimistic UI:** Delete feels instant (better UX)
4. **Error Recovery:** Rollback on failure maintains data integrity
5. **Consistent Pattern:** Matches existing admin pages

---

## Testing Checklist

### Add Member Flow
- [ ] Click "Add Member" → Dialog opens
- [ ] Select user → Click "Add Member"
- [ ] Button changes to "Adding..." + loader
- [ ] Button is disabled during operation
- [ ] On success: dialog closes, member appears
- [ ] On error: error message shows, button re-enables

### Delete Flow
- [ ] Click delete icon → Dialog opens
- [ ] Click "Remove" → Dialog closes
- [ ] Card immediately fades (opacity-50) + pulse
- [ ] Delete button shows loader, becomes disabled
- [ ] On success: card removed from list
- [ ] On error: card reappears (rollback), error logged

### Edge Cases
- [ ] Network failure during add → Error shows, button re-enables
- [ ] Network failure during delete → Card reappears (rollback)
- [ ] Multiple rapid clicks → Disabled state prevents duplicates
- [ ] Slow API → Loading state provides feedback

---

## Files to Modify

1. `src/components/race-members/add-member-button.tsx` (5 lines)
2. `src/components/race-members/race-member-list.tsx` (15 lines)
3. `src/components/race-members/race-member-card.tsx` (10 lines)

**Total Changes:** ~30 lines of code
**Estimated Time:** 20 minutes

---

## Alternative Approaches Considered

### Option B: Non-Optimistic Delete (Simpler but slower UX)
- Show loading state but don't update UI until API responds
- Pro: Simpler implementation, no rollback needed
- Con: Slower perceived performance, users wait longer
- **Decision:** Prefer optimistic update (Option A) for better UX

### Option C: Toast Notifications
- Add toast notification system for success/error messages
- Pro: Clear feedback, can persist messages
- Con: More complex, requires toast component/library
- **Decision:** Not needed, in-place loading is sufficient

---

## Status: Awaiting Approval

**Ready to implement when approved.**

**Questions:**
1. Confirm optimistic update approach for delete (or use non-optimistic)?
2. Any preference for error display (console only, or show to user)?
3. Should we add success toasts or is in-place feedback sufficient?

