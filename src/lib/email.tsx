import { Resend } from 'resend'
import { render } from '@react-email/components'
import { VerificationEmail } from '@/emails/verification-email'
import { ApprovalEmail } from '@/emails/approval-email'
import { UserRemovalEmail } from '@/emails/user-removal-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`

  const emailHtml = await render(
    <VerificationEmail verifyUrl={verifyUrl} />
  )

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Verify your email - FridayGT',
    html: emailHtml,
  })
}

export async function sendApprovalNotification(email: string, approved: boolean) {
  const signInUrl = `${process.env.NEXTAUTH_URL}/auth/signin`

  const emailHtml = await render(
    <ApprovalEmail approved={approved} signInUrl={signInUrl} />
  )

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: approved ? 'Account Approved - FridayGT' : 'Account Request Denied - FridayGT',
    html: emailHtml,
  })
}

export async function sendUserRemovalNotification(adminEmails: string[], removedUserEmail: string, removedBy: string) {
  const emailHtml = await render(
    <UserRemovalEmail
      removedUserEmail={removedUserEmail}
      removedBy={removedBy}
      removalTime={new Date().toLocaleString()}
    />
  )

  // Use Promise.allSettled to ensure all emails are attempted even if some fail
  const results = await Promise.allSettled(
    adminEmails.map((email) =>
      resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'User Account Removed - FridayGT',
        html: emailHtml,
      })
    )
  )

  // Log any failures without throwing
  const failures = results.filter((r) => r.status === 'rejected')
  if (failures.length > 0) {
    console.error(`Failed to send ${failures.length} of ${adminEmails.length} user removal notifications:`, failures)
  }
}
