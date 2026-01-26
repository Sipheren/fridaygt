# Add Member Button - Implementation Plan

**Date:** 2026-01-26
**Phase:** Phase 15 Enhancement
**Status:** Planning
**Priority:** Medium

---

## Overview

Add an "Add Member" button to the race members section on race detail pages that allows admins to add individual members to a race via a popup dialog with a user dropdown.

**Current State:**
- All active users are auto-populated when a race is created
- Admins can remove members via delete button
- No way to add back removed members or add new users who joined after race creation

**Goal:**
- Provide admin UI to add individual users to a race
- Filter dropdown to show only active users not already in the race
- Follow project design system and patterns

---

## User Story

**As an admin,** I want to be able to add individual members to a race so that I can:
- Add back members who were accidentally removed
- Add new users who joined after the race was created
- Manage race participation without recreating the race

---

## Requirements

### Functional Requirements

1. **Add Member Button**
   - Located in Race Members card header (next to title)
   - Only visible to admins (role === 'ADMIN')
   - Opens dialog when clicked
   - Follows design system: `Button` with `Plus` icon, `min-h-[44px]` touch target

2. **Add Member Dialog**
   - shadcn `Dialog` component (matches delete confirmation pattern)
   - Title: "Add Race Member"
   - Description: "Select a user to add to this race"
   - Dropdown of eligible users
   - Add button (primary action)
   - Cancel button (secondary action)

3. **User Dropdown**
   - Shows all active users (role IN ('USER', 'ADMIN')) not already in the race
   - Displays gamertag (not name/email) for privacy
   - Searchable by gamertag
   - Shows empty state if all users already in race
   - Uses `SearchableComboBox` or `Select` component (see Decision Points)

4. **Add Member Action**
   - Calls existing POST /api/races/[id]/members endpoint
   - Passes userId in request body
   - Default tyre: Racing: Soft (handled by API)
   - Adds member to end of list (order field)
   - Refreshes member list after successful add
   - Shows error message if add fails

5. **Permission Checks**
   - Button and dialog only visible to admins
   - API endpoint already has admin check
   - Client-side check for UI visibility

### Non-Functional Requirements

1. **Design System Compliance**
   - Use shadcn components (Dialog, Button, Select/ComboBox)
   - 44px touch targets (WCAG compliance)
   - Proper loading states (Loader2 spinner)
   - Error handling with user-friendly messages
   - Mobile-first responsive design

2. **Performance**
   - Filter users client-side (fetch active users once)
   - Optimistic updates optional (API is fast enough)
   - No virtualization needed (< 100 users typically)

3. **User Experience**
   - Clear visual feedback (loading, error, success)
   - Keyboard navigation support
   - Dialog closes on success or cancel
   - Focus management (auto-focus dropdown on open)

---

## Technical Design

### Database Schema

**No changes required.** Existing tables and endpoints support this feature:

```sql
-- RaceMember table (already exists)
CREATE TABLE RaceMember (
  id text PRIMARY KEY,
  raceid text NOT NULL REFERENCES Race(id) ON DELETE CASCADE,
  userid text NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  partid uuid NOT NULL REFERENCES Part(id),
  order integer NOT NULL,
  createdat timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedat timestamp NOT NULL,
  UNIQUE(raceid, userid)
);

-- Existing API endpoint
POST /api/races/[id]/members
Body: { userId: string, partId?: string }
```

### API Endpoints

**Existing (no changes needed):**

1. `GET /api/users?active=true` - Get active users (USER + ADMIN roles)
   - Response: `{ users: [{ id, name, email, role }] }`
   - Already has admin authorization check

2. `GET /api/races/[id]/members` - Get race members
   - Response: `{ members: [{ id, userid, user: { gamertag } }] }`
   - Used to filter out users already in race

3. `POST /api/races/[id]/members` - Add member to race
   - Body: `{ userId: string, partId?: string }`
   - Response: Race member object
   - Has admin authorization check
   - Default tyre: Racing: Soft

### Component Architecture

```
src/app/races/[id]/page.tsx (existing)
  └── RaceMemberList (existing component)
      └── RaceMemberCard (existing component)
      └── AddMemberButton (NEW component)
          └── AddMemberDialog (NEW component)
```

### Component Specifications

#### 1. AddMemberButton Component

**Location:** `src/components/race-members/add-member-button.tsx`

**Props:**
```tsx
interface AddMemberButtonProps {
  raceId: string
  currentMemberIds: string[] // Array of user IDs already in race
  onMemberAdded: () => void // Callback to refresh member list
}
```

**Features:**
- Button trigger with Plus icon
- Manages dialog open/close state
- Fetches active users on mount
- Filters out current members
- Handles loading/error states
- Calls POST API to add member

**Implementation Pattern:**
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddMemberDialog } from './add-member-dialog'

export function AddMemberButton({ raceId, currentMemberIds, onMemberAdded }: AddMemberButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch eligible users on mount
  useEffect(() => {
    fetchEligibleUsers()
  }, [currentMemberIds])

  const fetchEligibleUsers = async () => {
    // Fetch active users and filter out current members
  }

  const handleAddMember = async (userId: string) => {
    // Call POST /api/races/[id]/members
    // onMemberAdded() callback
    // setDialogOpen(false)
  }

  return (
    <>
      <Button onClick={() => setDialogOpen(true)} className="min-h-[44px]">
        <Plus className="h-4 w-4 mr-2" />
        Add Member
      </Button>
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
```

#### 2. AddMemberDialog Component

**Location:** `src/components/race-members/add-member-dialog.tsx`

**Props:**
```tsx
interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[] // Eligible users (not in race)
  onAddMember: (userId: string) => Promise<void>
  isLoading: boolean
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
  gamertag?: string // Need to verify this is returned
}
```

**Features:**
- shadcn Dialog component
- User selection dropdown (Select or SearchableComboBox)
- Empty state if no eligible users
- Loading state while fetching
- Error display on add failure
- Add/Cancel buttons

**UI Structure:**
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
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
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger id="user">
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.gamertag || user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}

    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleAdd}
        disabled={!selectedUserId || isAdding}
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
```

### Integration with Existing Components

#### RaceMemberList Component Updates

**File:** `src/components/race-members/race-member-list.tsx`

**Changes:**
1. Add `currentMemberIds` prop derivation (map from members)
2. Add `refreshMembers` callback
3. Include AddMemberButton in CardHeader

```tsx
// Derive current member IDs
const currentMemberIds = members.map(m => m.userid)

// Refresh function
const refreshMembers = async () => {
  const res = await fetch(`/api/races/${raceId}/members`)
  const data = await res.json()
  setMembers(data.members || [])
  setPreviousMembers(data.members || [])
}

// In CardHeader
<CardHeader>
  <div className="flex items-center justify-between">
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
```

---

## Decision Points

### 1. Dropdown Component Choice

**Option A: shadcn Select**
- Pros: Simple, lightweight, familiar UI pattern
- Cons: Not searchable, harder to use with many users

**Option B: SearchableComboBox**
- Pros: Searchable, better for many users, consistent with project pattern
- Cons: More complex, larger bundle size

**Decision:** Use **shadcn Select** (Option A)
- Rationale: Active users typically < 50, search not critical
- Simpler implementation
- Smaller bundle size
- Can upgrade to SearchableComboBox later if needed

### 2. User Display Format

**Option A: Gamertag only**
- Pros: Privacy (no names/emails exposed), consistent with member list
- Cons: Some users might not have gamertag set

**Option B: Name + Gamertag**
- Pros: More information
- Cons: Exposes names, inconsistent with member list privacy

**Option C: Fallback chain (gamertag → name → email)**
- Pros: Always shows something
- Cons: Inconsistent display, might expose emails

**Decision:** Use **Gamertag with fallback** (Option C)
- Primary: `user.gamertag`
- Fallback 1: `user.name`
- Fallback 2: `user.email`
- Matches existing member list display behavior

### 3. API Data fetching Strategy

**Option A: Fetch in parent (RaceMemberList)**
- Pros: Single API call, pass data to AddMemberButton
- Cons: Couples components

**Option B: Fetch in AddMemberButton**
- Pros: Self-contained, decoupled
- Cons: Separate API call

**Decision:** Use **Fetch in AddMemberButton** (Option B)
- Rationale: Component is self-contained
- Only fetched when dialog opens (lazy loading)
- Separate API calls are fine (small data size)

---

## Implementation Checklist

### Phase 1: Component Creation
- [ ] Create `add-member-dialog.tsx` component
  - [ ] Dialog structure with header/footer
  - [ ] User selection dropdown
  - [ ] Empty state handling
  - [ ] Loading state
  - [ ] Error handling

- [ ] Create `add-member-button.tsx` component
  - [ ] Button trigger
  - [ ] Fetch eligible users
  - [ ] Filter out current members
  - [ ] Handle add member API call
  - [ ] Success/error feedback

### Phase 2: Integration
- [ ] Update `race-member-list.tsx`
  - [ ] Derive currentMemberIds array
  - [ ] Create refreshMembers callback
  - [ ] Add AddMemberButton to CardHeader
  - [ ] Pass isAdmin flag

### Phase 3: API Verification
- [ ] Verify GET /api/users?active=true returns needed fields
  - [ ] Check if gamertag is included (may need to add to SELECT)
  - [ ] Test admin authorization

- [ ] Verify POST /api/races/[id]/members works correctly
  - [ ] Test with userId only (no partId)
  - [ ] Verify default tyre assignment
  - [ ] Test duplicate user rejection

### Phase 4: Testing
- [ ] Unit testing scenarios
  - [ ] No eligible users (all active users already in race)
  - [ ] Some eligible users
  - [ ] API error handling
  - [ ] Loading states

- [ ] Manual testing
  - [ ] Add member successfully
  - [ ] Try to add duplicate user (should show error)
  - [ ] Cancel dialog
  - [ ] Keyboard navigation
  - [ ] Mobile responsiveness

### Phase 5: Design System Compliance
- [ ] 44px touch targets
- [ ] Proper button variants
- [ ] Dialog pattern matches delete confirmation
- [ ] Loading spinner uses Loader2
- [ ] Error messages are user-friendly
- [ ] Empty state follows design system

---

## Open Questions

### 1. Gamertag in Users API
**Question:** Does GET /api/users?active=true return gamertag field?

**Current Query:**
```sql
SELECT id, name, email, role FROM User
```

**Needed:**
```sql
SELECT id, name, email, role, gamertag FROM User
```

**Action Required:**
- [ ] Verify API response includes gamertag
- [ ] If not, update `/api/users/route.ts` line 26 to include gamertag

### 2. Empty State Behavior
**Question:** Should "Add Member" button be disabled if no eligible users?

**Option A:** Always show button, show empty message in dialog
- Pros: Consistent UI, clearer feedback
- Cons: Extra click to see empty state

**Option B:** Disable button when no eligible users
- Pros: Prevents unnecessary clicks
- Cons: Needs data fetching before render

**Decision:** **Option A** (always show button)
- Rationale: Simpler implementation, clearer feedback
- Empty message in dialog is informative

### 3. Success Feedback
**Question:** How should we show success after adding a member?

**Option A:** Toast notification
- Pros: Non-blocking, consistent with other actions
- Cons: Requires toast system

**Option B:** Dialog closes, member appears in list
- Pros: Simple, obvious (member appears)
- Cons: No explicit message

**Option C:** Success message in dialog before closing
- Pros: Clear feedback
- Cons: Requires extra state/step

**Decision:** **Option B** (dialog closes, member appears)
- Rationale: Member appearing in list is clear feedback
- Simpler implementation
- Consistent with delete behavior (dialog closes, item removed)

---

## Accessibility Considerations

1. **Keyboard Navigation**
   - Tab order: Button → Dialog → Select → Cancel → Add
   - Enter/Space to activate buttons
   - Escape to close dialog
   - Arrow keys in dropdown

2. **Screen Reader Support**
   - Button: "Add Member" (clear purpose)
   - Dialog: "Add Race Member" dialog
   - Select: "Select a user" label
   - Error announcements

3. **Touch Targets**
   - Button: `min-h-[44px]` (WCAG AA)
   - Select items: adequate padding
   - Dialog close button: adequate size

4. **Focus Management**
   - Auto-focus select when dialog opens
   - Return focus to button when dialog closes
   - Trap focus within dialog

---

## Performance Considerations

1. **Data Fetching**
   - Active users: ~10-50 records (small)
   - Race members: ~5-20 records (small)
   - Total API time: < 100ms

2. **Client-Side Filtering**
   - Filter out current members in JavaScript
   - Array.filter() is fast for small datasets
   - No virtualization needed

3. **Bundle Size**
   - AddMemberButton: ~2KB
   - AddMemberDialog: ~3KB
   - Total impact: ~5KB (acceptable)

---

## Security Considerations

1. **Authorization**
   - Button only visible to admins (client-side check)
   - API endpoint has admin check (server-side)
   - Defense in depth

2. **Input Validation**
   - UserId validated by API (FK to User table)
   - Duplicate check by UNIQUE constraint
   - Role check by API (USER or ADMIN only)

3. **Privacy**
   - Display gamertag only (no names/emails)
   - Consistent with member list privacy
   - API only returns active users (no PENDING)

---

## Rollout Plan

1. **Development**
   - Create components
   - Update RaceMemberList
   - Local testing

2. **Code Review**
   - Design system compliance
   - Security review
   - Accessibility check

3. **Testing**
   - Manual testing on dev environment
   - Test with various user counts
   - Test error scenarios

4. **Deployment**
   - Merge to main
   - Deploy to Vercel
   - Smoke test on production

---

## Future Enhancements (Out of Scope)

1. **Bulk Add Members**
   - Multi-select dropdown
   - Add multiple members at once

2. **Tyre Selection**
   - Allow tyre selection when adding member
   - Skip default "Racing: Soft"

3. **Searchable Dropdown**
   - Upgrade to SearchableComboBox if user count grows
   - Better UX for 50+ users

4. **Member Suggestions**
   - Suggest users based on participation history
   - "People who raced this track before"

5. **Add Member from Leaderboard**
   - Quick add users visible in leaderboard
   - One-click add for leaderboard participants

---

## References

### Design System
- **File:** `docs/DESIGN-SYSTEM.md`
- **Dialog Pattern:** Lines 244-264
- **Button Pattern:** Lines 165-201
- **Empty State:** Lines 430-444

### Database Schema
- **File:** `docs/DATABASE-SCHEMA.md`
- **RaceMember Table:** Lines 482-506
- **User Table:** Lines 21-31

### API Routes
- **File:** `src/app/api/races/[id]/members/route.ts`
- **POST Endpoint:** Lines 64-219
- **GET Users:** `src/app/api/users/route.ts`

### Existing Components
- **RaceMemberList:** `src/components/race-members/race-member-list.tsx`
- **RaceMemberCard:** `src/components/race-members/race-member-card.tsx`
- **Dialog:** `src/components/ui/dialog.tsx`
- **Select:** `src/components/ui/select.tsx`
- **SearchableComboBox:** `src/components/ui/searchable-combobox.tsx`

---

## Changelog

**2026-01-26:** Initial plan created
- Defined requirements and technical design
- Created component specifications
- Identified decision points and open questions
- Added implementation checklist
