import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Clock, Car, Map, ListChecks } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  const userRole = (session.user as any)?.role
  const supabase = await createClient()

  // Fetch user's lap time count
  let lapTimeCount = 0
  if (session?.user?.email) {
    const { data: userData } = await supabase
      .from('User')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userData) {
      const { count } = await supabase
        .from('LapTime')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userData.id)

      lapTimeCount = count || 0
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col items-start gap-3">
        <Image
          src="/logo-fgt.png"
          alt="FridayGT"
          width={600}
          height={196}
          className="h-16 w-auto"
          priority
          unoptimized
        />
        <p className="text-muted-foreground font-mono text-sm">
          GT7 LAP TIME TRACKER / FRIDAY NIGHT RUN MANAGEMENT
        </p>
      </div>

      {/* Status Card */}
      {userRole === 'PENDING' && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-yellow-900 dark:text-yellow-100">Account Pending</CardTitle>
            <CardDescription className="text-yellow-800 dark:text-yellow-200">
              Your account is awaiting admin approval. You'll receive an email once approved.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tracks</CardTitle>
            <Map className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums sm:text-4xl">118</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">ALL GT7 CIRCUITS</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cars</CardTitle>
            <Car className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums sm:text-4xl">552</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">COMPLETE ROSTER</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lap Times</CardTitle>
            <Clock className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums sm:text-4xl">{lapTimeCount}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">RECORDED LAPS</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Run Lists</CardTitle>
            <ListChecks className="h-5 w-5 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums sm:text-4xl">0</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">ACTIVE SESSIONS</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/tracks" className="group">
          <Card className="h-full gt-card-shine transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-l-4 border-l-primary bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 sm:p-2.5 bg-primary/15 border border-primary/20">
                  <Map className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 uppercase tracking-tight group-hover:text-primary transition-colors">Tracks</h3>
                  <p className="text-xs text-muted-foreground font-mono">BROWSE CIRCUITS</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/cars" className="group">
          <Card className="h-full gt-card-shine transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/20 border-l-4 border-l-accent bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 sm:p-2.5 bg-accent/15 border border-accent/20">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 uppercase tracking-tight group-hover:text-accent transition-colors">Cars</h3>
                  <p className="text-xs text-muted-foreground font-mono">VEHICLE DATABASE</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/lap-times" className="group">
          <Card className="h-full gt-card-shine transition-all hover:border-secondary hover:shadow-lg hover:shadow-secondary/20 border-l-4 border-l-secondary bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 sm:p-2.5 bg-secondary/15 border border-secondary/20">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 uppercase tracking-tight group-hover:text-secondary transition-colors">Times</h3>
                  <p className="text-xs text-muted-foreground font-mono">LAP RECORDS</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/run-lists" className="group">
          <Card className="h-full gt-card-shine transition-all hover:border-chart-4 hover:shadow-lg hover:shadow-chart-4/20 border-l-4 border-l-chart-4 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 sm:p-2.5 bg-chart-4/15 border border-chart-4/20">
                  <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-chart-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 uppercase tracking-tight group-hover:text-chart-4 transition-colors">Sessions</h3>
                  <p className="text-xs text-muted-foreground font-mono">RUN MANAGEMENT</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
