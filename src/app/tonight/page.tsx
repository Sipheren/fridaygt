'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSection } from '@/components/ui/loading'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Car as CarIcon,
  Radio,
  Settings,
} from 'lucide-react'

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
}

interface RaceCar {
  id: string
  carId: string
  buildId: string
  car: Car
  build: {
    id: string
    name: string
    description: string | null
  }
}

interface Track {
  id: string
  name: string
  slug: string
  location: string | null
  category: string
  layout: string | null
  length: number | null
}

interface Race {
  id: string
  name: string | null
  description: string | null
  laps: number | null
  weather: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  track: Track
  RaceCar: RaceCar[]
}

export default function TonightPage() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActiveRaces()
  }, [])

  const fetchActiveRaces = async () => {
    try {
      const res = await fetch('/api/races')
      const data = await res.json()

      // Filter to only active races
      const activeRaces = (data.races || []).filter((race: Race) => race.isActive)
      setRaces(activeRaces)
    } catch (error) {
      console.error('Error fetching active races:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (race: Race): string => {
    if (race.name) return race.name

    const trackName = race.track?.name || 'Unknown Track'
    const firstCar = race.RaceCar?.[0]?.car
    const carName = firstCar ? `${firstCar.manufacturer} ${firstCar.name}` : 'Unknown Car'

    return `${trackName} + ${carName}`
  }

  if (loading) {
    return <LoadingSection text="Loading tonight's races..." />
  }

  if (races.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="border-dashed max-w-2xl w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Radio className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">No Active Races</CardTitle>
            <CardDescription className="text-base">
              Set races as active to see them here for tonight's racing!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild size="lg">
              <Link href="/races">
                <Settings className="h-4 w-4 mr-2" />
                Manage Races
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">Tonight's Races</CardTitle>
              <CardDescription className="text-base">
                {races.length} {races.length === 1 ? 'race' : 'races'} scheduled
              </CardDescription>
            </div>
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <Radio className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Races List */}
      <div className="space-y-4">
        {races.map((race, index) => (
          <Link
            key={race.id}
            href={`/races/${race.id}`}
            className="block"
          >
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Race Number Badge */}
                  <div className="shrink-0">
                    <Badge variant="destructive" className="text-sm px-3 py-1 h-10 flex items-center justify-center">
                      Race {index + 1}
                    </Badge>
                  </div>

                  {/* Race Details */}
                  <div className="flex-1 space-y-3">
                    {/* Race Name */}
                    <h3 className="text-xl font-bold">{getDisplayName(race)}</h3>

                    {/* Track */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">{race.track.name}</span>
                      {race.track.layout && (
                        <span className="text-sm">({race.track.layout})</span>
                      )}
                    </div>

                    {/* Cars */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CarIcon className="h-4 w-4" />
                        <span>
                          {race.RaceCar.length === 0
                            ? 'No cars'
                            : race.RaceCar.length === 1
                            ? '1 car'
                            : `${race.RaceCar.length} cars`}
                        </span>
                      </div>
                      {race.RaceCar.length > 0 && (
                        <div className="pl-6 space-y-1 text-sm">
                          {race.RaceCar.map((rc) => (
                            <div key={rc.id} className="flex items-center gap-2">
                              <span className="font-medium">
                                {rc.car.manufacturer} {rc.car.name}
                              </span>
                              {rc.build && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <Link
                                    href={`/builds/${rc.build.id}`}
                                    className="text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {rc.build.name}
                                  </Link>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Configuration */}
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      {race.laps && (
                        <Badge variant="outline" className="text-xs">
                          {race.laps} laps
                        </Badge>
                      )}
                      {race.weather && (
                        <Badge variant="outline" className="text-xs">
                          {race.weather}
                        </Badge>
                      )}
                      {race.track.length && (
                        <Badge variant="outline" className="text-xs">
                          {race.track.length}km
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {race.description && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">{race.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Want to modify tonight's races?{' '}
            <Link href="/races" className="text-primary hover:underline font-medium">
              Manage races
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
