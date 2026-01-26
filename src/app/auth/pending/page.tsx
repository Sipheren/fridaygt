/**
 * Pending Approval Page
 *
 * Purpose: Account pending approval page for new users
 * - Shown when user's account has PENDING role
 * - Waiting for admin approval before access
 * - Explains approval flow to user
 * - Provides what-to-expect information
 *
 * **Key Features:**
 * - Pending message: Clear "Account Pending Approval" heading
 * - Clock icon: Visual indicator (waiting state)
 * - Flow explanation: Step-by-step approval process
 * - Admin review: Tells user admin will review account
 * - Email notification: User will be emailed when approved
 * - Back button: Return to sign-in page
 *
 * **When This Page Is Shown:**
 * - User signs in with PENDING role
 * - Middleware blocks access to app
 * - Redirected to /auth/pending
 * - After magic link sign-in
 *
 * **Approval Flow:**
 * 1. User signs up (account created with PENDING role)
 * 2. Admin receives notification
 * 3. Admin reviews account (approves/rejects)
 * 4. User receives approval email
 * 5. User clicks link or returns to app
 * 6. Redirected to complete profile
 * 7. Can now access app
 *
 * **What Happens Next Section:**
 * - Numbered list: Clear step-by-step process
 * - Bordered box: Visually distinct section
 * - Muted background: Subtle highlighting
 * - Steps: Review → Email → Set gamertag → Start
 *
 * **Page Layout:**
 * - Centered card: max-w-md (448px) centered horizontally
 * - Primary bar: Colored bar at top (h-0.5 bg-primary)
 * - Logo: FridayGT logo linking to home
 * - Icon: Large Clock icon (h-16 w-16)
 * - Content: Title, description, steps, button
 *
 * **Styling:**
 * - Card: Bordered container with shadow
 * - Primary bar: Colored strip at top
 * - Icon: Clock (waiting/pending symbol)
 * - Steps box: Bordered with muted background
 * - Button: Full width, outline variant
 *
 * **Accessibility:**
 * - Semantic: Proper heading structure
 * - Clear: Easy to understand
 * - Actionable: Clear button to retry
 * - Visual: Icon supports text message
 *
 * **User Experience:**
 * - Clear message: User knows why waiting
 * - Process explained: Step-by-step flow
 * - Actionable: Can retry with back button
 * - Reassuring: Know what to expect
 *
 * **Debugging Tips:**
 * - Not showing: Check middleware redirects pending users
 * - Approved users: Should redirect to complete profile
 * - Email not sent: Check admin notification system
 *
 * **Common Issues:**
 * - Stuck pending: Admin needs to approve account
 * - No email: Check email notification system
 * - Not redirecting: Check middleware logic
 *
 * **Related Files:**
 * - @/app/auth/signin/page.tsx: Sign-in page
 * - @/app/auth/complete-profile/page.tsx: Profile completion page
 * - @/app/auth/error/page.tsx: Authentication error page
 * - @/middleware.ts: Middleware that checks user role
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PendingApprovalPage() {
  // ============================================================
  // RENDER
  // ============================================================
  // Static page with pending approval message
  // - No state: Pure presentation component
  // - No client-side logic: Static content
  // - Clear explanation: Approval flow steps
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
  // - User action: Wait for email or contact admin
  // - Simple: Clear explanation, no complexity
  //
  // Debugging Tips:
  // - Not showing: Check middleware for PENDING redirect
  // - Still pending: Admin needs to approve in admin panel
  // - Email not sent: Check notification system
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

        {/* Pending message */}
        {/* Centered text with icon */}
        {/* Clock icon: Waiting/pending symbol */}
        {/* Large size (h-16 w-16) for visibility */}
        {/* text-primary: Brand color */}
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <Clock className="h-16 w-16 text-primary" />
          </div>
          {/* Heading */}
          {/* text-2xl: Large heading size */}
          {/* font-bold: Bold font weight */}
          {/* tracking-tight: Tighter letter spacing */}
          <h2 className="text-2xl font-bold tracking-tight">Account Pending Approval</h2>
          {/* Main description */}
          {/* Explains current status */}
          <p className="text-muted-foreground">
            Your account is waiting for admin approval.
          </p>
          {/* Additional details */}
          {/* Smaller text for hierarchy */}
          <p className="text-sm text-muted-foreground">
            You will receive an email when your account has been approved.
            Once approved, you can return to complete your profile.
          </p>
        </div>

        {/* What happens next section */}
        {/* Numbered list of steps */}
        {/* Bordered box with muted background */}
        {/* Explains approval process clearly */}
        <div className="space-y-2 pt-4">
          <div className="rounded-md bg-muted p-4 text-sm">
            {/* Section heading */}
            <p className="font-medium mb-1">What happens next:</p>
            {/* Numbered list */}
            {/* list-decimal: Numbers (1, 2, 3, ...) */}
            {/* list-inside: Numbers inside list */}
            {/* space-y-1: Spacing between items */}
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>An admin will review your account</li>
              <li>You'll receive an approval email</li>
              <li>Click the link or return here to set your gamertag</li>
              <li>Start using FridayGT!</li>
            </ol>
          </div>
        </div>

        {/* Back button */}
        {/* Returns to sign-in page */}
        {/* Full width: w-full */}
        {/* outline variant: Secondary action */}
        {/* pt-4: Top padding for spacing */}
        <div className="pt-4">
          <Button asChild className="w-full" variant="outline">
            <Link href="/auth/signin">Back to Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
