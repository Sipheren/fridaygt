'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signIn('resend', {
        email,
        redirect: false,
      })
      setIsSuccess(true)
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-background pt-20">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 relative">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

          <div className="flex justify-center pt-4">
            <Link href="/">
              <img
                src="/logo-fgt.png"
                alt="FridayGT"
                className="h-12 w-auto"
              />
            </Link>
          </div>

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
            <p className="text-muted-foreground">
              We've sent you a magic link to sign in to your account.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-20">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 relative">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>

        <div className="flex justify-center pt-4">
          <Link href="/">
            <img
              src="/logo-fgt.png"
              alt="FridayGT"
              className="h-12 w-auto"
            />
          </Link>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
          <p className="text-muted-foreground">Enter your email to receive a magic link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Sign in with Email'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New user? An account will be created for you (pending admin approval)
        </p>
      </div>
    </div>
  )
}
