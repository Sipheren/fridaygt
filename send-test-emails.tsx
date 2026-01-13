import { render } from '@react-email/components'
import { Resend } from 'resend'
import { VerificationEmail } from './src/emails/verification-email'
import { ApprovalEmail } from './src/emails/approval-email'
import { UserRemovalEmail } from './src/emails/user-removal-email'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY)
const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'
const fromEmail = process.env.EMAIL_FROM || 'noreply@fridaygt.com'

async function sendTestEmails() {
  console.log('🧪 Sending test emails to:', adminEmail)
  console.log('')

  try {
    // 1. Verification Email
    console.log('1️⃣  Sending Verification Email...')
    const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify?token=test-token-12345`
    const verificationHtml = await render(<VerificationEmail verifyUrl={verifyUrl} />)

    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] Verify your email - FridayGT',
      html: verificationHtml,
    })
    console.log('   ✅ Verification email sent')
    console.log('')

    // 2. Approval Email - Approved
    console.log('2️⃣  Sending Approval Email (APPROVED)...')
    const signInUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/signin`
    const approvalHtml = await render(<ApprovalEmail approved={true} signInUrl={signInUrl} />)

    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] Account Approved - FridayGT',
      html: approvalHtml,
    })
    console.log('   ✅ Approval email (approved) sent')
    console.log('')

    // 3. Approval Email - Denied
    console.log('3️⃣  Sending Approval Email (DENIED)...')
    const deniedHtml = await render(<ApprovalEmail approved={false} signInUrl={signInUrl} />)

    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] Account Request Denied - FridayGT',
      html: deniedHtml,
    })
    console.log('   ✅ Approval email (denied) sent')
    console.log('')

    // 4. User Removal Notification
    console.log('4️⃣  Sending User Removal Notification...')
    const removalHtml = await render(
      <UserRemovalEmail
        removedUserEmail="testuser@example.com"
        removedBy="Admin (david@sipheren.com)"
        removalTime={new Date().toLocaleString()}
      />
    )

    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] User Account Removed - FridayGT',
      html: removalHtml,
    })
    console.log('   ✅ User removal notification sent')
    console.log('')

    console.log('✅ All test emails sent successfully!')
    console.log(`📧 Check ${adminEmail} to see the email templates`)
  } catch (error) {
    console.error('❌ Error sending test emails:', error)
    process.exit(1)
  }
}

// Run the script
sendTestEmails()
