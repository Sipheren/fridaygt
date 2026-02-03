# Sticky Notes Visual Redesign - Implementation Plan

## Overview
Create a new `StickyNoteCard` component with Apple Notes clean style, while keeping the existing `NoteCard` unchanged for easy fallback.

**Status:** Ready for Implementation
**Priority:** Medium
**Target Version:** v2.22.0
**Branch:** `feature/notes-sticky-visual-redesign`
**Last Updated:** 2026-02-03

---

## Background

The original Sticky Notes Board (v2.21.0) was successfully implemented with:
- Database & API layer (Note table, 4 endpoints, RLS)
- Supabase Realtime sync
- 6 UI components (NoteCard, ColorWheel, NotesBoard, etc.)
- Inline editing, 6-color picker, filtering
- Mobile-first responsive grid

This plan adds a **visual redesign** with Apple Notes aesthetic while preserving all existing functionality.

---

## Component Architecture

```
src/components/notes/
├── note-card.tsx           ← EXISTING (unchanged - backup)
├── sticky-note-card.tsx    ← NEW (Apple Notes style)
└── notes-board.tsx         ← MODIFY (add dev toggle)
```

---

## New Component Specifications

### File: `src/components/notes/sticky-note-card.tsx`

**Props Interface:** Identical to `NoteCard` for drop-in compatibility
```tsx
interface StickyNoteCardProps {
  note: DbNote & {
    user?: {
      id: string
      name?: string | null
      gamertag?: string | null
    } | null
  }
  currentUserId?: string
  isAdmin?: boolean
  isSelected?: boolean
  onSelect?: (noteId: string) => void
  onDeselect?: () => void
  onDelete?: (noteId: string) => void
  onUpdate?: (noteId: string, data: { title?: string; content?: string; color?: string }) => void
  onColorPick?: (noteId: string, button: HTMLButtonElement) => void
  isPending?: boolean
}
```

**Visual Features (Apple Notes Style - Clean):**

| Feature | Specification |
|---------|---------------|
| **Paper texture** | Subtle CSS noise pattern, 3% opacity, `mix-blend-mode: overlay` |
| **Curling corner** | **None** - Apple Notes is clean/flat |
| **Shadows** | Soft, diffuse (no hard edges) - `box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)` |
| **Pin/tack** | **Yes** - Pushpin at top-center (red round head + silver needle) |
| **Rotation** | **Yes** - Random -2° to +2° based on note ID (deterministic) |
| **Colors** | Muted/paper-like (current colors but slightly desaturated) |
| **Corners** | `rounded-lg` (gentler than current `rounded-xl`) |
| **Border** | Very subtle `border-foreground/5` or none |

---

## Visual Design Details

### Pin Design (Top-Center)

```
     ●      ← Red pushpin head (8px circle, #EF4444)
     |      ← Silver needle (2px wide, 8px tall, #9CA3AF)
   ┌─────┐  ← Note body (pin sits above, note overlaps from below)
```

**CSS Implementation:**
```tsx
<div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
  {/* Pin head */}
  <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
  {/* Pin needle */}
  <div className="w-0.5 h-2 bg-gray-400 mx-auto rounded-b-full" />
</div>
```

### Rotation Implementation

Deterministic rotation based on note ID (same note always has same rotation):

```tsx
const rotation = useMemo(() => {
  // Generate hash from note ID for consistent rotation
  const hash = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  // Convert to -20 to +20 range, then divide by 10 for -2° to +2°
  const degrees = (hash % 41) - 20
  return `rotate(${degrees / 10}deg)`
}, [note.id])

// Applied to note wrapper:
<div style={{ transform: rotation }} className="origin-top-left">
```

### Enhanced Color Palette

Apple Notes uses slightly more muted, paper-like colors:

```tsx
const STICKY_NOTE_COLORS = {
  '#fef08a': 'bg-yellow-100/95 dark:bg-yellow-900/20',  // Legal pad yellow
  '#fbcfe8': 'bg-pink-100/95 dark:bg-pink-900/20',
  '#bfdbfe': 'bg-blue-100/95 dark:bg-blue-900/20',
  '#bbf7d0': 'bg-green-100/95 dark:bg-green-900/20',
  '#e9d5ff': 'bg-purple-100/95 dark:bg-purple-900/20',
  '#fed7aa': 'bg-orange-100/95 dark:bg-orange-900/20',
}
```

---

## Dev Toggle Implementation

### File: `src/components/notes/notes-board.tsx`

Add simple boolean flag at top of component:

```tsx
// DEV ONLY: Toggle between classic and sticky note styles
const USE_STICKY_STYLE = true  // ← Change this to false for classic style
```

Import the new component:
```tsx
import { NoteCard } from './note-card'
import { StickyNoteCard } from './sticky-note-card'  // NEW
```

Render conditionally:
```tsx
{USE_STICKY_STYLE ? (
  <StickyNoteCard
    key={note.id}
    note={noteWithUser}
    currentUserId={currentUserId}
    isAdmin={isAdmin}
    isSelected={selectedNoteId === note.id}
    onSelect={handleSelectNote}
    onDeselect={handleDeselectNote}
    onDelete={handleDeleteNote}
    onUpdate={handleUpdateNote}
    onColorPick={handleColorPick}
    isPending={pendingNoteId === note.id}
  />
) : (
  <NoteCard
    key={note.id}
    note={noteWithUser}
    currentUserId={currentUserId}
    isAdmin={isAdmin}
    isSelected={selectedNoteId === note.id}
    onSelect={handleSelectNote}
    onDeselect={handleDeselectNote}
    onDelete={handleDeleteNote}
    onUpdate={handleUpdateNote}
    onColorPick={handleColorPick}
    isPending={pendingNoteId === note.id}
  />
)}
```

---

## CSS Additions (globals.css)

### Paper Texture Pattern

```css
@layer components {
  /* Subtle paper grain for sticky notes */
  .sticky-note-texture {
    position: relative;
  }

  .sticky-note-texture::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.03;
    mix-blend-mode: overlay;
    pointer-events: none;
    border-radius: inherit;
  }
}
```

---

## Files to Create/Modify

| Action | File | Lines Est. | Description |
|--------|------|------------|-------------|
| **CREATE** | `src/components/notes/sticky-note-card.tsx` | ~400 lines | New Apple Notes style component |
| **MODIFY** | `src/components/notes/notes-board.tsx` | +10 lines | Dev toggle + import |
| **MODIFY** | `src/app/globals.css` | +20 lines | Paper texture CSS |
| **KEEP** | `src/components/notes/note-card.tsx` | 0 changes | Preserved as backup |

---

## Visual Comparison

```
┌────────────────────────────────────────────────────────────────┐
│                    CLASSIC (NoteCard)                         │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Note Title   │  │ Note Title   │  │ Note Title   │         │
│  │              │  │              │  │              │         │
│  │ Content...   │  │ Content...   │  │ Content...   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  (All aligned, uniform, rounded-xl corners, multi-shadow)     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                 STICKY (StickyNoteCard)                       │
├────────────────────────────────────────────────────────────────┤
│    ●           ●           ●                                  │
│    |           |           |                                  │
│  ┌────╱      ╱────┐    ┌─────╲      ╲────┐                   │
│  │ Note│    │Note │    │ Note│      │Note │                   │
│  │Title│    │Title│    │Title│      │Title│                   │
│  │     │    │     │    │     │      │     │                   │
│  │Cont.│    │Cont.│    │Cont.│      │Cont.│                   │
│  └─────┘    └─────┘    └─────┘      └─────┘                   │
│  (Subtle rotation, pin at top, paper texture, soft shadows)   │
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create StickyNoteCard Component
- Copy NoteCard structure as base
- Replace styling classes with Apple Notes style
- Add paper texture CSS class
- Add rotation logic
- Add pin element
- Test all interactions (edit, delete, color picker, tags)

### Step 2: Add Paper Texture CSS
- Add `.sticky-note-texture` class to globals.css
- Include SVG noise pattern as data URI
- Test opacity and blend mode

### Step 3: Integrate Dev Toggle
- Add `USE_STICKY_STYLE` flag to notes-board.tsx
- Import StickyNoteCard component
- Add conditional rendering
- Test both styles by toggling flag

### Step 4: Testing & Refinement
- Verify all features work in both styles
- Check mobile responsiveness
- Test rotation consistency
- Verify pin positioning
- Test color picker integration
- Test saving/editing flow

### Step 5: Decision Point
After testing, choose one:
- **A.** Keep sticky only → Replace NoteCard with StickyNoteCard
- **B.** Keep classic only → Delete StickyNoteCard, revert changes
- **C.** Keep both → Add user preference toggle for production

---

## Acceptance Criteria

After implementation, verify:

### Functionality
- [ ] Both styles render correctly when toggling `USE_STICKY_STYLE`
- [ ] All existing features work (edit, delete, color picker, tags)
- [ ] Inline editing saves correctly
- [ ] Delete confirmation dialog works
- [ ] Color picker opens and saves
- [ ] Real-time sync works with both styles

### Visual
- [ ] Sticky notes have pin at top-center
- [ ] Each note has unique, consistent rotation (same on re-render)
- [ ] Paper texture is visible but subtle
- [ ] Shadows are soft/diffuse (no hard edges)
- [ ] Colors are muted/paper-like

### Responsive
- [ ] Mobile layout works (vertical list)
- [ ] Desktop layout works (responsive grid)
- [ ] Pin doesn't overlap content on small screens
- [ ] Touch targets remain 44px minimum

---

## Rollback Plan

If the new style doesn't work out:
1. Set `USE_STICKY_STYLE = false` in notes-board.tsx
2. Delete `src/components/notes/sticky-note-card.tsx`
3. Remove import from notes-board.tsx
4. Remove `.sticky-note-texture` CSS from globals.css
5. Existing NoteCard continues working unchanged

---

## Summary

| Item | Decision |
|------|----------|
| **Style** | Apple Notes clean (flat, soft shadows) |
| **Pin** | Yes, top-center red pushpin |
| **Rotation** | Yes, -2° to +2° deterministic |
| **Texture** | Subtle paper grain (3% opacity) |
| **Toggle** | Dev boolean flag (`USE_STICKY_STYLE`) |
| **Current code** | Preserved unchanged in `NoteCard.tsx` |

---

## Related Documents

- **Original Notes Plan:** `docs/.archived/NOTES-BOARD-PLAN.md` (archived after v2.21.0 completion)
- **Database Schema:** `docs/DATABASE-SCHEMA.md` (Note table definition)
- **Design System:** `docs/DESIGN-SYSTEM.md` (UI/UX guidelines)
