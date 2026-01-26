/**
 * Verify Request Page
 *
 * Purpose: Confirmation page shown after magic link email is sent
 * - Part of NextAuth error handling flow
 * - Shown when email verification is required
 * - Static page (no client-side logic needed)
 *
 * **Key Features:**
 * - Static content: No dynamic data or state
 * - Success message: "Check your email" confirmation
 * - Consistent design: Matches other auth pages
 * - Logo link: Returns to home page
 *
 * **When This Page Is Shown:**
 * - NextAuth verification flow triggered
 * - Email sent but user needs to check inbox
 * - Part of magic link authentication flow
 * - Configured in NextAuth pages option
 *
 * **Page Layout:**
 * - Centered card: max-w-md (448px) centered horizontally
 * - Primary bar: Colored bar at top (h-0.5 bg-primary)
 * - Logo: FridayGT logo linking to home
 * - Icon: Large CheckCircle icon (h-16 w-16)
 * - Message: Clear confirmation text
 *
 * **NextAuth Integration:**
 * - Page: Configured in NextAuth options
 * - Flow: Part of verification error handling
 * - Purpose: User-friendly confirmation
 * - Static: No client-side logic needed
 *
 * **Styling:**
 * - Card: Bordered container with shadow
 * - Primary bar: Colored strip at top
 * - Logo: Centered, links to home
 * - Icon: Large, primary color for positivity
 * - Typography: Bold heading, muted description
 *
 * **Accessibility:**
 * - Semantic: Proper HTML structure
 * - Clear message: Easy to understand
 * - Visual: Icon supports text message
 * - Navigation: Logo link to home
 *
 * **Debugging Tips:**
 * - Not showing: Check NextAuth pages configuration
 * - Wrong page: Verify verify-request callback
 * - Styling off: Check CSS classes match other pages
 *
 * **Common Issues:**
 * - Page not found: Check file path matches NextAuth config
 * - Not triggered: Verify NextAuth pages option
 * - Layout broken: Check card structure is correct
 *
 * **Related Files:**
 * - @/app/auth/signin/page.tsx: Sign-in page
 * - @/app/auth/pending/page.tsx: Pending approval page
 * - @/app/auth/error/page.tsx: Authentication error page
 * - @/lib/auth.ts: NextAuth configuration
 */

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function VerifyRequestPage() {
  // ============================================================
  // RENDER
  // ============================================================
  // Static page with success message
  // - No state: Pure presentation component
  // - No client-side logic: Static content
  // - Consistent design: Matches other auth pages
  //
  // Layout:
  // - min-h-screen: Full viewport height (minimum)
  // - items-start: Align to top (not center)
  // - pt-20: Top padding for visual balance
  // - max-w-md: Narrow width (448px)
  // - Relative: For absolute positioned bar
  //
  // Why static page?
  // - No dynamic data needed
  // - Simple confirmation message
  // - Faster: No client-side JavaScript
  // - NextAuth: Configured as verification page
  //
  // Debugging Tips:
  // - Not showing: Check NextAuth pages config
  // - Wrong text: Verify message is correct
  // - Styling off: Check CSS matches other pages
  // ============================================================

  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-20">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 relative">
        {/* Primary bar at top */}
        {/* h-0.5: Thin bar (2px) */}
        {/* bg-primary: Brand color */}
        {/* inset-x-0: Full width */}
        {/* top-0: At top */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

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

        {/* Success message */}
        {/* Centered text with icon */}
        {/* CheckCircle: Green checkmark icon */}
        {/* Large size (h-16 w-16) for visibility */}
        {/* text-primary: Brand color for positivity */}
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-primary" />
          </div>
          {/* Heading */}
          {/* text-2xl: Large heading size */}
          {/* font-bold: Bold font weight */}
          {/* tracking-tight: Tighter letter spacing */}
          <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
          {/* Description */}
          {/* Explains what user needs to do */}
          {/* "A sign in link has been sent..." */}
          <p className="text-muted-foreground">
            A sign in link has been sent to your email address.
          </p>
        </div>
      </div>
    </div>
  )
}
