# Sticky Notes Board - Implementation Plan (REVISED)

## Overview
A collaborative sticky notes board for team members to share quick notes, links, and ideas in real-time.

**Status:** Ready for Implementation
**Priority:** Medium
**Target Version:** v0.21.0
**Last Updated:** 2026-02-02 (Fixes Applied)

---

## ✅ Changes From Original Plan

### Major Changes
1. **Real-time:** Supabase Realtime (instead of Liveblocks) - no extra cost, no user limits
2. **Text Editor:** Simple `<textarea>` for MVP (TipTap rich text moved to Phase 3)
3. **Animations:** CSS transitions (Framer Motion removed)
4. **State:** React Context API (Zustand removed)
5. **Database:** Fixed column naming, ID generation, timestamps, added RLS policies
6. **API:** Added rate limiting, Zod validation, auth checks
7. **Navigation:** Added to main header between Lap Times and Admin

### Dependencies Needed
```json
// NO new dependencies for MVP!
// Everything needed is already installed:
// - @dnd-kit/core (drag & drop)
// - Supabase (database + realtime)
// - NextAuth (authentication)
```

---

## Requirements

### Functional Requirements
1. Single shared board for all members (community notes style)
2. All members can view, create, edit, and delete notes
3. Real-time updates (see changes from other users instantly)
4. Mobile-first responsive design

### UX Requirements
- **Mobile (< 768px):** Vertical scrollable list, tap to edit, no drag
- **Desktop (≥ 768px):** Free canvas with drag-to-reposition
- Visual sticky note aesthetic
- Plain text content (rich text in Phase 3)
- Color-coded notes (6 colors)

### Technical Requirements
- Real-time synchronization via Supabase Realtime
- Persistent storage in Postgres
- Rate limiting on mutations
- WCAG AA accessibility compliance

---

## Tech Stack

| Category | Library | Purpose | Status |
|----------|---------|---------|--------|
| Real-time | Supabase Realtime | Live updates | ✅ Already included |
| Drag & Drop | `@dnd-kit/core` | Desktop positioning | ✅ Already installed |
| Database | Supabase Postgres | Persistent storage | ✅ Already included |
| Auth | NextAuth v5 | User authentication | ✅ Already installed |
| Validation | Zod | API validation | ✅ Already installed |
| Rate Limiting | In-memory Map | API protection | ✅ Already implemented |

**Why Supabase Realtime instead of Liveblocks?**
- ✅ Already included in Supabase (no extra cost)
- ✅ No user limits (Liveblocks free tier: 5 users, you have 7)
- ✅ Works with existing RLS policies
- ✅ Simpler setup, less dependencies
- ❌ No built-in cursors/presence (can add custom in Phase 2)
- ❌ No automatic conflict resolution (optimistic updates handle this)

---

## Database Schema

### Notes Table

```sql
-- Version: 0.21.0
-- Description: Sticky notes board table

CREATE TABLE "Note" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  color VARCHAR(7) DEFAULT '#fef08a',
  positionX INT DEFAULT 0,
  positionY INT DEFAULT 0,
  width VARCHAR(20) DEFAULT 'medium',
  pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  createdBy TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notes_created_by ON "Note"("createdBy");
CREATE INDEX idx_notes_pinned ON "Note"(pinned) WHERE pinned = true;
CREATE INDEX idx_notes_created_at ON "Note"("createdAt" DESC);

-- Enable RLS
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Everyone can view notes (public read)
CREATE POLICY "notes_select_all"
  ON "Note"
  FOR SELECT
  USING (true);

-- RLS Policy 2: Authenticated users can create notes
CREATE POLICY "notes_insert_authenticated"
  ON "Note"
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy 3: Users can update their own notes OR admins can update any
CREATE POLICY "notes_update_own_or_admin"
  ON "Note"
  FOR UPDATE
  USING (
    auth.uid() = "createdBy" OR
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policy 4: Users can delete their own notes OR admins can delete any
CREATE POLICY "notes_delete_own_or_admin"
  ON "Note"
  FOR DELETE
  USING (
    auth.uid() = "createdBy" OR
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

**Schema Notes:**
- **Table name:** `"Note"` (quoted, singular, PascalCase - matches project convention)
- **ID generation:** Application-level `crypto.randomUUID()` (not database default)
- **Column naming:** camelCase (matches Race, User tables)
- **Timestamp type:** `TIMESTAMP` without time zone (matches project standard)
- **Foreign key:** Cascades on user deletion
- **RLS:** Enabled with 4 policies (public read, authenticated create, owner/admin update/delete)

---

## Component Structure

```
src/
  app/
    notes/
      page.tsx                          → Main notes board page
  components/
    notes/
      notes-board.tsx                   → Board container (responsive layout)
      note-card.tsx                     → Individual note display
      note-editor-dialog.tsx            → Create/edit dialog with textarea
      note-toolbar.tsx                  → Actions (new note, color filter)
      empty-notes-state.tsx             → Empty state component
  hooks/
    use-notes-realtime.ts               → Supabase Realtime hook
  lib/
    validation.ts                       → Add NoteSchemas
```

**Component Patterns:**
- File names: kebab-case (matches project convention)
- Components: PascalCase exports
- Follows DESIGN-SYSTEM.md patterns
- Mobile-first responsive
- 44px minimum touch targets

---

## API Endpoints

### GET /api/notes
Fetch all notes (ordered by pinned, then createdAt DESC).

**Security:**
- Rate limit: Query tier (100 requests/min)
- Auth: Optional (RLS handles permissions)

**Response:**
```typescript
{
  notes: Note[]
}
```

---

### POST /api/notes
Create a new note.

**Security:**
- Rate limit: Mutation tier (20 requests/min)
- Auth: Required
- Validation: Zod schema

**Request Body:**
```typescript
{
  title: string,           // Max 200 chars
  content: string,         // Max 10,000 chars
  color: string,           // Hex color (e.g., "#fef08a")
  positionX: number,       // Integer (desktop only)
  positionY: number        // Integer (desktop only)
}
```

**Response:**
```typescript
{
  id: string,
  title: string,
  content: string,
  color: string,
  positionX: number,
  positionY: number,
  width: string,
  pinned: boolean,
  tags: string[],
  createdBy: string,
  createdAt: string,
  updatedAt: string
}
```

---

### PATCH /api/notes/[id]
Update an existing note.

**Security:**
- Rate limit: Mutation tier (20 requests/min)
- Auth: Required (owner or admin)
- Validation: Zod schema

**Request Body:**
```typescript
{
  title?: string,
  content?: string,
  color?: string,
  positionX?: number,
  positionY?: number,
  pinned?: boolean,
  tags?: string[]
}
```

---

### DELETE /api/notes/[id]
Delete a note.

**Security:**
- Rate limit: Mutation tier (20 requests/min)
- Auth: Required (owner or admin)

**Response:**
```typescript
{ success: true }
```

---

## Zod Validation Schemas

Add to `src/lib/validation.ts`:

```typescript
// Note validation schemas
export const CreateNoteSchema = z.object({
  title: z.string().max(200).default(''),
  content: z.string().max(10000).default(''),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#fef08a'),
  positionX: z.number().int().default(0),
  positionY: z.number().int().default(0),
})

export const UpdateNoteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(10000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})
```

---

## Supabase Realtime Integration

### Hook: useNotesRealtime

```typescript
// src/hooks/use-notes-realtime.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '@/types/database'

export function useNotesRealtime() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from('Note')
        .select('*')
        .order('pinned', { ascending: false })
        .order('createdAt', { ascending: false })

      if (!error && data) {
        setNotes(data)
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
          setNotes((prev) => [payload.new as Note, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Note' },
        (payload) => {
          setNotes((prev) =>
            prev.map((note) =>
              note.id === payload.new.id ? (payload.new as Note) : note
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'Note' },
        (payload) => {
          setNotes((prev) => prev.filter((note) => note.id !== payload.old.id))
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { notes, loading }
}
```

**Usage in component:**
```typescript
const { notes, loading } = useNotesRealtime()
```

---

## Navigation Integration

Add to `src/components/header.tsx`:

```typescript
import { StickyNote } from 'lucide-react'

const navigation = [
  { name: 'Tonight', href: '/tonight', icon: Radio },
  { name: 'Builds', href: '/builds', icon: Wrench },
  { name: 'Races', href: '/races', icon: Flag },
  { name: 'Lap Times', href: '/lap-times', icon: Clock },
  { name: 'Notes', href: '/notes', icon: StickyNote }, // ← NEW
]
```

**Icon:** `StickyNote` from lucide-react (already installed)

---

## Implementation Roadmap

### Phase 1 - Core MVP (v0.21.0) - 6-8 hours

**Database:**
- [ ] Create migration file: `supabase/migrations/[timestamp]_create_notes_table.sql`
- [ ] Run migration locally
- [ ] Test RLS policies
- [ ] Verify real-time subscriptions work

**API Endpoints:**
- [ ] Create `src/app/api/notes/route.ts` (GET, POST)
- [ ] Create `src/app/api/notes/[id]/route.ts` (PATCH, DELETE)
- [ ] Add Zod schemas to `src/lib/validation.ts`
- [ ] Test all endpoints with rate limiting
- [ ] Test auth and RLS enforcement

**Types:**
- [ ] Add `Note` interface to `src/types/database.ts`

**Hooks:**
- [ ] Create `src/hooks/use-notes-realtime.ts`
- [ ] Test real-time updates in dev mode

**Components:**
- [ ] Create `src/components/notes/note-card.tsx`
  - Display note with color background
  - Show title, content, creator
  - Edit/delete buttons (owner or admin only)
  - Tap to open editor on mobile
  - Double-click to edit on desktop
- [ ] Create `src/components/notes/note-editor-dialog.tsx`
  - shadcn Dialog component
  - Title input
  - Textarea for content (10k char limit)
  - Color picker (6 colors)
  - Save/Cancel buttons
- [ ] Create `src/components/notes/note-toolbar.tsx`
  - "New Note" button
  - Color filter buttons (All, Yellow, Pink, Blue, Green, Purple, Orange)
  - Search input (Phase 3)
- [ ] Create `src/components/notes/notes-board.tsx`
  - Responsive container
  - Mobile: Vertical scrollable list
  - Desktop: Grid layout with drag & drop (@dnd-kit)
  - Empty state component
- [ ] Create `src/components/notes/empty-notes-state.tsx`
  - StickyNote icon (h-12 w-12)
  - "No notes yet" message
  - "Create Your First Note" button

**Page:**
- [ ] Create `src/app/notes/page.tsx`
  - PageHeader with StickyNote icon
  - Note count display
  - NoteToolbar
  - NotesBoard with useNotesRealtime
  - Loading state
  - Error handling

**Navigation:**
- [ ] Add "Notes" to header.tsx navigation
- [ ] Test mobile menu

**Styling:**
- [ ] Follow DESIGN-SYSTEM.md patterns
- [ ] Mobile-first responsive
- [ ] 44px minimum touch targets
- [ ] Color palette: Yellow, Pink, Blue, Green, Purple, Orange

**Testing:**
- [ ] Create note (mobile + desktop)
- [ ] Edit note (owner + admin + unauthorized)
- [ ] Delete note (owner + admin + unauthorized)
- [ ] Real-time sync (open 2 browser tabs)
- [ ] Drag & drop on desktop
- [ ] Vertical scroll on mobile
- [ ] Color filter
- [ ] Rate limiting triggers
- [ ] RLS enforcement

---

### Phase 2 - Collaboration Features (v0.22.0) - 4-6 hours

**Custom Presence System:**
- [ ] Track active users in notes page
- [ ] Show user avatars at top (who's viewing)
- [ ] Add "edited by [user] [time] ago" indicator
- [ ] Optimistic updates for smooth UX

**Conflict Resolution:**
- [ ] Last-write-wins strategy
- [ ] Show notification if note changed while editing
- [ ] Option to reload or keep local changes

---

### Phase 3 - Enhanced Features (v0.23.0) - 6-8 hours

**Rich Text Editor:**
- [ ] Install TipTap: `npm install @tiptap/react @tiptap/starter-kit`
- [ ] Replace textarea with TipTap editor
- [ ] Support: Bold, italic, lists, links
- [ ] Markdown shortcuts

**Enhanced Features:**
- [ ] Pin important notes to top
- [ ] Tags with autocomplete
- [ ] Tag filtering
- [ ] Search functionality (title + content)
- [ ] Link previews (detect URLs, show preview)

**Note History:**
- [ ] Create `NoteHistory` table
- [ ] Track changes with diffs
- [ ] "View History" dialog
- [ ] Restore previous versions

---

### Phase 4 - Mobile Optimizations (v0.24.0) - 4-6 hours

**Mobile UX:**
- [ ] Swipe left to delete (with confirmation)
- [ ] Swipe right to pin/unpin
- [ ] Pull to refresh
- [ ] Haptic feedback on interactions

**Offline Support:**
- [ ] Service worker for offline access
- [ ] Queue mutations when offline
- [ ] Sync when back online
- [ ] Offline indicator

---

## Mobile-First Design Specifications

### Breakpoints
- **Mobile:** < 768px (vertical stack, no drag)
- **Tablet:** 768px - 1024px (grid with drag)
- **Desktop:** > 1024px (free canvas with drag)

### Mobile Layout (< 768px)
```
┌─────────────────────────────────────┐
│  📌 Team Notes        [+ New Note]  │
│  23 notes                           │
├─────────────────────────────────────┤
│  [All] [Yellow] [Pink] [Blue] ...  │ ← Color filters
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ 📝 Note Title                 │  │
│  │ Note content here...          │  │
│  │                               │  │
│  │ [Edit] [Delete]    by @user   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 📝 Another Note               │  │
│  │ Content...                    │  │
│  └───────────────────────────────┘  │
│  (scroll for more)                  │
└─────────────────────────────────────┘
```

### Desktop Layout (≥ 768px)
```
┌───────────────────────────────────────────────────┐
│  📌 Team Notes    [All] [Yellow] [Pink] [+ New]  │
│  23 notes                                         │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  │ Note 1  │   │ Note 2  │   │ Note 3  │        │
│  │         │   │         │   │         │        │
│  │ (drag)  │   │ (drag)  │   │ (drag)  │        │
│  └─────────┘   └─────────┘   └─────────┘        │
│                                                   │
│  ┌─────────┐   ┌─────────┐                      │
│  │ Note 4  │   │ Note 5  │                      │
│  └─────────┘   └─────────┘                      │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## Color Palette

Based on Tailwind CSS colors (matches DESIGN-SYSTEM.md):

| Name | Tailwind Class | Hex | Use Case |
|------|----------------|-----|----------|
| Yellow | `bg-yellow-200 dark:bg-yellow-900/30` | #fef08a | Default notes |
| Pink | `bg-pink-200 dark:bg-pink-900/30` | #fbcfe8 | Personal notes |
| Blue | `bg-blue-200 dark:bg-blue-900/30` | #bfdbfe | Ideas |
| Green | `bg-green-200 dark:bg-green-900/30` | #bbf7d0 | Completed |
| Purple | `bg-purple-200 dark:bg-purple-900/30` | #e9d5ff | Important |
| Orange | `bg-orange-200 dark:bg-orange-900/30` | #fed7aa | Urgent |

**Dark mode handling:** Use darker, desaturated versions in dark mode.

---

## Drag & Drop Implementation

Using existing `@dnd-kit/core` (already installed):

```typescript
// src/components/notes/notes-board.tsx (desktop only)
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

function NotesBoard() {
  const { notes } = useNotesRealtime()

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event
    const noteId = active.id as string

    // Calculate new position
    const newX = notes.find(n => n.id === noteId)!.positionX + delta.x
    const newY = notes.find(n => n.id === noteId)!.positionY + delta.y

    // Optimistic update
    // ... then call API
    await fetch(`/api/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ positionX: newX, positionY: newY })
    })
  }

  // Desktop: Draggable grid
  // Mobile: Simple list (no drag)
  return (
    <div className="hidden md:block">
      <DndContext onDragEnd={handleDragEnd}>
        {/* Draggable notes */}
      </DndContext>
    </div>
  )
}
```

**Mobile:** No drag & drop, just vertical scroll with tap to edit.

---

## Security Considerations

### 1. Authentication Required
- All note operations require valid NextAuth session
- RLS policies enforce user ownership

### 2. Authorization
- **Create:** Any authenticated user
- **Read:** Everyone (public board)
- **Update:** Owner OR admin
- **Delete:** Owner OR admin

### 3. Input Validation
- Zod schemas validate all inputs
- Max lengths: title (200), content (10,000)
- Hex color validation
- XSS prevention: Content is text-only (Phase 1), sanitized HTML (Phase 3)

### 4. Rate Limiting
- **Query (GET):** 100 requests/min
- **Mutation (POST/PATCH/DELETE):** 20 requests/min
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### 5. Audit Logging
- All note changes tracked via `createdAt`, `updatedAt`
- Creator tracked via `createdBy`
- Consider adding `NoteHistory` table in Phase 3

---

## API Implementation Example

### POST /api/notes

```typescript
// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'
import { CreateNoteSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // 2. Authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Validation
    const body = await req.json()
    const result = CreateNoteSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // 4. Database operation
    const noteId = crypto.randomUUID()
    const supabase = createServiceRoleClient()

    const { data: note, error } = await supabase
      .from('Note')
      .insert({
        id: noteId,
        ...result.data,
        createdBy: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      )
    }

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Testing Strategy

### Unit Tests (Optional - Future)
- Note CRUD operations
- Validation schemas
- Permission checks

### Manual Testing (Phase 1)
1. **Create note:** Mobile + desktop
2. **Edit note:** As owner, as admin, as other user (should fail)
3. **Delete note:** As owner, as admin, as other user (should fail)
4. **Real-time sync:** Open 2 browser tabs, create/edit/delete in one, verify updates in other
5. **Drag & drop:** Desktop only, verify position saves
6. **Color filter:** Filter by each color, verify results
7. **Rate limiting:** Make 25 rapid requests, verify 429 error
8. **RLS:** Test with different user roles
9. **Mobile:** Vertical scroll, tap to edit, no drag
10. **Dark mode:** Toggle theme, verify colors look good

### E2E Tests (Optional - Future)
- Multi-user collaboration
- Real-time sync scenarios
- Mobile interactions

---

## Performance Targets

- **Initial Load:** < 2 seconds (fetch all notes)
- **Real-time Latency:** < 200ms (Supabase Realtime)
- **Mobile:** 60fps smooth scrolling
- **Desktop:** Smooth drag without lag (use CSS `will-change`)

---

## Migration File

Location: `supabase/migrations/[timestamp]_create_notes_table.sql`

```sql
-- Version: 0.21.0
-- Description: Create notes table for sticky notes board
-- Date: 2026-02-02

-- Create Note table
CREATE TABLE "Note" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  color VARCHAR(7) DEFAULT '#fef08a',
  positionX INT DEFAULT 0,
  positionY INT DEFAULT 0,
  width VARCHAR(20) DEFAULT 'medium',
  pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  createdBy TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notes_created_by ON "Note"("createdBy");
CREATE INDEX idx_notes_pinned ON "Note"(pinned) WHERE pinned = true;
CREATE INDEX idx_notes_created_at ON "Note"("createdAt" DESC);

-- Enable Row Level Security
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read (everyone can view notes)
CREATE POLICY "notes_select_all"
  ON "Note"
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can create notes
CREATE POLICY "notes_insert_authenticated"
  ON "Note"
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: Users can update their own notes OR admins can update any
CREATE POLICY "notes_update_own_or_admin"
  ON "Note"
  FOR UPDATE
  USING (
    auth.uid() = "createdBy" OR
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policy: Users can delete their own notes OR admins can delete any
CREATE POLICY "notes_delete_own_or_admin"
  ON "Note"
  FOR DELETE
  USING (
    auth.uid() = "createdBy" OR
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Add comment
COMMENT ON TABLE "Note" IS 'Collaborative sticky notes board for team members';
```

---

## Type Definitions

Add to `src/types/database.ts`:

```typescript
export interface Note {
  id: string
  title: string
  content: string
  color: string
  positionX: number
  positionY: number
  width: 'small' | 'medium' | 'large'
  pinned: boolean
  tags: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DbNote extends Note {
  // Database version (same as Note for now)
}
```

---

## Open Questions

1. **Max notes per user?** Unlimited for now, monitor usage
2. **Archive old notes?** Not in MVP, consider in Phase 3
3. **Deletion:** Hard delete (CASCADE on user deletion)
4. **Export notes?** Consider in Phase 3 (JSON/Markdown export)
5. **Note size limits?** Width fixed (small/medium/large), height auto-expands

---

## Success Criteria

### Phase 1 MVP
- [ ] All authenticated users can create/edit/delete notes
- [ ] Real-time updates work across multiple tabs/users
- [ ] Mobile: Vertical list with tap to edit
- [ ] Desktop: Grid layout with drag & drop
- [ ] 6 color options working
- [ ] Rate limiting prevents abuse
- [ ] RLS enforces permissions
- [ ] No console errors
- [ ] 60fps smooth scrolling
- [ ] WCAG AA accessibility compliance

---

## References

- **Supabase Realtime Docs:** https://supabase.com/docs/guides/realtime
- **@dnd-kit Docs:** https://dndkit.com/
- **Zod Validation:** https://zod.dev/
- **Design System:** `docs/DESIGN-SYSTEM.md`
- **Database Schema:** `docs/DATABASE-SCHEMA.md`

---

**Last Updated:** 2026-02-02
**Status:** ✅ Ready for Implementation
**Next Step:** Create feature branch `feature/sticky-notes-mvp` and begin Phase 1
