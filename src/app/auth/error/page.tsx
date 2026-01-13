import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-background pt-20">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-8 relative">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-destructive"></div>

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
            <AlertCircle className="h-16 w-16 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-destructive">Authentication Error</h2>
          <p className="text-muted-foreground">
            There was a problem signing you in. Please try again.
          </p>
          <p className="text-sm text-muted-foreground">
            The sign in link may have expired. Please request a new one.
          </p>
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
