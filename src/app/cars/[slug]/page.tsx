'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CarLapTimes } from '@/components/lap-times/CarLapTimes'
import { CarBuilds } from '@/components/builds/CarBuilds'
import { ArrowLeft, Car as CarIcon, Gauge, Weight, Zap, Settings } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
  year: number | null
  category: string | null
  driveType: string | null
  displacement: number | null
  maxPower: number | null
  maxTorque: number | null
  weight: number | null
  pp: number | null
  imageUrl: string | null
  country: string | null
}

export default function CarDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCar()
  }, [params.slug])

  const fetchCar = async () => {
    try {
      const response = await fetch(`/api/cars/${params.slug}`)
      const data = await response.json()
      setCar(data.car || null)
    } catch (error) {
      console.error('Error fetching car:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryDisplay = (category: string | null) => {
    if (!category) return ''
    switch (category) {
      case 'GR4':
        return 'Gr.4'
      case 'GR3':
        return 'Gr.3'
      case 'GR2':
        return 'Gr.2'
      case 'GR1':
        return 'Gr.1'
      case 'RALLY':
        return 'Gr.B Rally'
      case 'KART':
        return 'Kart'
      case 'VISION_GT':
        return 'Vision GT'
      case 'OTHER':
        return 'Other'
      default:
        if (category.startsWith('N')) return category
        return category
    }
  }

  const getDriveDisplay = (drive: string | null) => {
    if (!drive) return ''
    return drive === 'AWD' ? '4WD' : drive
  }

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-muted text-muted-foreground border-muted'
    if (category.startsWith('GR')) {
      return 'bg-primary/10 text-primary border-primary/20'
    }
    return 'bg-muted text-muted-foreground border-muted'
  }

  const getDriveColor = (drive: string | null) => {
    if (!drive) return 'bg-muted'
    switch (drive) {
      case 'AWD':
        return 'bg-accent/10 text-accent border-accent/20'
      case 'MR':
      case 'RR':
        return 'bg-secondary/10 text-secondary border-secondary/20'
      default:
        return 'bg-muted/50 text-muted-foreground border-muted'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <LoadingSection text="Loading car..." />
      </div>
    )
  }

  if (!car) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/cars')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cars
        </Button>
        <div className="border border-border rounded-lg p-12">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">CAR NOT FOUND</p>
            <p className="text-sm text-muted-foreground font-mono">
              The requested vehicle could not be found
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/cars')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cars
      </Button>

      {/* Car Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">{car.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-mono text-muted-foreground">{car.manufacturer}</span>
              {car.year && (
                <Badge variant="outline" className="font-mono">
                  {car.year}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {car.category && (
              <Badge
                className={`${getCategoryColor(car.category)} text-sm`}
                variant="outline"
              >
                {getCategoryDisplay(car.category)}
              </Badge>
            )}
            {car.driveType && (
              <Badge
                className={`${getDriveColor(car.driveType)} text-sm`}
                variant="outline"
              >
                {getDriveDisplay(car.driveType)}
              </Badge>
            )}
          </div>
        </div>

        {/* Car Image Placeholder */}
        <div className="relative w-full h-64 bg-muted/30 rounded-lg border border-border flex items-center justify-center">
          <div className="text-center space-y-2">
            <CarIcon className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground font-mono">Vehicle Image</p>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Power */}
        <div className="border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-mono uppercase">Power</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {car.maxPower ? `${car.maxPower} HP` : 'N/A'}
          </p>
        </div>

        {/* Torque */}
        <div className="border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span className="text-sm font-mono uppercase">Torque</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {car.maxTorque ? `${car.maxTorque} ft-lb` : 'N/A'}
          </p>
        </div>

        {/* Weight */}
        <div className="border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Weight className="h-4 w-4" />
            <span className="text-sm font-mono uppercase">Weight</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {car.weight ? `${car.weight} kg` : 'N/A'}
          </p>
        </div>

        {/* PP */}
        <div className="border border-border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-mono uppercase">PP</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {car.pp || 'N/A'}
          </p>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold">TECHNICAL SPECIFICATIONS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-mono uppercase">Manufacturer</p>
            <p className="font-semibold">{car.manufacturer}</p>
          </div>
          {car.year && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono uppercase">Year</p>
              <p className="font-semibold">{car.year}</p>
            </div>
          )}
          {car.country && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono uppercase">Country</p>
              <p className="font-semibold">{car.country}</p>
            </div>
          )}
          {car.driveType && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono uppercase">Drivetrain</p>
              <p className="font-semibold">{getDriveDisplay(car.driveType)}</p>
            </div>
          )}
          {car.displacement && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono uppercase">Displacement</p>
              <p className="font-semibold">{car.displacement} cc</p>
            </div>
          )}
          {car.category && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono uppercase">Category</p>
              <p className="font-semibold">{getCategoryDisplay(car.category)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lap Times Section */}
      <CarLapTimes carSlug={car.slug} carName={car.name} />

      {/* Builds Section */}
      <CarBuilds carId={car.id} carName={car.name} />
    </div>
  )
}
