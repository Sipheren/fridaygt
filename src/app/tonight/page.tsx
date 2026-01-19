'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSection } from '@/components/ui/loading'
import {
  MapPin,
  Car as CarIcon,
  Radio,
  Settings,
  Flame,
  ChevronRight,
  Flag,
  Trophy,
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
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Empty State Icon */}
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
              <Radio className="h-16 w-16 text-primary" />
            </div>
          </div>

          {/* Empty State Text */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">No Active Races</h2>
            <p className="text-muted-foreground text-lg">
                Ready to race? Set races as active to see them here for tonight's session!
            </p>
          </div>

          {/* CTA Button */}
          <Button asChild size="lg" className="group">
            <Link href="/races">
              <Settings className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Manage Races
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              currentColor 10px,
              currentColor 20px
            )`,
          }}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="text-center space-y-2">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
              </span>
              <span className="text-xs font-semibold text-destructive">LIVE</span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Race List
              </h1>
              <p className="text-sm text-muted-foreground">
                {races.length} {races.length === 1 ? 'active race' : 'active races'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Races List */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="space-y-6">
          {races.map((race, index) => (
            <Link
              key={race.id}
              href={`/races/${race.id}`}
              className="group"
            >
              <Card className="gt-card-shine h-full border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-pointer overflow-hidden">
                <CardContent className="p-0">
                  {/* Race Header */}
                  <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                    {/* Race Number */}
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive text-destructive-foreground font-bold text-sm shadow-lg">
                        {index + 1}
                      </div>
                    </div>

                    {/* Race Name */}
                    <h2 className="text-2xl font-bold pr-14">{getDisplayName(race)}</h2>

                    {/* Track Info */}
                    <div className="flex items-center gap-2 mt-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{race.track.name}</span>
                      {race.track.layout && (
                        <span className="text-sm text-muted-foreground">
                          ({race.track.layout})
                        </span>
                      )}
                      {race.track.location && (
                        <span className="text-xs text-muted-foreground">• {race.track.location}</span>
                      )}
                    </div>
                  </div>

                  {/* Race Details */}
                  <div className="p-6 space-y-4">
                    {/* Builds Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        <CarIcon className="h-4 w-4" />
                        <span>
                          {race.RaceCar.length === 0
                            ? 'No Builds'
                            : race.RaceCar.length === 1
                            ? '1 Build'
                            : `${race.RaceCar.length} Builds`}
                        </span>
                      </div>

                      {race.RaceCar.length > 0 && (
                        <div className="space-y-2">
                          {race.RaceCar.map((rc) => (
                            <div
                              key={rc.id}
                              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors"
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {rc.car.manufacturer} {rc.car.name}
                                  </span>
                                  {rc.build && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <Link
                                        href={`/builds/${rc.build.id}`}
                                        className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {rc.build.name}
                                        <ChevronRight className="h-3 w-3" />
                                      </Link>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Race Configuration */}
                    <div className="flex flex-wrap gap-2">
                      {race.laps && (
                        <Badge variant="secondary" className="gap-1">
                          <Flag className="h-3 w-3" />
                          {race.laps} {race.laps === 1 ? 'Lap' : 'Laps'}
                        </Badge>
                      )}
                      {race.weather && (
                        <Badge variant="outline" className="gap-1">
                          {race.weather === 'Dry' ? (
                            <Flame className="h-3 w-3 text-orange-500" />
                          ) : race.weather === 'Wet' ? (
                            <span>💧</span>
                          ) : (
                            <span>🌤️</span>
                          )}
                          {race.weather}
                        </Badge>
                      )}
                      {race.track.length && (
                        <Badge variant="outline" className="gap-1">
                          <Trophy className="h-3 w-3" />
                          {race.track.length}km
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {race.description && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {race.description}
                        </p>
                      </div>
                    )}

                    {/* View Details CTA */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full group-hover:bg-primary/10 transition-colors"
                        onClick={(e) => e.preventDefault()}
                      >
                        View Race Details
                        <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-gradient-to-r from-muted/50 to-muted border-dashed">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Want to modify tonight's races?
            </p>
            <Button asChild variant="outline" size="lg">
              <Link href="/races">
                <Settings className="h-4 w-4 mr-2" />
                Manage Races
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
