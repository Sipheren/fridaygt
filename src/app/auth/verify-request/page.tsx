import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function VerifyRequestPage() {
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
            A sign in link has been sent to your email address.
          </p>
        </div>
      </div>
    </div>
  )
}
