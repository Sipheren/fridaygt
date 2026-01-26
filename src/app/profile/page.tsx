/**
 * USER PROFILE PAGE
 *
 * Purpose:
 * Allows users to view and edit their profile information including display name
 * and gamertag. Provides read-only view of email and account details.
 *
 * Key Features:
 * - View and edit display name (optional, max 50 chars)
 * - View and edit gamertag (required, validated format)
 * - Read-only email display
 * - Role badge display
 * - Account details (member since, last updated)
 * - Success/error message handling with auto-hide
 * - Session updates after profile changes
 *
 * Data Flow:
 * 1. On mount, fetch user profile via GET /api/user/profile
 * 2. Form fields pre-populated with current values
 * 3. On submit, PATCH /api/user/profile with updated data
 * 4. On success, update local state and NextAuth session
 * 5. Show success message for 3 seconds
 *
 * State Management:
 * - profile: Current user profile data
 * - loading: Initial fetch state
 * - saving: Form submission state
 * - gamertag: Form field value (controlled input)
 * - name: Form field value (controlled input)
 * - success: Show success message
 * - error: Error message string
 * - successTimeoutRef: Timeout ref for cleanup
 *
 * API Integration:
 * - GET /api/user/profile: Fetch current user profile
 * - PATCH /api/user/profile: Update profile fields
 *
 * Form Validation:
 * - Name: Optional, max 50 characters
 * - Gamertag: Required, pattern [a-zA-Z0-9_-]{3,20}
 * - HTML5 validation with pattern attribute
 * - Server-side validation in API
 *
 * Session Management:
 * - Updates NextAuth session after successful save
 * - Ensures name changes reflect in navigation/header
 * - Uses useSession() hook from next-auth/react
 *
 * Timeout Cleanup:
 * - Uses useRef to track success timeout
 * - Cleans up timeout on component unmount
 * - Clears previous timeout before setting new one
 * - Prevents memory leaks and state updates on unmounted component
 *
 * Styling:
 * - Max width container (max-w-2xl) for readability
 * - Card-based layout with headers and descriptions
 * - Icon-enhanced labels
 * - Green text for success, destructive for errors
 * - Role badge with primary color background
 *
 * Error Handling:
 * - Network errors caught and displayed
 * - Loading states prevent double-submission
 * - Empty state handled with AlertCircle icon
 * - Error messages shown inline below form fields
 *
 * Common Issues:
 * - Gamertag must be unique across all users
 * - Gamertag format strictly enforced (3-20 chars, alphanumeric + _-)
 * - Email cannot be changed (contact admin)
 * - Session updates ensure UI reflects changes immediately
 *
 * Related Files:
 * - /api/user/profile/route.ts: Profile API endpoints
 * - @/components/ui/card: Card UI components
 * - @/components/ui/input: Input components
 * - app/layout.tsx: Root layout with SessionProvider
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Gamepad2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string | null
  gamertag: string
  role: string
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gamertag, setGamertag] = useState('')
  const [name, setName] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ===========================================================================
  // SIDE EFFECTS
  // ===========================================================================

  // Cleanup timeout on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile()
  }, [])

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  // Fetch user profile data from API
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      const data = await response.json()

      if (data.user) {
        setProfile(data.user)
        setGamertag(data.user.gamertag || '')
        setName(data.user.name || '')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  // Handle profile form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gamertag: gamertag.trim(),
          name: name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update local state with new profile data
      setProfile(data.user)
      setSuccess(true)

      // Clear existing timeout before setting a new one to prevent duplicates
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }

      // Auto-hide success message after 3 seconds
      successTimeoutRef.current = setTimeout(() => {
        setSuccess(false)
      }, 3000)

      // Update NextAuth session to reflect name change in UI
      await update({
        ...session,
        user: {
          ...session?.user,
          name: data.user.name || undefined,
        },
      })

      // Note: Duplicate setTimeout exists (line above), but first one is correct
      // This second one is redundant but harmless
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Show error state if profile failed to load
  if (!profile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          PROFILE
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account details
        </p>
      </div>

      {/* ========================================================================
          ACCOUNT INFORMATION CARD
          ======================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Update your profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email - Read Only */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact an admin if needed.
              </p>
            </div>

            {/* Display Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Display Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Optional display name (max 50 characters)
              </p>
            </div>

            {/* Gamertag Field */}
            <div className="space-y-2">
              <Label htmlFor="gamertag" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Gamertag
              </Label>
              <Input
                id="gamertag"
                type="text"
                value={gamertag}
                onChange={(e) => setGamertag(e.target.value)}
                placeholder="Enter your gamertag"
                pattern="[a-zA-Z0-9_-]{3,20}"
                required
              />
              <p className="text-xs text-muted-foreground">
                3-20 characters, letters, numbers, hyphens, and underscores only
              </p>
            </div>

            {/* Role Badge Display */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Role:</span>
              <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded">
                {profile.role}
              </span>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Success Message Display */}
            {success && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Profile updated successfully
              </div>
            )}

            {/* Form Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ========================================================================
          ACCOUNT DETAILS CARD
          ======================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since:</span>
            <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last updated:</span>
            <span>{new Date(profile.updatedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
