import { auth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { redirect } from 'next/navigation'
import { LapTimeEditForm } from '@/components/lap-times/LapTimeEditForm'
import { Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function EditLapTimePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) {
    redirect('/auth/signin')
  }

  const { id } = await params
  const supabase = createServiceRoleClient()

  // Get user ID
  const { data: userData } = await supabase
    .from('User')
    .select('id')
    .eq('email', session.user.email!)
    .single()

  if (!userData) {
    redirect('/auth/signin')
  }

  // Fetch the lap time
  const { data: lapTime, error } = await supabase
    .from('LapTime')
    .select(`
      id,
      userId,
      timeMs,
      notes,
      conditions,
      trackId,
      carId,
      buildId,
      track:Track(id, name, slug, location, layout),
      car:Car(id, name, slug, manufacturer),
      build:CarBuild(id, name, description)
    `)
    .eq('id', id)
    .single()

  if (error || !lapTime) {
    redirect('/lap-times')
  }

  // Extract single objects from Supabase's array responses
  const processedLapTime = {
    ...lapTime,
    track: (lapTime as any).track?.[0] || null,
    car: (lapTime as any).car?.[0] || null,
    build: (lapTime as any).build?.[0] || null,
  }

  // Check ownership
  if ((lapTime as any).userId !== userData.id) {
    redirect('/lap-times')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="absolute inset-x-0 top-16 h-0.5 bg-primary"></div>

      <Button variant="ghost" asChild>
        <Link href="/lap-times">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lap Times
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" />
          EDIT LAP TIME
        </h1>
        <p className="text-muted-foreground mt-1">
          Update your lap time details
        </p>
      </div>

      <div className="border border-border rounded-lg p-6 bg-card">
        <LapTimeEditForm lapTime={processedLapTime} />
      </div>
    </div>
  )
}
