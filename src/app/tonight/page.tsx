'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSection } from '@/components/ui/loading'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Car as CarIcon,
  Wrench,
  List,
  GripVertical,
} from 'lucide-react'

interface RunList {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  isActive: boolean
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

interface SortableRaceItemProps {
  entry: RunList['entries'][0]
  index: number
  isCurrent: boolean
  isCompleted: boolean
  onClick: () => void
}

function SortableRaceItem({ entry, index, isCurrent, isCompleted, onClick }: SortableRaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`relative border-2 rounded-xl transition-all cursor-pointer ${
        isCurrent
          ? 'border-destructive bg-destructive/5 shadow-lg scale-[1.02]'
          : isCompleted
          ? 'border-secondary/50 bg-secondary/5'
          : 'border-border hover:border-primary/30 bg-card'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none p-2 rounded-lg hover:bg-muted/50"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="pl-12 pr-4 py-4">
        {/* Race Number Badge */}
        <div className="flex items-start justify-between mb-3">
          <Badge
            variant={isCurrent ? 'destructive' : isCompleted ? 'secondary' : 'outline'}
            className="text-sm px-3 py-1"
          >
            {isCurrent ? 'Current Race' : isCompleted ? 'Completed' : `Upcoming • Race ${index}`}
          </Badge>
          {isCompleted && <CheckCircle2 className="h-5 w-5 text-secondary" />}
        </div>

        {/* Track and Car Info */}
        <div className="space-y-3">
          {/* Track */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className={`font-bold ${isCurrent ? 'text-xl' : 'text-lg'}`}>
              {entry.track.name}
              {entry.track.layout && ` - ${entry.track.layout}`}
            </span>
          </div>

          {/* Car */}
          <div className="flex items-center gap-2">
            <CarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {entry.car ? (
              <span className={`font-semibold ${isCurrent ? 'text-lg' : 'text-base'}`}>
                {entry.car.manufacturer} {entry.car.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Any Car</span>
            )}
          </div>

          {/* Build */}
          {entry.build && (
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{entry.build.name}</span>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">{entry.notes}</p>
            </div>
          )}

          {/* Action Buttons - Only show on current race */}
          {isCurrent && (
            <div className="flex gap-2 pt-3">
              <Button asChild size="sm" className="flex-1">
                <Link href="/lap-times/new" onClick={(e) => e.stopPropagation()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lap Time
                </Link>
              </Button>
              {entry.car && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={`/combos/${entry.car.slug}/${entry.track.slug}`}>
                    View Combo
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TonightPage() {
  const [runList, setRunList] = useState<RunList | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentRaceIndex, setCurrentRaceIndex] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchActiveRunList()
  }, [])

  useEffect(() => {
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !runList) {
      return
    }

    const oldIndex = runList.entries.findIndex((e) => e.id === active.id)
    const newIndex = runList.entries.findIndex((e) => e.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistically update UI
    const newEntries = arrayMove(runList.entries, oldIndex, newIndex)
    setRunList({ ...runList, entries: newEntries })

    try {
      // Update order on server (fire and forget)
      fetch(`/api/run-lists/${runList.id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: active.id,
          newOrder: newIndex + 1,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          console.error('Failed to reorder races')
          fetchActiveRunList()
        }
      }).catch((error) => {
        console.error('Error reordering races:', error)
        fetchActiveRunList()
      })
    } catch (error) {
      console.error('Error reordering races:', error)
      fetchActiveRunList()
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="border-dashed max-w-2xl w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Clock className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">No Active Run List</CardTitle>
            <CardDescription className="text-base">
              Set a run list as active to use it for tonight's racing!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild size="lg">
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

  const totalRaces = runList.entries.length
  const progress = {
    total: totalRaces,
    completed: currentRaceIndex,
    remaining: totalRaces - currentRaceIndex,
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Run List Header - Nicer Design */}
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{runList.name}</CardTitle>
              <CardDescription className="text-base">{runList.description}</CardDescription>
            </div>
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              <span className="font-medium">{progress.completed} completed</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">{progress.remaining} remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{progress.total} total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Races List - Drag to Reorder */}
      <Card>
        <CardHeader>
          <CardTitle>Race Schedule</CardTitle>
          <CardDescription>Drag to reorder • Tap to set as current</CardDescription>
        </CardHeader>
        <CardContent>
          {runList.entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No races in this run list</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={runList.entries.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {runList.entries.map((entry, index) => {
                    const isCurrent = index === currentRaceIndex
                    const isCompleted = index < currentRaceIndex

                    return (
                      <SortableRaceItem
                        key={entry.id}
                        entry={entry}
                        index={index + 1}
                        isCurrent={isCurrent}
                        isCompleted={isCompleted}
                        onClick={() => goToRace(index)}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
