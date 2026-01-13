# FridayGT Design System & UI/UX Guidelines

**Last Updated:** 2026-01-14

## Table of Contents
1. [Design Principles](#design-principles)
2. [Layout Standards](#layout-standards)
3. [Typography](#typography)
4. [Colors](#colors)
5. [Components](#components)
6. [Page Patterns](#page-patterns)
7. [Common Inconsistencies](#common-inconsistencies)
8. [Accessibility](#accessibility)

---

## Design Principles

### Core Values
- **GT7 Racing Theme:** Dark, sleek, performance-focused aesthetic
- **Data-First:** Information density with clear hierarchy
- **Responsive:** Mobile-first approach, scales to desktop
- **Accessibility:** WCAG AA compliance minimum
- **Performance:** Fast load times, smooth transitions

### Visual Language
- **Primary Accent:** Blue/Purple gradient (racing tech feel)
- **Secondary Accent:** Destructive/Warning for "Tonight" live session
- **Borders:** Subtle with primary accent highlights
- **Shadows:** Minimal, flat design with hover states

---

## Layout Standards

### Container & Spacing
```tsx
// Standard page wrapper
<div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
  {/* Page content */}
</div>

// Narrow pages (forms, settings)
<div className="mx-auto max-w-md px-4 py-8 space-y-6">
  {/* Page content */}
</div>

// Wide pages (data tables)
<div className="mx-auto max-w-[1200px] px-4 py-8 space-y-6">
  {/* Page content */}
</div>
```

### Header Layout
```tsx
<header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background">
  <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>
  <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
    {/* Logo, nav, user menu */}
  </div>
</header>
```

### Page Header Pattern
```tsx
<div className="flex items-center justify-between gap-4 flex-wrap">
  <div className="space-y-1">
    <h1 className="text-3xl font-bold tracking-tight">PAGE TITLE</h1>
    <p className="text-muted-foreground font-mono text-sm">
      Secondary info or stats
    </p>
  </div>
  <Button>
    <Icon className="h-4 w-4 mr-2" />
    Primary Action
  </Button>
</div>
```

---

## Typography

### Heading Hierarchy
```tsx
// H1 - Page titles
<h1 className="text-3xl font-bold tracking-tight">

// H2 - Section headers
<h2 className="text-xl font-bold">

// H3 - Card titles
<h3 className="text-lg font-semibold">

// H4 - Subsection titles
<h4 className="text-base font-semibold">
```

### Text Styles
```tsx
// Body text
<p className="text-sm text-muted-foreground">

// Monospace text (data, stats, codes)
<p className="text-muted-foreground font-mono text-sm">

// Emphasized text
<span className="font-semibold">

// Labels
<Label>  // Uses shadcn Label component
```

### Text Colors
- **Primary:** `text-foreground`
- **Secondary:** `text-muted-foreground`
- **Accent:** `text-primary`
- **Destructive:** `text-destructive`
- **Links:** Inherit from navigation, hover to `text-primary`

---

## Colors

### Brand Colors
```tsx
// Primary (Blue accent)
bg-primary
text-primary
border-primary
hover:bg-primary/5
hover:border-primary/30

// Destructive (Red/Pink for Tonight & warnings)
bg-destructive
text-destructive
border-destructive/20

// Muted (Subtle backgrounds/foregrounds)
bg-muted
text-muted-foreground
bg-muted/30
```

### Border Standards
```tsx
// Default borders
border border-border

// Accent borders (hover states, focus)
border-primary/20
border-primary/30

// Status/functional borders
border-destructive/20  // Errors, warnings
border-accent/30       // Active states
```

---

## Components

### Buttons

#### Primary Action
```tsx
<Button>
  <Icon className="h-4 w-4 mr-2" />
  Button Text
</Button>
```

#### Secondary/Outline Action
```tsx
<Button variant="outline">
  <Icon className="h-4 w-4 mr-2" />
  Button Text
</Button>
```

#### Destructive Action
```tsx
<Button variant="destructive">
  <Icon className="h-4 w-4 mr-2" />
  Delete
</Button>
```

#### Ghost Action (Less prominent)
```tsx
<Button variant="ghost">
  <Icon className="h-4 w-4" />
</Button>
```

#### Icon Button (No text)
```tsx
<Button variant="ghost" size="icon">
  <Icon className="h-4 w-4" />
</Button>
```

#### Loading State
```tsx
<Button disabled>
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  Loading...
</Button>
```

### Cards & Containers
```tsx
// Standard card
<div className="border border-border rounded-lg p-6 space-y-4">

// Interactive card (hover effect)
<div className="border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors p-4">

// Full-width bordered row (lap times, runs)
<div className="w-full h-auto p-4 border border-border rounded-lg">

// Section container
<div className="border border-border rounded-lg p-6 space-y-4">
```

### Badges
```tsx
// Default badge
<Badge variant="default">Label</Badge>

// Outline badge
<Badge variant="outline">Label</Badge>

// Secondary badge
<Badge variant="secondary">Label</Badge>

// Custom badge with icon
<Badge variant="default" className="flex items-center gap-1">
  <Trophy className="h-3 w-3" />
  PB
</Badge>
```

### Dialogs
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Description text
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onConfirm}>
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Forms
```tsx
// Form layout
<form onSubmit={handleSubmit} className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="field">Field Name</Label>
    <Input
      id="field"
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Placeholder text"
      required
    />
    <p className="text-xs text-muted-foreground">
      Helper text
    </p>
  </div>
</form>
```

### Loading States
```tsx
// Full page loading
<LoadingSection text="Loading..." />

// Inline loading
<Loader2 className="h-4 w-4 animate-spin" />

// Button loading
<Button disabled>
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  Loading...
</Button>
```

### Tables & Lists
```tsx
// Table header row
<div className="flex items-center gap-3 text-xs text-muted-foreground font-mono uppercase">
  <span>COLUMN 1</span>
  <span>COLUMN 2</span>
  <span>COLUMN 3</span>
</div>

// Table row
<div className="border border-border rounded-lg p-4 flex items-center justify-between gap-4">
  {/* Content */}
</div>

// Stats overview
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <div className="border border-border rounded-lg p-4 bg-muted/30">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-mono uppercase">Label</span>
    </div>
    <p className="text-3xl font-bold text-accent">Value</p>
  </div>
</div>
```

---

## Page Patterns

### 1. Listing Page Pattern
**Used:** Tracks, Cars, Builds, Races, Lap Times, Run Lists

```tsx
<div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Icon className="h-8 w-8 text-primary" />
        TITLE
      </h1>
      <p className="text-muted-foreground mt-1">
        {count} items
      </p>
    </div>
    <Button asChild>
      <Link href="/new">
        <Plus className="h-4 w-4 mr-2" />
        Add New
      </Link>
    </Button>
  </div>

  {/* Search/Filter */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="pl-10"
    />
  </div>

  {/* Items */}
  {items.length === 0 ? (
    <EmptyState />
  ) : (
    <div className="space-y-3">
      {items.map(item => <ItemCard key={item.id} {...item} />)}
    </div>
  )}
</div>
```

### 2. Detail Page Pattern
**Used:** Track detail, Car detail, Build detail, Race detail

```tsx
<div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
  {/* Back button */}
  <Button variant="ghost" asChild>
    <Link href="..">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Link>
  </Button>

  {/* Header */}
  <div className="space-y-4">
    <h1 className="text-3xl font-bold">{name}</h1>
    <p className="text-muted-foreground">{description}</p>
  </div>

  {/* Content sections */}
  <div className="space-y-6">
    <Section>
      <h2 className="text-xl font-bold">Section Title</h2>
      {/* Section content */}
    </Section>
  </div>
</div>
```

### 3. Form Page Pattern
**Used:** Add lap time, create build, run list creation

```tsx
<div className="mx-auto max-w-md px-4 py-8">
  {/* Logo */}
  <div className="flex justify-center mb-6">
    <img src="/logo-fgt.png" alt="FridayGT" className="h-12 w-auto" />
  </div>

  {/* Header */}
  <div className="text-center space-y-2 mb-8">
    <h1 className="text-2xl font-bold">Form Title</h1>
    <p className="text-muted-foreground">Description</p>
  </div>

  {/* Form */}
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Form fields */}
  </form>
</div>
```

### 4. Empty State Pattern
```tsx
<div className="text-center py-12 border border-border rounded-lg">
  <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  <p className="text-muted-foreground text-lg">
    No items yet
  </p>
  <Button asChild className="mt-4">
    <Link href="/new">
      <Plus className="h-4 w-4 mr-2" />
      Add First Item
    </Link>
  </Button>
</div>
```

---

## Common Inconsistencies

### Known Issues to Fix

#### 1. Page Title Styling
**Inconsistent:** Some pages use icons in titles, some don't
**Standard:** Icons are encouraged for visual clarity
```tsx
// ✅ Good
<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
  <Icon className="h-8 w-8 text-primary" />
  Title
</h1>

// ❌ Avoid
<h1 className="text-3xl font-bold">Title</h1>
```

#### 2. Button Text Capitalization
**Inconsistent:** Mixed capitalization
**Standard:** Title Case for button labels
```tsx
// ✅ Good
<Button>Add Lap Time</Button>
<Button>Create Build</Button>

// ❌ Avoid
<Button>Add lap time</Button>
```

#### 3. Spacing in Button + Icons
**Inconsistent:** Some use `gap-2`, some use manual spacing
**Standard:** `mr-2` for icon before text
```tsx
// ✅ Good
<Button>
  <Icon className="h-4 w-4 mr-2" />
  Text
</Button>

// ❌ Avoid
<Button className="gap-2">
  <Icon className="h-4 w-4" />
  Text
</Button>
```

#### 4. Empty State Messaging
**Inconsistent:** Some use "No X", others use full sentences
**Standard:** Brief, clear messaging
```tsx
// ✅ Good
<p className="text-muted-foreground">No lap times recorded yet</p>

// ❌ Avoid
<p>You don't have any lap times. Try adding some!</p>
```

#### 5. Card Border Styles
**Inconsistent:** Mix of `rounded-lg` and `rounded-md`
**Standard:** `rounded-lg` for cards
```tsx
// ✅ Good
<div className="border border-border rounded-lg p-6">

// ❌ Avoid
<div className="border border-border rounded-md p-6">
```

#### 6. Loading Text
**Inconsistent:** "Loading..." vs "Loading data..."
**Standard:** Contextual loading messages
```tsx
// ✅ Good
<LoadingSection text="Loading tracks..." />

// ❌ Avoid
<LoadingSection text="Loading..." />
```

---

## Accessibility

### Required Standards

#### Alt Text
```tsx
// ✅ Good
<Image src="/logo.png" alt="FridayGT Logo" />

// ❌ Avoid
<Image src="/logo.png" alt="logo" />
```

#### Screen Reader Only Text
```tsx
<span className="sr-only">Hidden text for screen readers</span>
```

#### Button Labels
```tsx
// Icon buttons need labels
<Button>
  <Icon className="h-4 w-4" />
  <span className="sr-only">Button purpose</span>
</Button>
```

#### Form Labels
```tsx
// ✅ Good - Explicit labels
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />

// ❌ Avoid - Placeholder only
<Input placeholder="Email" />
```

#### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Focus states must be visible
- Tab order must be logical

#### Color Contrast
- Text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Minimum 3:1 contrast ratio

---

## Icon Usage

### Common Icons & Their Meanings
- `Plus` - Add new item
- `Trash2` - Delete
- `Edit` - Edit/modify
- `ArrowLeft` - Back/return
- `Search` - Search
- `Filter` - Filter
- `Clock` - Lap times, timing
- `Trophy` - Personal best, leaderboard
- `Settings` - Settings
- `User` - User profile
- `LogOut` - Sign out
- `Moon/Sun` - Theme toggle
- `Menu` - Mobile navigation
- `Radio` - Live session indicator ("Tonight")
- `Wrench` - Car build
- `Loader2` - Loading state (animate with `animate-spin`)

### Icon Sizes
```tsx
// Small (inline with text)
<Icon className="h-3 w-3" />

// Default (buttons, labels)
<Icon className="h-4 w-4" />

// Large (page headers, empty states)
<Icon className="h-8 w-8" />

// Extra large (hero)
<Icon className="h-12 w-12" />
```

---

## Responsive Design

### Breakpoints
- `sm:` 640px - Small screens
- `md:` 768px - Medium screens (tablets)
- `lg:` 1024px - Large screens (laptops)
- `xl:` 1280px - Extra large screens

### Responsive Patterns
```tsx
// Hide/show elements
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive spacing
<div className="flex flex-col sm:flex-row gap-4">

// Responsive text
<h1 className="text-2xl sm:text-3xl font-bold">
```

---

## Animation & Transitions

### Standard Transitions
```tsx
// Hover effects
className="hover:bg-primary/5 transition-colors"
className="hover:border-primary/30 transition-colors"

// Icon rotation
className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
```

### Loading Animation
```tsx
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## File Naming & Organization

### Page Components
- Location: `src/app/[route]/page.tsx`
- Export: `default function ComponentName()`

### Shared Components
- Location: `src/components/ui/` (shadcn)
- Location: `src/components/` (custom)

### API Routes
- Location: `src/app/api/[route]/route.ts`
- Export: Named exports (`GET`, `POST`, `PATCH`, `DELETE`)

---

## Code Style

### Imports Order
```tsx
// 1. React
import { useState, useEffect } from 'react'

// 2. Next.js
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 3. Components
import { Button } from '@/components/ui/button'
import { Icon } from 'lucide-react'

// 4. Lib
import { formatLapTime } from '@/lib/time'
```

### Component Structure
```tsx
// 1. Imports
// 2. Interfaces/Types
// 3. Component function
// 4. Hooks (useState, useEffect, etc.)
// 5. Derived values/event handlers
// 6. Early returns (loading, error states)
// 7. Main render
//   - Conditional renders at top
//   - Main content
//   - Dialogs/modals at bottom
```

---

## Checklist for New Pages

### Before Starting
- [ ] Determine page type (listing, detail, form)
- [ ] Review similar existing pages
- [ ] Choose appropriate pattern from this guide

### During Development
- [ ] Use standard container (`max-w-7xl px-4 py-8`)
- [ ] Follow header pattern with icon
- [ ] Add loading states
- [ ] Add empty states
- [ ] Include error handling
- [ ] Make responsive (mobile-first)
- [ ] Add accessibility features

### Before Committing
- [ ] Test on mobile viewport
- [ ] Test all interactive elements
- [ ] Check color contrast
- [ ] Test keyboard navigation
- [ ] Verify no console errors
- [ ] Check loading states work
- [ ] Test empty states
- [ ] Verify consistent styling

---

## Notes

### Tailwind Config
All utilities use Tailwind CSS with shadcn/ui component library.

### Theme
- Supports light/dark mode via `next-themes`
- Default theme: dark
- Accent color: Blue/purple gradient
- Destructive color: Red/pink (for "Tonight" and errors)

### GT7 Theme Reference
The design draws inspiration from GT7's UI:
- Dark backgrounds
- Blue/purple accent colors
- Clean typography
- Data-dense displays
- Smooth animations
