import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Verify your email - FridayGT',
    html: `
      <h2>Welcome to FridayGT!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  })
}

export async function sendApprovalNotification(email: string, approved: boolean) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: approved ? 'Account Approved - FridayGT' : 'Account Request Denied - FridayGT',
    html: approved
      ? `
        <h2>Your account has been approved!</h2>
        <p>You can now sign in to FridayGT.</p>
        <a href="${process.env.NEXTAUTH_URL}/auth/signin">Sign In</a>
      `
      : `
        <h2>Account Request Denied</h2>
        <p>Your account request for FridayGT has been denied.</p>
        <p>If you believe this is an error, please contact the administrator.</p>
      `
  })
}

export async function sendUserRemovalNotification(adminEmails: string[], removedUserEmail: string, removedBy: string) {
  await Promise.all(
    adminEmails.map((email) =>
      resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: 'User Account Removed - FridayGT',
        html: `
          <h2>User Account Removed</h2>
          <p>The following user account has been removed from FridayGT:</p>
          <p><strong>${removedUserEmail}</strong></p>
          <p>Removed by: ${removedBy}</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        `
      })
    )
  )
}
