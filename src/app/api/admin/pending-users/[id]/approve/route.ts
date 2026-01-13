import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { Resend } from 'resend'

// POST /api/admin/pending-users/[id]/approve - Approve a pending user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.id

    const supabase = createServiceRoleClient()

    // Get the user to approve
    const { data: user, error: fetchError } = await supabase
      .from('User')
      .select('id, email, name, role')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'PENDING') {
      return NextResponse.json({ error: 'User is not pending' }, { status: 400 })
    }

    // Update user role to USER
    const { error: updateError } = await supabase
      .from('User')
      .update({ role: 'USER', updatedAt: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      console.error('Error approving user:', updateError)
      return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
    }

    // Send approval email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: 'Your FridayGT Account Has Been Approved!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e7eb; }
                .content { padding: 30px 0; }
                .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
                .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://fridaygt.com/logo-fgt.png" alt="FridayGT" style="height: 50px;">
                </div>
                <div class="content">
                  <h1>Account Approved!</h1>
                  <p>Great news, ${user.name || user.email}!</p>
                  <p>Your FridayGT account has been approved and you can now complete your profile.</p>
                  <p>Click the button below to set your gamertag and get started:</p>
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="https://fridaygt.com/auth/signin" class="button">Complete Your Profile</a>
                  </p>
                  <p>See you on the track!</p>
                </div>
                <div class="footer">
                  <p>You're receiving this email because you signed up for FridayGT.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      })

      console.log(`Approval email sent to ${user.email}`)
    } catch (emailError) {
      console.error('Error sending approval email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name }
    })
  } catch (error) {
    console.error('Error in POST /api/admin/pending-users/[id]/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
