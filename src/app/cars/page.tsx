'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Car as CarIcon } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
  year: number | null
  category: string
  driveType: string | null
}

export default function CarsPage() {
  const router = useRouter()
  const [cars, setCars] = useState<Car[]>([])
  const [filteredCars, setFilteredCars] = useState<Car[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDrive, setSelectedDrive] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const categories = ['all', 'N', 'GR4', 'GR3', 'GR2', 'GR1', 'RALLY']
  const driveTypes = ['all', 'FF', 'FR', 'MR', 'RR', 'AWD']

  useEffect(() => {
    fetchCars()
  }, [])

  useEffect(() => {
    filterCars()
  }, [search, selectedManufacturer, selectedCategory, selectedDrive, cars])

  const fetchCars = async () => {
    try {
      const response = await fetch('/api/cars')
      const data = await response.json()
      setCars(data.cars || [])
      setFilteredCars(data.cars || [])
      setManufacturers(data.manufacturers || [])
    } catch (error) {
      console.error('Error fetching cars:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryDisplay = (category: string) => {
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
        // For N100, N200, etc., show as-is
        if (category.startsWith('N')) return category
        return category
    }
  }

  const getDriveDisplay = (drive: string | null) => {
    if (!drive) return ''
    return drive === 'AWD' ? '4WD' : drive
  }

  const filterCars = () => {
    let filtered = cars

    if (search) {
      filtered = filtered.filter(car =>
        car.name.toLowerCase().includes(search.toLowerCase()) ||
        car.manufacturer.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (selectedManufacturer !== 'all') {
      filtered = filtered.filter(car => car.manufacturer === selectedManufacturer)
    }

    if (selectedCategory !== 'all') {
      // For "N" category, match any N-class (N100, N200, etc.)
      if (selectedCategory === 'N') {
        filtered = filtered.filter(car => car.category?.startsWith('N'))
      } else {
        filtered = filtered.filter(car => car.category === selectedCategory)
      }
    }

    if (selectedDrive !== 'all') {
      filtered = filtered.filter(car => car.driveType === selectedDrive)
    }

    // Sort by manufacturer A-Z, then by name
    filtered.sort((a, b) => {
      if (a.manufacturer !== b.manufacturer) {
        return a.manufacturer.localeCompare(b.manufacturer)
      }
      return a.name.localeCompare(b.name)
    })

    setFilteredCars(filtered)
  }

  const getCategoryColor = (category: string) => {
    if (category.startsWith('Gr.')) {
      return 'bg-primary/10 text-primary border-primary/20'
    }
    return 'bg-muted text-muted-foreground border-muted'
  }

  const getDriveColor = (drive: string | null) => {
    if (!drive) return 'bg-muted'
    switch (drive) {
      case '4WD':
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
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading GT7 garage..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CarIcon className="h-8 w-8 text-accent" />
            CARS
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredCars.length} {filteredCars.length === 1 ? 'vehicle' : 'vehicles'} available
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cars or manufacturers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Manufacturer Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-[44px] text-xs">
                BRAND: {selectedManufacturer === 'all' ? 'ALL' : selectedManufacturer.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => setSelectedManufacturer('all')}>
                ALL
              </DropdownMenuItem>
              {manufacturers.map((mfr) => (
                <DropdownMenuItem key={mfr} onClick={() => setSelectedManufacturer(mfr)}>
                  {mfr.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Category Filter */}
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              size="sm"
              className="min-h-[44px] text-xs"
            >
              {cat === 'all' ? 'ALL CATS' : getCategoryDisplay(cat).toUpperCase()}
            </Button>
          ))}

          {/* Drive Type Filter */}
          {driveTypes.map((drive) => (
            <Button
              key={drive}
              variant={selectedDrive === drive ? 'default' : 'outline'}
              onClick={() => setSelectedDrive(drive)}
              size="sm"
              className="min-h-[44px] text-xs"
            >
              {drive === 'all' ? 'ALL DRIVES' : getDriveDisplay(drive).toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Cars List */}
      {filteredCars.length === 0 ? (
        <div className="border border-border rounded-lg py-12">
          <div className="text-center space-y-4">
            <CarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">NO CARS FOUND</p>
              <p className="text-sm text-muted-foreground font-mono">
                {search || selectedManufacturer !== 'all' || selectedCategory !== 'all' || selectedDrive !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No cars available'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCars.map((car) => (
            <Link
              key={car.id}
              href={`/cars/${car.slug}`}
              className="block"
            >
              <div className="border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer group">
                <div className="p-3 sm:p-4">
                  <div className="space-y-2">
                    {/* Car Name */}
                    <div className="min-w-0">
                      <span className="font-semibold text-base sm:text-lg block truncate group-hover:text-primary transition-colors">
                        {car.manufacturer} {car.name}
                      </span>
                    </div>

                    {/* Year */}
                    {car.year && (
                      <div className="text-sm text-muted-foreground">
                        {car.year}
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {/* Category */}
                      <Badge className={getCategoryColor(car.category)} variant="outline">
                        {getCategoryDisplay(car.category)}
                      </Badge>

                      {/* Drive Type */}
                      {car.driveType && (
                        <Badge className={getDriveColor(car.driveType)} variant="outline">
                          {getDriveDisplay(car.driveType)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
