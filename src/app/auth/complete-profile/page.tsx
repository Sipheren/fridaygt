/**
 * Complete Profile Page
 *
 * Purpose: Profile completion page for setting gamertag after approval
 * - Required step for new approved users
 * - Gamertag/username input for leaderboards
 * - Validation: Length, characters allowed, uniqueness
 * - Redirects to home after completion
 *
 * **Key Features:**
 * - Gamertag input: Required for leaderboard display
 * - Validation: 3-20 chars, alphanumeric + hyphens/underscores
 * - Uniqueness check: API validates gamertag is unique
 * - Auto-redirect: Redirects to home if already has gamertag
 * - Loading states: "Saving..." during API call
 * - Error display: Shows validation/API errors
 *
 * **Access Control:**
 * - Authenticated only: Redirects to sign-in if not logged in
 * - Gamertag check: Redirects to home if already has gamertag
 * - Session check: Uses NextAuth useSession() hook
 * - Role check: Any authenticated user can access
 *
 * **Gamertag Validation:**
 * - Length: 3-20 characters (minLength, maxLength props)
 * - Characters: Letters, numbers, hyphens, underscores only
 * - Pattern: /^[a-zA-Z0-9_-]+$/ (regex validation)
 * - Unique: API checks for duplicates
 * - Required: User cannot skip this step
 *
 * **State Management:**
 * - gamertag: User input state
 * - isLoading: Loading state during API call
 * - error: Error message from validation or API
 * - session: NextAuth session (user, status, update)
 *
 * **API Integration:**
 * - Endpoint: PATCH /api/user/profile
 * - Request body: { gamertag: string }
 * - Response: Updated user object
 * - Error: { error: string } (validation error, duplicate, etc.)
 * - Success: Redirects to home page
 *
 * **Redirect Logic:**
 * - Unauthenticated: Redirect to /auth/signin
 * - Has gamertag: Redirect to / (home)
 * - After save: Redirect to / (home)
 * - Session refresh: Happens naturally on next page
 *
 * **Loading States:**
 * - Session loading: "Loading..." text
 * - API call: "Saving..." on button
 * - Button disabled: During API call
 *
 * **Error Handling:**
 * - Validation errors: Shown in error box
 * - API errors: Response error message
 * - Network errors: Console logged
 * - User stays: Can retry after error
 *
 * **Page Layout:**
 * - Centered card: max-w-md (448px) centered horizontally
 * - Primary bar: Colored bar at top (h-0.5 bg-primary)
 * - Logo: FridayGT logo linking to home
 * - Icon: Gamepad2 icon (gaming context)
 * - Form: Gamertag input with submit button
 *
 * **Privacy Note:**
 * - Gamertag: Public (shown on leaderboards)
 * - Email: Private (never displayed)
 * - Real name: Private (never displayed)
 * - Explained: Footer message clarifies privacy
 *
 * **Styling:**
 * - Card: Bordered container with shadow
 * - Primary bar: Colored strip at top
 * - Logo: Centered, links to home
 * - Error box: Destructive colors for errors
 * - Button: Full width, disabled during loading
 *
 * **Accessibility:**
 * - Required field: HTML5 required attribute
 * - Auto-focus: autoFocus on gamertag input
 * - Error display: Clear error messages
 * - Keyboard: Enter key submits form
 *
 * **Debugging Tips:**
 * - Not redirecting: Check session status and gamertag check
 * - Validation failing: Check regex pattern and length checks
 * - API error: Check /api/user/profile endpoint
 * - Duplicate gamertag: Check database for existing gamertag
 * - Session not updating: Check NextAuth configuration
 *
 * **Common Issues:**
 * - Already has gamertag: Should redirect to home
 * - Not authenticated: Should redirect to sign-in
 * - Gamertag taken: API returns error, shows in error box
 * - Validation not working: Check regex pattern
 *
 * **Related Files:**
 * - @/app/auth/signin/page.tsx: Sign-in page
 * - @/app/auth/pending/page.tsx: Pending approval page
 * - @/app/auth/error/page.tsx: Authentication error page
 * - @/app/api/user/profile/route.ts: Profile update API
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Gamepad2 } from 'lucide-react'

export default function CompleteProfilePage() {
  // ============================================================
  // STATE
  // ============================================================
  // - session: NextAuth session (user, status, update)
  // - router: Next.js router for navigation
  // - gamertag: User input for gamertag
  // - isLoading: Loading state during API call
  // - error: Error message from validation or API
  //
  // Why useSession?
  // - Check authentication status
  // - Get user data (email, name, gamertag)
  // - Redirect based on auth state
  //
  // Why router?
  // - Programmatic navigation
  // - Redirect to home after save
  // - Redirect to sign-in if not authenticated
  // ============================================================

  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [gamertag, setGamertag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // ============================================================
  // REDIRECT CHECKS
  // ============================================================
  // Redirect if user already has a gamertag
  // - Prevents accessing this page unnecessarily
  // - User should go directly to home
  // - Runs on mount and when session changes
  //
  // Why redirect?
  // - Gamertag already set: No need to set again
  // - Better UX: Skip unnecessary step
  // - Prevents confusion: Clear flow
  //
  // Debugging Tips:
  // - Not redirecting: Check session.user.gamertag is truthy
  // - Redirect loop: Check router.push is called correctly
  // ============================================================

  useEffect(() => {
    // Redirect if user already has a gamertag
    if (session?.user && (session.user as any).gamertag) {
      router.push('/')
    }
  }, [session, router])

  // ============================================================
  // FORM SUBMISSION
  // ============================================================
  // Handle profile completion form submission
  // - Validates gamertag (length, characters)
  // - Calls PATCH /api/user/profile API
  // - Redirects to home on success
  // - Shows error on failure
  //
  // Validation rules:
  // - Length: 3-20 characters
  // - Characters: Letters, numbers, hyphens, underscores only
  // - Pattern: /^[a-zA-Z0-9_-]+$/
  //
  // Why client-side validation?
  // - Instant feedback: No API call needed
  // - Better UX: User knows immediately
  // - Reduces load: Fewer API calls
  // - Double-check: Server also validates
  //
  // Error handling:
  // - Validation errors: Show in error box
  // - API errors: Response error message
  // - Network errors: Console logged
  // - User stays: Can retry after error
  //
  // Redirect after save:
  // - Immediate: Don't wait for session refresh
  // - Next page: Session refreshes naturally
  // - Better UX: Faster experience
  //
  // Debugging Tips:
  // - Validation not working: Check regex pattern
  // - API failing: Check endpoint and request body
  // - Not redirecting: Check router.push is called
  // - Error not showing: Check error state is set
  // ============================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validate gamertag length
    if (gamertag.length < 3) {
      setError('Gamertag must be at least 3 characters')
      setIsLoading(false)
      return
    }

    if (gamertag.length > 20) {
      setError('Gamertag must be less than 20 characters')
      setIsLoading(false)
      return
    }

    // Validate gamertag characters
    // - Letters: a-z, A-Z
    // - Numbers: 0-9
    // - Special: -, _
    // - No spaces or special characters
    if (!/^[a-zA-Z0-9_-]+$/.test(gamertag)) {
      setError('Gamertag can only contain letters, numbers, hyphens, and underscores')
      setIsLoading(false)
      return
    }

    try {
      // Call profile update API
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamertag }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Redirect immediately (session will refresh naturally on next page)
      router.push('/')
    } catch (error: any) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Show "Loading..." while session is loading
  // - Prevents flash of unauthenticated content
  // - Better UX: Smooth loading experience
  // - Simple: Text only, no spinner needed
  //
  // Why simple text?
  // - Fast load: Session loads quickly
  // - No spinner: Less visual noise
  // - Simple: Clear message
  // ============================================================

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-start justify-center bg-background pt-20">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // ============================================================
  // AUTHENTICATION CHECK
  // ============================================================
  // Redirect to sign-in if user is not authenticated
  // - Prevents unauthorized access
  // - Clear user flow: Sign in → Pending → Complete profile
  // - Silent redirect: No error message
  //
  // Why silent redirect?
  // - Better UX: No confusing error
  // - Standard: Typical auth pattern
  // - Clear: User knows what to do
  // ============================================================

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // ============================================================
  // FORM RENDER
  // ============================================================
  // Show gamertag input form
  // - Centered card layout
  // - Logo, icon, title, description
  // - Gamertag input with validation
  // - Submit button
  // - Footer with privacy note
  //
  // Layout:
  // - min-h-screen: Full viewport height (minimum)
  // - items-start: Align to top (not center)
  // - pt-20: Top padding for visual balance
  // - max-w-md: Narrow width (448px)
  // - Relative: For absolute positioned bar
  // ============================================================

  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-20">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 relative">
        {/* Primary bar at top */}
        {/* h-0.5: Thin bar (2px) */}
        {/* bg-primary: Brand color */}
        {/* inset-x-0: Full width */}
        {/* top-0: At top */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

        {/* Logo */}
        <div className="flex justify-center pt-4">
          <Link href="/">
            <img
              src="/logo-fgt.png"
              alt="FridayGT"
              className="h-12 w-auto"
            />
          </Link>
        </div>

        {/* Icon */}
        {/* Gamepad2: Gaming/controller icon */}
        {/* h-10 w-10: Size for visibility */}
        {/* text-primary: Brand color */}
        {/* Centered: Visual interest */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gamertag input */}
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
              autoFocus
            />
            {/* Helper text */}
            {/* Explains gamertag requirements */}
            {/* text-xs: Small text for hierarchy */}
            <p className="text-xs text-muted-foreground">
              3-20 characters. Letters, numbers, hyphens, and underscores only.
            </p>
          </div>

          {/* Error display */}
          {/* Only shown if error state is set */}
          {/* Destructive colors for errors */}
          {/* Bordered box for visibility */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          {/* Submit button */}
          {/* Disabled during API call */}
          {/* Full width: w-full */}
          {/* Text changes: "Continue" → "Saving..." */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Saving...' : 'Continue'}
          </Button>
        </form>

        {/* Footer */}
        {/* Privacy note */}
        {/* Explains what's public vs private */}
        {/* text-sm: Small text for hierarchy */}
        <p className="text-center text-sm text-muted-foreground">
          Your gamertag will be shown on public leaderboards and race sessions.
          Your email and real name remain private.
        </p>
      </div>
    </div>
  )
}
