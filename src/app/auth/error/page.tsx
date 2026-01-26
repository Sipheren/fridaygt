/**
 * Authentication Error Page
 *
 * Purpose: Error page for authentication failures
 * - Shown when authentication fails (expired link, etc.)
 * - Part of NextAuth error handling flow
 * - User-friendly error message
 * - Retry action to return to sign-in
 *
 * **Key Features:**
 * - Error message: Clear "Authentication Error" heading
 * - Explanation: User-friendly error description
 * - Retry action: Button to return to sign-in
 * - Destructive styling: Error colors (destructive, red)
 * - Static page: No client-side logic needed
 *
 * **When This Page Is Shown:**
 * - Magic link expired
 * - Invalid authentication token
 * - Authentication API error
 * - NextAuth error callback triggers
 *
 * **Error Types:**
 * - Expired link: Magic link has time limit
 * - Invalid token: Authentication token corrupted
 * - API error: Authentication service down
 * - Configuration: NextAuth config issue
 *
 * **Page Layout:**
 * - Centered card: max-w-md (448px) centered horizontally
 * - Destructive bar: Red bar at top (h-0.5 bg-destructive)
 * - Logo: FridayGT logo linking to home
 * - Icon: AlertCircle icon (error symbol)
 * - Message: Error description with retry button
 *
 * **Styling:**
 * - Card: Bordered container with destructive border
 * - Primary bar: Destructive color (error indicator)
 * - Logo: Centered, links to home
 * - Icon: AlertCircle (warning/error symbol)
 * - Typography: Bold heading, muted description
 * - Button: Destructive variant (error color)
 *
 * **User Experience:**
 * - Clear error: User knows what went wrong
 * - Actionable: Clear retry button
 * - Reassuring: Explains why error occurred
 * - Simple: Easy to understand and fix
 *
 * **NextAuth Integration:**
 * - Page: Configured in NextAuth error option
 * - Flow: Part of error handling
 * - Static: No client-side logic needed
 * - Accessible: User-friendly error message
 *
 * **Accessibility:**
 * - Semantic: Proper HTML structure
 * - Clear: Easy to understand
 * - Actionable: Clear button to retry
 * - Visual: Icon and color indicate error
 *
 * **Debugging Tips:**
 * - Not showing: Check NextAuth error configuration
 * - Wrong error: Verify error callback logic
 * - Styling off: Check CSS classes match pattern
 * - Link not working: Verify href is correct
 *
 * **Common Issues:**
 * - Expired links: User needs new magic link
 * - Configuration: Check NextAuth error setup
 * - Not redirecting: Verify error page path
 *
 * **Related Files:**
 * - @/app/auth/signin/page.tsx: Sign-in page
 * - @/app/auth/verify-request/page.tsx: Verification page
 * - @/app/auth/pending/page.tsx: Pending approval page
 * - @/lib/auth.ts: NextAuth configuration
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function ErrorPage() {
  // ============================================================
  // RENDER
  // ============================================================
  // Static error page with retry action
  // - No state: Pure presentation component
  // - No client-side logic: Static content
  // - Clear error message: User-friendly text
  //
  // Layout:
  // - min-h-screen: Full viewport height (minimum)
  // - items-start: Align to top (not center)
  // - pt-20: Top padding for visual balance
  // - max-w-md: Narrow width (448px)
  // - Relative: For absolute positioned bar
  //
  // Why destructive styling?
  // - Error indication: Red color signals error
  // - User attention: Clear visual feedback
  // - Consistent: Matches error state patterns
  //
  // Why static page?
  // - No dynamic data needed
  // - Simple error message
  // - Fast: No client-side JavaScript
  // - NextAuth: Configured as error page
  //
  // Debugging Tips:
  // - Not showing: Check NextAuth error configuration
  // - Wrong page: Verify error callback in auth config
  // - Styling off: Check CSS matches other pages
  // ============================================================

  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-20">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-8 relative">
        {/* Destructive bar at top */}
        {/* h-0.5: Thin bar (2px) */}
        {/* bg-destructive: Error color (red) */}
        {/* inset-x-0: Full width */}
        {/* top-0: At top */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-destructive"></div>

        {/* Logo */}
        {/* Links to home page */}
        {/* h-12: Height for logo */}
        {/* pt-4: Top padding */}
        <div className="flex justify-center pt-4">
          <Link href="/">
            <img
              src="/logo-fgt.png"
              alt="FridayGT"
              className="h-12 w-auto"
            />
          </Link>
        </div>

        {/* Error message */}
        {/* Centered text with icon */}
        {/* AlertCircle: Error/warning icon */}
        {/* Large size (h-16 w-16) for visibility */}
        {/* text-destructive: Error color (red) */}
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-destructive" />
          </div>
          {/* Heading */}
          {/* text-2xl: Large heading size */}
          {/* font-bold: Bold font weight */}
          {/* tracking-tight: Tighter letter spacing */}
          {/* text-destructive: Error color (red) */}
          <h2 className="text-2xl font-bold tracking-tight text-destructive">Authentication Error</h2>
          {/* Main description */}
          {/* User-friendly error message */}
          {/* Explains what went wrong */}
          <p className="text-muted-foreground">
            There was a problem signing you in. Please try again.
          </p>
          {/* Additional details */}
          {/* Smaller text for hierarchy */}
          {/* Explains why error occurred */}
          <p className="text-sm text-muted-foreground">
            The sign in link may have expired. Please request a new one.
          </p>
          {/* Retry button */}
          {/* Destructive variant (error color) */}
          {/* mt-4: Top margin for spacing */}
          {/* Links back to sign-in page */}
          <Button asChild className="mt-4" variant="destructive">
            <Link href="/auth/signin">
              Back to Sign In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
