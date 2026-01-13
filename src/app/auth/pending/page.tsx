import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PendingApprovalPage() {
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
            <Clock className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Account Pending Approval</h2>
          <p className="text-muted-foreground">
            Your account is waiting for admin approval.
          </p>
          <p className="text-sm text-muted-foreground">
            You will receive an email when your account has been approved.
            Once approved, you can return to complete your profile.
          </p>
        </div>

        <div className="space-y-2 pt-4">
          <div className="rounded-md bg-muted p-4 text-sm">
            <p className="font-medium mb-1">What happens next:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>An admin will review your account</li>
              <li>You'll receive an approval email</li>
              <li>Click the link or return here to set your gamertag</li>
              <li>Start using FridayGT!</li>
            </ol>
          </div>
        </div>

        <div className="pt-4">
          <Button asChild className="w-full" variant="outline">
            <Link href="/auth/signin">Back to Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
