'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white dark:bg-gray-800 p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Complete Your Profile</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Choose a gamertag that will be visible on leaderboards
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="gamertag" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Gamertag / Username
            </label>
            <input
              id="gamertag"
              type="text"
              required
              value={gamertag}
              onChange={(e) => setGamertag(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:text-white"
              placeholder="YourGamertag"
              minLength={3}
              maxLength={20}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              3-20 characters. Letters, numbers, hyphens, and underscores only.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Your gamertag will be shown on public leaderboards and race sessions.
          Your email and real name remain private.
        </p>
      </div>
    </div>
  )
}
