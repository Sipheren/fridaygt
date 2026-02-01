/**
 * Cron Job: Cleanup Expired Verification Tokens
 *
 * This endpoint is called by Vercel Cron Jobs hourly to clean up expired
 * magic link tokens from the database.
 *
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Only Vercel cron jobs should call this endpoint
 * - Returns 401 if authorization header is missing/invalid
 *
 * Usage:
 * The cron job is configured in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-tokens",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    console.error('CRON_SECRET environment variable not set')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    console.warn('Unauthorized cron job attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Use service role client to bypass RLS (needed for cleanup)
    const supabase = createServiceRoleClient()

    // Call the cleanup function
    const { data, error } = await supabase.rpc('clean_expired_tokens')

    if (error) {
      console.error('Failed to cleanup expired tokens:', error)
      return NextResponse.json(
        { error: 'Cleanup failed', details: error.message },
        { status: 500 }
      )
    }

    // Return success with stats
    return NextResponse.json({
      success: true,
      message: 'Expired tokens cleaned up successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Unexpected error in token cleanup:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
