'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { LoadingSection } from '@/components/ui/loading'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Car as CarIcon,
  Wrench,
  Radio,
  List,
} from 'lucide-react'

interface RunList {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  isActive: boolean
  isLive: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string | null
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
      description: string | null
    } | null
  }>
}

export default function TonightPage() {
  const router = useRouter()
  const [runList, setRunList] = useState<RunList | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentRaceIndex, setCurrentRaceIndex] = useState(0)

  useEffect(() => {
    fetchActiveRunList()
  }, [])

  useEffect(() => {
    // Load saved race position from localStorage
    if (runList) {
      const saved = localStorage.getItem(`runlist-${runList.id}-position`)
      if (saved) {
        setCurrentRaceIndex(parseInt(saved, 10))
      }
    }
  }, [runList?.id])

  const fetchActiveRunList = async () => {
    try {
      const res = await fetch('/api/run-lists/active')
      const data = await res.json()

      setRunList(data.runList || null)
    } catch (error) {
      console.error('Error fetching active run list:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleLive = async () => {
    if (!runList) return

    try {
      const res = await fetch(`/api/run-lists/${runList.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLive: !runList.isLive }),
      })

      if (!res.ok) throw new Error('Failed to toggle live status')

      // Refresh the run list
      fetchActiveRunList()
    } catch (error) {
      console.error('Error toggling live status:', error)
      alert('Failed to update live status')
    }
  }

  const goToRace = (index: number) => {
    if (!runList) return
    setCurrentRaceIndex(index)
    localStorage.setItem(`runlist-${runList.id}-position`, index.toString())
  }

  if (loading) {
    return <LoadingSection text="Loading tonight's races..." />
  }

  if (!runList) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Clock className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">No Active Run List</CardTitle>
            <CardDescription>
              Set a run list as active to use it for tonight's racing!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/run-lists">
                <List className="h-4 w-4 mr-2" />
                View Run Lists
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentRace = runList.entries[currentRaceIndex]
  const totalRaces = runList.entries.length
  const progress = {
    total: totalRaces,
    completed: currentRaceIndex,
    remaining: totalRaces - currentRaceIndex,
    currentPosition: currentRaceIndex + 1,
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Run List Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{runList.name}</CardTitle>
              <CardDescription>{runList.description}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Radio className={`h-5 w-5 ${runList.isLive ? 'text-secondary animate-pulse' : 'text-muted-foreground'}`} />
                <Label htmlFor="live-toggle" className={`cursor-pointer ${runList.isLive ? 'text-secondary font-bold' : ''}`}>
                  {runList.isLive ? 'LIVE' : 'Go Live'}
                </Label>
              </div>
              <Switch
                id="live-toggle"
                checked={runList.isLive}
                onCheckedChange={toggleLive}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>
                {progress.currentPosition} of {progress.total}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Progress</span>
              <span>
                {Math.round((progress.currentPosition / progress.total) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: `${(progress.currentPosition / progress.total) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.completed} completed</span>
              <span>{progress.remaining} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Race */}
      {currentRace && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Current Race</CardTitle>
              <Badge variant="default" className="text-base">
                Race {currentRace.order}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Track */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Track</span>
                </div>
                <Link
                  href={`/tracks/${currentRace.track.slug}`}
                  className="text-xl font-bold hover:text-primary transition-colors block"
                >
                  {currentRace.track.name}
                </Link>
                {currentRace.track.layout && (
                  <p className="text-sm text-muted-foreground">{currentRace.track.layout}</p>
                )}
              </div>

              {/* Car */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CarIcon className="h-4 w-4" />
                  <span>Car</span>
                </div>
                {currentRace.car ? (
                  <Link
                    href={`/cars/${currentRace.car.slug}`}
                    className="text-xl font-bold hover:text-primary transition-colors block"
                  >
                    {currentRace.car.manufacturer} {currentRace.car.name}
                  </Link>
                ) : (
                  <p className="text-xl font-bold text-muted-foreground">Any Car</p>
                )}
              </div>
            </div>

            {/* Build */}
            {currentRace.build && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  <span>Suggested Build</span>
                </div>
                <Link
                  href={`/builds/${currentRace.build.id}`}
                  className="text-lg font-semibold hover:text-primary transition-colors block"
                >
                  {currentRace.build.name}
                </Link>
                {currentRace.build.description && (
                  <p className="text-sm text-muted-foreground">{currentRace.build.description}</p>
                )}
              </div>
            )}

            {/* Notes */}
            {currentRace.notes && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm">{currentRace.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button asChild className="flex-1">
                <Link href="/lap-times/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lap Time
                </Link>
              </Button>
              {currentRace.car && (
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/combos/${currentRace.car.slug}/${currentRace.track.slug}`}>
                    View Combo
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => goToRace(currentRaceIndex - 1)}
              disabled={currentRaceIndex <= 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => goToRace(currentRaceIndex + 1)}
              disabled={currentRaceIndex >= runList.entries.length - 1}
              className="flex-1"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Races */}
      <Card>
        <CardHeader>
          <CardTitle>All Races</CardTitle>
          <CardDescription>Tap to jump to a race</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {runList.entries.map((entry, index) => {
              const isCurrent = index === currentRaceIndex
              const isCompleted = index < currentRaceIndex

              return (
                <div
                  key={entry.id}
                  onClick={() => goToRace(index)}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/10'
                      : isCompleted
                      ? 'border-secondary/50 bg-secondary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border-2">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                    ) : (
                      <span className="text-sm font-bold">{entry.order}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{entry.track.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.car ? `${entry.car.manufacturer} ${entry.car.name}` : 'Any Car'}
                    </div>
                  </div>
                  {isCurrent && (
                    <Badge variant="default">Current</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
