import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { auth } from '@/lib/auth'
import { QuickBuildSchema, validateBody } from '@/lib/validation'
import { handleApiError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/api-error-handler'
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

// POST /api/builds/quick - Quick build creation for inline modal
// Purpose: Create builds without leaving race creation flow
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting (20 requests per minute)
    const rateLimit = await checkRateLimit(req, RateLimit.Mutation())

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const body = await req.json()

    // Validate request body with Zod
    const validationResult = await validateBody(QuickBuildSchema, body)
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error)
    }

    const { carId, name, description } = validationResult.data

    const supabase = createServiceRoleClient()

    // Verify car exists
    const { data: car, error: carError } = await supabase
      .from('Car')
      .select('id, name, manufacturer')
      .eq('id', carId)
      .single()

    if (carError || !car) {
      throw new NotFoundError('Car')
    }

    // Generate build ID
    const buildId = crypto.randomUUID()

    // Create build (no upgrades or settings initially)
    const { data: build, error: buildError } = await supabase
      .from('CarBuild')
      .insert({
        id: buildId,
        userId: session.user.id,
        carId,
        name,
        description,
        isPublic: false, // Quick builds are private by default
      })
      .select()
      .single()

    if (buildError) {
      throw buildError // Will be caught by handleApiError
    }

    // Fetch complete build data for response
    const { data: completeBuild } = await supabase
      .from('CarBuild')
      .select(`
        *,
        car:Car(id, name, slug, manufacturer, year, category)
      `)
      .eq('id', buildId)
      .single()

    // Add rate limit headers to successful response
    return NextResponse.json(completeBuild, {
      status: 201,
      headers: rateLimitHeaders(rateLimit),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
