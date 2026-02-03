/**
 * Sign In Page
 *
 * Purpose: Magic link authentication page for user sign-in/sign-up
 * - Email-based authentication (no passwords)
 * - Magic link flow: Email → Click link → Signed in
 * - Automatic account creation for new users
 * - Success state after sending magic link
 *
 * **Key Features:**
 * - Magic link authentication: Passwordless sign-in via email
 * - New user creation: Account auto-created (pending approval)
 * - Success confirmation: Shows "Check your email" message
 * - Email input: Simple form with email validation
 * - Loading states: "Sending..." text during API call
 * - Error handling: Console logged, user stays on page
 *
 * **Magic Link Flow:**
 * 1. User enters email address
 * 2. NextAuth signIn() called with 'resend' provider
 * 3. Email sent with magic link (expires in configurable time)
 * 4. User clicks link in email
 * 5. Redirected back to app (signed in)
 * 6. New users: Account created with PENDING role
 * 7. Pending users: Redirected to approval page
 *
 * **State Management:**
 * - email: User's email address input
 * - isLoading: Loading state during signIn() call
 * - isSuccess: Success state (email sent)
 * - No password: Magic link authentication only
 *
 * **Page Layout:**
 * - Centered card: max-w-md (448px) centered horizontally
 * - Primary bar: Colored bar at top (h-0.5 bg-primary)
 * - Logo: FridayGT logo linking to home
 * - Form: Email input with submit button
 * - Footer: New user message
 *
 * **Success State:**
 * - Trigger: After successful signIn() call
 * - Icon: Large CheckCircle icon (h-16 w-16)
 * - Message: "Check your email"
 * - Description: "We've sent you a magic link..."
 * - No form: Success message replaces form
 *
 * **Error Handling:**
 * - Console log: Error logged to console
 * - User stays: User remains on sign-in page
 * - No alert: Silent error (better UX)
 * - Retry: User can submit again
 *
 * **NextAuth Integration:**
 * - Provider: 'resend' (email provider)
 * - signIn(): NextAuth client-side signIn function
 * - redirect: false (prevent automatic redirect)
 * - Why false? Handle success state manually
 *
 * **New User Flow:**
 * - Auto-created: Account created automatically
 * - Role: PENDING (awaiting admin approval)
 * - Redirect: To /auth/pending after sign-in
 * - Email: Admin notified of pending user
 *
 * **Styling:**
 * - Card: Bordered container with shadow
 * - Primary bar: Colored strip at top
 * - Logo: Centered, links to home
 * - Button: Full width, disabled during loading
 * - Icons: Mail icon on label, CheckCircle on success
 *
 * **Accessibility:**
 * - Email input: Standard HTML5 email validation
 * - Required: Email is required field
 * - Placeholder: "you@example.com" for format hint
 * - Focus: Auto-focus on email input
 * - Keyboard: Enter key submits form
 *
 * **Debugging Tips:**
 * - Email not sending: Check Resend API key is configured
 * - Not redirecting: Check NextAuth configuration
 * - Account not created: Check database connection
 * - Success not showing: Check isSuccess state is set
 * - Loading stuck: Check signIn() promise resolves
 *
 * **Common Issues:**
 * - Email not received: Check spam folder
 * - Link expired: Magic links have expiration time
 * - Account pending: New users need admin approval
 * - Not creating account: Check auto-create in NextAuth config
 *
 * **Related Files:**
 * - @/app/auth/verify-request/page.tsx: Verification page
 * - @/app/auth/pending/page.tsx: Pending approval page
 * - @/app/auth/error/page.tsx: Authentication error page
 * - @/lib/auth.ts: NextAuth configuration
 * - @/app/api/auth/[...nextauth]/route.ts: NextAuth API route
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle } from 'lucide-react'

export default function SignInPage() {
  // ============================================================
  // STATE
  // ============================================================
  // - email: User's email address from input
  // - isLoading: Loading state during signIn() API call
  // - isSuccess: Success state after email sent
  //
  // Why this state?
  // - email: Controlled input for form submission
  // - isLoading: Disable button during API call, show "Sending..."
  // - isSuccess: Show success state instead of form after submission
  // ============================================================

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // ============================================================
  // FORM SUBMISSION
  // ============================================================
  // Handle sign-in form submission
  // - Calls NextAuth signIn() with 'resend' provider
  // - Sends magic link to user's email
  // - Sets isSuccess state on success
  // - Logs error to console on failure
  //
  // Why 'resend' provider?
  // - Email-based authentication (passwordless)
  // - Sends magic link via Resend API
  // - Auto-creates account if doesn't exist
  //
  // Why redirect: false?
  // - Handle success state manually
  // - Show success message to user
  // - No automatic redirect needed
  //
  // Error handling:
  // - Console log: Error logged for debugging
  // - User stays: Remains on sign-in page
  // - No alert: Silent error (better UX)
  // - Retry: User can submit again
  //
  // Debugging Tips:
  // - Email not sending: Check Resend API key in .env
  // - Not responding: Check API route is accessible
  // - Account not creating: Check NextAuth config
  // - Success not showing: Check isSuccess state is set
  // ============================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Call NextAuth signIn with 'resend' provider
      // - Sends magic link to email
      // - Creates account if doesn't exist
      // - Returns success/error
      await signIn('resend', {
        email,
        redirect: false, // Don't redirect automatically
      })
      setIsSuccess(true)
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================
  // SUCCESS STATE
  // ============================================================
  // Show success message after email sent
  // - Replaces form with confirmation
  // - Shows "Check your email" message
  // - Large CheckCircle icon for visual feedback
  // - No retry needed (user can go back)
  //
  // Why separate state?
  // - Clear success message
  // - No form shown (prevents confusion)
  // - Better UX (clear confirmation)
  // ============================================================

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-background pt-20">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 relative">
          {/* Primary bar at top */}
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

          {/* Success message */}
          <div className="text-center space-y-4">
            {/* CheckCircle icon */}
            {/* h-16 w-16: Large size for visibility */}
            {/* text-primary: Brand color for positive feedback */}
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            {/* Heading */}
            <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
            {/* Description */}
            <p className="text-muted-foreground">
              We&apos;ve sent you a magic link to sign in to your account.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // SIGN-IN FORM
  // ============================================================
  // Show sign-in form
  // - Email input with label
  // - Submit button
  // - New user message
  // - Centered card layout
  //
  // Layout:
  // - min-h-screen: Full viewport height (minimum)
  // - items-start: Align to top (not center)
  // - pt-20: Top padding for visual balance
  // - max-w-md: Narrow width (448px) for form
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

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
          <p className="text-muted-foreground">Enter your email to receive a magic link</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Submit button */}
          {/* Disabled during API call */}
          {/* Full width: w-full */}
          {/* Text changes: "Sign in" → "Sending..." */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Sign in with Email'}
          </Button>
        </form>

        {/* Footer */}
        {/* Explains new user flow */}
        <p className="text-center text-sm text-muted-foreground">
          New user? An account will be created for you (pending admin approval)
        </p>
      </div>
    </div>
  )
}
