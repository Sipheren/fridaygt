'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSection } from '@/components/ui/loading'
import { formatLapTime } from '@/lib/time'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Trophy,
  MapPin,
  Car as CarIcon,
  CheckCircle2,
} from 'lucide-react'

interface Session {
  id: string
  name: string
  date: string
  status: string
  currentEntryOrder: number | null
  runList: {
    id: string
    name: string
    description: string | null
    createdBy: {
      email: string
    }
    entries: Array<{
      id: string
      order: number
      notes: string | null
      track: {
        id: string
        name: string
        slug: string
        layout: string | null
      }
      car: {
        id: string
        name: string
        slug: string
        manufacturer: string
      } | null
      build: {
        id: string
        name: string
      } | null
    }>
  }
  attendance: Array<{
    user: {
      id: string
      email: string
    }
    status: string
    joinedAt: string
    leftAt: string | null
  }>
}

export default function SessionHistoryPage() {
  const params = useParams()
  const id = params?.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSession()
  }, [id])

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${id}`)
      if (!res.ok) throw new Error('Failed to fetch session')
      const data = await res.json()
      setSession(data.session)
    } catch (error) {
      console.error('Error fetching session:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSection text="Loading session..." />
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold">Session not found</p>
        <Button asChild className="mt-4">
          <Link href="/run-lists">Back to Run Lists</Link>
        </Button>
      </div>
    )
  }

  const statusColor = {
    SCHEDULED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    IN_PROGRESS: 'bg-green-500/10 text-green-500 border-green-500/20',
    COMPLETED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
  }[session.status]

  const presentAttendees = session.attendance?.filter((a) => a.status === 'PRESENT') || []
  const totalEntries = session.runList.entries.length

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/run-lists">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Run Lists
          </Link>
        </Button>
      </div>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{session.name}</CardTitle>
              <CardDescription>
                <Link href={`/run-lists/${session.runList.id}`} className="hover:text-primary">
                  {session.runList.name}
                </Link>
              </CardDescription>
            </div>
            <Badge className={statusColor} variant="outline">
              {session.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(session.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{presentAttendees.length} attendees</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>{totalEntries} entries</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Session Lineup</CardTitle>
          <CardDescription>All races from this session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {session.runList.entries
              .sort((a, b) => a.order - b.order)
              .map((entry) => {
                const wasCompleted = session.currentEntryOrder
                  ? entry.order <= session.currentEntryOrder
                  : false

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-4 border border-border rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border-2">
                      {wasCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-secondary" />
                      ) : (
                        <span className="text-sm font-bold">{entry.order}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {entry.track.name}
                        {entry.track.layout && ` - ${entry.track.layout}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.car ? `${entry.car.manufacturer} ${entry.car.name}` : 'Any Car'}
                        {entry.build && ` • ${entry.build.name}`}
                      </div>
                    </div>
                    {entry.car && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/combos/${entry.car.slug}/${entry.track.slug}`}>
                          View Race Details
                        </Link>
                      </Button>
                    )}
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Attendance */}
      {presentAttendees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Who participated in this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {presentAttendees.map((attendance, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span className="font-medium">{attendance.user.email}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Joined {new Date(attendance.joinedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created by</span>
            <span className="font-medium">{session.runList.createdBy.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">
              {new Date(session.date).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge className={statusColor} variant="outline">
              {session.status.replace('_', ' ')}
            </Badge>
          </div>
          {session.currentEntryOrder && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {session.currentEntryOrder} of {totalEntries} entries
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
