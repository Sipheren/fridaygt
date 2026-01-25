# Tonight Page Race Reordering Plan

## Overview
Allow users to drag and reorder races on the Tonight page, with mobile-first touch interactions and persistent ordering.

---

## 1. Database Changes

**Add `order` field to `Race` table:**
```sql
ALTER TABLE "Race" ADD COLUMN "order" INTEGER;
```

- Default value: `createdAt` timestamp (for existing races)
- Unique constraint: Not needed (allows flexible ordering)
- Index: Add index on `order` for efficient queries

**Migration strategy:**
```javascript
// Set initial order based on creation date for existing races
UPDATE "Race" SET "order" = EXTRACT(EPOCH FROM "createdAt")::INTEGER;
```

---

## 2. API Changes

**GET /api/races?isActive=true**
- Add `ORDER BY "order" ASC, "createdAt" ASC`

**PATCH /api/races/reorder**
```typescript
body: {
  raceIds: string[] // New order of race IDs
}
```
- Updates `order` field based on array position
- Uses service role for authorization
- Returns updated races list

---

## 3. Frontend Implementation

**Library choice: `@dnd-kit/core` + `@dnd-kit/sortable`**
- Modern, actively maintained
- Excellent mobile touch support
- Smooth 60fps animations
- Lightweight (~15kb gzipped)
- Better accessibility than alternatives

**Components to create:**

1. **`SortableRaceCard`** - Wrapper for race cards with drag functionality
2. **`DragHandle`** - Touch-friendly grab handle component
3. **`TonightRaceList`** - Manages sortable state and API calls

---

## 4. Mobile-First UX Design

**Drag Handle:**
- Size: 44px × 44px (WCAG minimum touch target)
- Icon: `GripVertical` from lucide-react (6 horizontal lines)
- Position: Right side of card (natural thumb position)
- Visual feedback: Scale up slightly on touch

**Touch Interactions:**
- Long-press to activate drag mode (prevents accidental drags)
- Haptic feedback (vibration) when drag starts
- Visual cue: Card elevates (shadow, scale) when dragging
- Opacity: 0.8 for card being dragged, 0.4 for original placeholder

**Visual Feedback:**
- Dragging card: `shadow-lg`, `scale-105`, `z-50`
- Other cards: Smooth animation to make room
- Drop indicator: Highlighted gap where card will land

**Performance:**
- Use `useVirtualizer` if list grows beyond ~20 races
- Optimistic UI updates (instant reordering, save in background)
- Debounce API calls during rapid reordering

---

## 5. UI Layout

**Race Card Structure:**
```
┌─────────────────────────────────────────┐
│ ← Back    TONIGHT              ☰ Menu  │
├─────────────────────────────────────────┤
│ ⚡ LIVE (2 Active Races)                │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Race 1              ⋮⋮ (drag handle)│ │
│ │ Track info...                        │ │
│ │ Builds...                             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Race 2              ⋮⋮ (drag handle)│ │
│ │ Track info...                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 6. Implementation Steps

1. **Database migration** - Add `order` column
2. **API endpoint** - Create reorder endpoint
3. **Install dependencies** - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
4. **Create components**:
   - `DragHandle` component
   - `SortableRaceCard` wrapper
   - Reorder logic with optimistic updates
5. **Update Tonight page** - Integrate sortable list
6. **Test on mobile** - Ensure touch interactions work smoothly
7. **Add loading states** - Show feedback during save operations
8. **Error handling** - Rollback on API failure

---

## 7. Accessibility

- Keyboard navigation support (optional for mobile-first)
- Screen reader announcements: "Race moved to position 2"
- Focus management during drag operations
- ARIA labels for drag handles

---

## 8. Edge Cases

- What happens when a race is deactivated/activated?
  - Keep its position in the order
- What happens when a new race is created?
  - Add to end of list (max order + 1)
- What happens when a race is deleted?
  - Remove from order, don't renumber others
- What if two races have the same order?
  - Use `createdAt` as secondary sort

---

## 9. Files to Modify/Create

**New files:**
- `src/components/ui/sortable-race-card.tsx`
- `src/components/ui/drag-handle.tsx`

**Modify:**
- `src/app/tonight/page.tsx` - Add sortable functionality
- `src/app/api/races/reorder/route.ts` - New API endpoint
- `migrations/` - Database migration SQL

---

## 10. Alternative Approaches Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **react-beautiful-dnd** | Mature, widely used | No longer maintained | ❌ Not chosen |
| **@dnd-kit/core** | Modern, maintained, great mobile | More setup | ✅ **Chosen** |
| **Native HTML5** | No dependencies | Poor mobile support | ❌ Not chosen |
| **Up/Down buttons** | Simple, accessible | Tedious for many items | ❌ Not chosen (bad UX) |

---

## 11. Success Criteria

- ✅ Races can be reordered with touch drag
- ✅ Order is saved and persists across sessions
- ✅ Smooth 60fps animations on mobile devices
- ✅ Clear visual feedback during drag operations
- ✅ No accidental drags (long-press to activate)
- ✅ Optimistic UI updates (instant, save in background)
- ✅ Graceful error handling with rollback on failure
