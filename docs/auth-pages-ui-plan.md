# Auth Pages UI/UX Alignment Plan

## Overview
Fix the authentication pages to align with the FridayGT site design system, adding the missing logo and creating a consistent visual experience across all auth flows.

## Current Issues

### 1. Missing Logo
**Location:** All auth pages
- `/auth/signin` - Has text "FridayGT" but no logo image
- `/auth/complete-profile` - No logo at all
- `/auth/verify-request` - No logo at all
- `/auth/error` - No logo at all

### 2. Inconsistent Styling on complete-profile Page
**Location:** `/src/app/auth/complete-profile/page.tsx`

**Problems:**
- Uses raw HTML elements instead of shadcn/ui components
- Inconsistent color scheme:
  - Background: `bg-gray-50 dark:bg-gray-900` (should use `bg-background`)
  - Card: `bg-white dark:bg-gray-800` (should use `bg-card`)
  - Button: `bg-blue-600 hover:bg-blue-700` (should use `bg-primary`)
  - Input: Custom styles instead of shadcn Input component
- Missing design elements:
  - No top accent bar (`bg-primary` border)
  - No Logo
  - Inconsistent spacing and typography
- Uses direct Tailwind classes instead of theme variables

## Design System Reference

### Site Header Components
From `/src/components/header.tsx`:
- **Logo:** `/logo-fgt.png` (600x196px, displayed at h-10)
- **Accent bar:** Top border with `bg-primary` (`h-0.5`)
- **Color scheme:**
  - Primary accent color
  - Background and card from theme
  - Muted foreground for secondary text

### Auth Page Pattern (from signin page)
```tsx
<div className="flex min-h-screen items-center justify-center bg-background">
  <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 relative">
    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

    {/* Logo + Title */}
    <div className="text-center space-y-2">
      {/* Logo should go here */}
      <h1 className="text-3xl font-bold tracking-tight text-primary">FridayGT</h1>
      <p className="text-muted-foreground">Subtitle text</p>
    </div>

    {/* Form content */}
  </div>
</div>
```

## Implementation Plan

### Phase 1: Add Logo to All Auth Pages

#### Files to Update:
1. `/src/app/auth/signin/page.tsx`
2. `/src/app/auth/complete-profile/page.tsx`
3. `/src/app/auth/verify-request/page.tsx`
4. `/src/app/auth/error/page.tsx`

#### Logo Implementation:
```tsx
import Image from 'next/image'
import Link from 'next/link'

// Inside the card, before the title:
<Link href="/" className="flex justify-center">
  <Image
    src="/logo-fgt.png"
    alt="FridayGT"
    width={600}
    height={196}
    className="h-12 w-auto"
    priority
    unoptimized
  />
</Link>
```

**Placement:** Between the top accent bar and the title text.

**Logo sizing:**
- Height: `h-12` (slightly larger than header's h-10 for prominence)
- Width: `w-auto` (maintain aspect ratio)
- Alt text: "FridayGT"
- Link to home page for easy navigation

### Phase 2: Fix complete-profile Page Styling

#### Issues to Fix:

1. **Replace custom input with shadcn Input component**
   ```tsx
   import { Input } from '@/components/ui/input'
   import { Label } from '@/components/ui/label'

   // Replace:
   <input className="mt-1 block w-full rounded-md border..." />

   // With:
   <div className="space-y-2">
     <Label htmlFor="gamertag">Gamertag / Username</Label>
     <Input
       id="gamertag"
       type="text"
       required
       value={gamertag}
       onChange={(e) => setGamertag(e.target.value)}
       placeholder="YourGamertag"
       minLength={3}
       maxLength={20}
     />
     <p className="text-xs text-muted-foreground">
       3-20 characters. Letters, numbers, hyphens, and underscores only.
     </p>
   </div>
   ```

2. **Replace custom button with shadcn Button component**
   ```tsx
   import { Button } from '@/components/ui/button'

   // Replace:
   <button className="w-full rounded-md bg-blue-600..." />

   // With:
   <Button type="submit" disabled={isLoading} className="w-full">
     {isLoading ? 'Saving...' : 'Continue'}
   </Button>
   ```

3. **Fix background and card colors**
   ```tsx
   // Replace:
   <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
     <div className="w-full max-w-md space-y-8 rounded-lg bg-white dark:bg-gray-800 p-8 shadow">

   // With:
   <div className="flex min-h-screen items-center justify-center bg-background">
     <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 relative">
       <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>
   ```

4. **Fix error message styling**
   ```tsx
   // Replace:
   <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">

   // With:
   <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
   ```

5. **Fix loading state styling**
   ```tsx
   // Replace:
   <div className="text-gray-600">Loading...</div>

   // With:
   <div className="text-muted-foreground">Loading...</div>
   ```

6. **Add top accent bar** (missing from complete-profile)
   ```tsx
   <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>
   ```

7. **Update typography to use theme colors**
   ```tsx
   // Replace all instances of:
   - text-gray-600 → text-muted-foreground
   - dark:text-gray-400 → remove (use theme defaults)
   - dark:text-gray-300 → remove (use theme defaults)
   - dark:text-white → remove (use theme defaults)
   ```

### Phase 3: Enhance Visual Hierarchy

#### Add Icon to complete-profile Page
Add a game controller or user icon above the logo or title:
```tsx
import { Gamepad2 } from 'lucide-react'

<div className="flex justify-center">
  <Gamepad2 className="h-12 w-12 text-primary mb-4" />
</div>
```

#### Improve Error Page
Add helpful error message context:
```tsx
<p className="text-sm text-muted-foreground mt-2">
  Error code may have expired. Please try signing in again.
</p>
```

## Updated File Structure

### `/src/app/auth/signin/page.tsx`
```tsx
// ADD: Image and Link imports
import Image from 'next/image'
import Link from 'next/link'

// MODIFY: Add logo after accent bar
<div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

<div className="flex justify-center">
  <Link href="/">
    <Image
      src="/logo-fgt.png"
      alt="FridayGT"
      width={600}
      height={196}
      className="h-12 w-auto"
      priority
      unoptimized
    />
  </Link>
</div>

<h1 className="text-2xl font-bold tracking-tight text-primary mt-4">Sign In</h1>
```

### `/src/app/auth/complete-profile/page.tsx`
```tsx
// ADD: Component imports
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Gamepad2 } from 'lucide-react'

// REPLACE: Entire card structure with shadcn components
<div className="flex min-h-screen items-center justify-center bg-background">
  <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 relative">
    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

    {/* Logo */}
    <div className="flex justify-center pt-4">
      <Link href="/">
        <Image
          src="/logo-fgt.png"
          alt="FridayGT"
          width={600}
          height={196}
          className="h-12 w-auto"
          priority
          unoptimized
        />
      </Link>
    </div>

    {/* Icon */}
    <div className="flex justify-center">
      <Gamepad2 className="h-10 w-10 text-primary" />
    </div>

    {/* Title */}
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Complete Your Profile</h1>
      <p className="text-muted-foreground">
        Choose a gamertag that will be visible on leaderboards
      </p>
    </div>

    {/* Form with shadcn components */}
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="gamertag">Gamertag / Username</Label>
        <Input
          id="gamertag"
          type="text"
          required
          value={gamertag}
          onChange={(e) => setGamertag(e.target.value)}
          placeholder="YourGamertag"
          minLength={3}
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground">
          3-20 characters. Letters, numbers, hyphens, and underscores only.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Continue'}
      </Button>
    </form>

    {/* Footer text */}
    <p className="text-center text-sm text-muted-foreground">
      Your gamertag will be shown on public leaderboards and race sessions.
      Your email and real name remain private.
    </p>
  </div>
</div>
```

### `/src/app/auth/verify-request/page.tsx`
```tsx
// ADD: Image and Link imports
import Image from 'next/image'
import Link from 'next/link'

// MODIFY: Add logo after accent bar
<div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

<div className="flex justify-center pt-4">
  <Link href="/">
    <Image
      src="/logo-fgt.png"
      alt="FridayGT"
      width={600}
      height={196}
      className="h-12 w-auto"
      priority
      unoptimized
    />
  </Link>
</div>

<CheckCircle className="h-16 w-16 text-primary mt-4" />
```

### `/src/app/auth/error/page.tsx`
```tsx
// ADD: Image and Link imports
import Image from 'next/image'
import Link from 'next/link'

// MODIFY: Add logo after accent bar
<div className="absolute inset-x-0 top-0 h-0.5 bg-destructive"></div>

<div className="flex justify-center pt-4">
  <Link href="/">
    <Image
      src="/logo-fgt.png"
      alt="FridayGT"
      width={600}
      height={196}
      className="h-12 w-auto"
      priority
      unoptimized
    />
  </Link>
</div>

<AlertCircle className="h-16 w-16 text-destructive mt-4" />
```

## Testing Checklist

After implementation, verify:

### Visual Consistency
- [ ] Logo appears on all 4 auth pages
- [ ] Logo links to home page
- [ ] Logo is centered and properly sized
- [ ] Top accent bar appears on all pages
- [ ] Primary accent color is consistent
- [ ] Card backgrounds use theme colors (bg-card, bg-background)
- [ ] Text uses theme colors (text-foreground, text-muted-foreground)
- [ ] Buttons use shadcn Button component with proper styling
- [ ] Inputs use shadcn Input component with proper styling
- [ ] Error messages use destructive color scheme

### Responsive Design
- [ ] Pages work on mobile (320px+)
- [ ] Pages work on tablet (768px+)
- [ ] Pages work on desktop (1024px+)
- [ ] Logo scales appropriately
- [ ] Form elements don't overflow

### Theme Support
- [ ] Dark mode looks correct
- [ ] Light mode looks correct
- [ ] Theme toggle works (if accessible)

### Functionality
- [ ] Sign in flow works
- [ ] Email verification request shows
- [ ] Complete profile form validates correctly
- [ ] Error page navigates back to sign in
- [ ] All links work correctly

### Accessibility
- [ ] Logo has proper alt text
- [ ] All forms have proper labels
- [ ] Error messages are accessible
- [ ] Keyboard navigation works
- [ ] Focus states are visible

## Benefits

1. **Brand Consistency**: Logo appears on all pages, reinforcing brand identity
2. **Professional Appearance**: Consistent design system across all auth flows
3. **Better UX**: Users recognize they're on the correct site
4. **Theme Consistency**: All pages respect dark/light theme properly
5. **Component Reusability**: Using shadcn components ensures future consistency
6. **Maintainability**: Standardized patterns make updates easier

## Implementation Order

1. **Step 1**: Update signin page (add logo, keep existing structure)
2. **Step 2**: Update verify-request page (add logo)
3. **Step 3**: Update error page (add logo)
4. **Step 4**: Complete refactor of complete-profile page (most complex)
5. **Step 5**: Test all pages in both themes
6. **Step 6**: Test responsive design

## Estimated Time

- Phase 1 (Logo on all pages): 30 minutes
- Phase 2 (complete-profile refactor): 45 minutes
- Phase 3 (Enhancements): 15 minutes
- Testing: 30 minutes

**Total: ~2 hours**
