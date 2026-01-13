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
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [gamertag, setGamertag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Redirect if user already has a gamertag
    if (session?.user && (session.user as any).gamertag) {
      router.push('/')
    }
  }, [session, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validate gamertag
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

    if (!/^[a-zA-Z0-9_-]+$/.test(gamertag)) {
      setError('Gamertag can only contain letters, numbers, hyphens, and underscores')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamertag }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update session with new gamertag
      await update()

      // Redirect to home
      router.push('/')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-start justify-center bg-background pt-20">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-20">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 relative">
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

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Your gamertag will be shown on public leaderboards and race sessions.
          Your email and real name remain private.
        </p>
      </div>
    </div>
  )
}
