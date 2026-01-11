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
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <LoadingSection text="Loading GT7 garage..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">CARS</h1>
        <p className="text-muted-foreground font-mono text-sm">
          {filteredCars.length} VEHICLES AVAILABLE
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="car-search"
            name="car-search"
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
              <Button variant="outline" className="font-mono">
                BRAND: {selectedManufacturer === 'all' ? 'ALL' : selectedManufacturer}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => setSelectedManufacturer('all')}>
                ALL
              </DropdownMenuItem>
              {manufacturers.map((mfr) => (
                <DropdownMenuItem key={mfr} onClick={() => setSelectedManufacturer(mfr)}>
                  {mfr}
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
              className="font-mono"
              size="sm"
            >
              {cat === 'all' ? 'ALL' : getCategoryDisplay(cat).toUpperCase()}
            </Button>
          ))}

          {/* Drive Type Filter */}
          {driveTypes.map((drive) => (
            <Button
              key={drive}
              variant={selectedDrive === drive ? 'default' : 'outline'}
              onClick={() => setSelectedDrive(drive)}
              className="font-mono"
              size="sm"
            >
              {drive === 'all' ? 'ALL DRIVES' : getDriveDisplay(drive)}
            </Button>
          ))}
        </div>
      </div>

      {/* Car Table */}
      <div className="space-y-3">
        <div className="bg-muted/30 border border-border rounded-lg px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-mono font-semibold text-muted-foreground uppercase">
            <div className="col-span-5">Car Name</div>
            <div className="col-span-3">Manufacturer</div>
            <div className="col-span-1">Year</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1 text-right">Drive</div>
          </div>
        </div>

        {filteredCars.map((car) => (
          <div
            key={car.id}
            onClick={() => router.push(`/cars/${car.slug}`)}
            className="grid grid-cols-12 gap-4 px-6 py-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent/30 hover:shadow-sm hover:shadow-accent/10 transition-all cursor-pointer group"
          >
            <div className="col-span-5 font-semibold group-hover:text-accent transition-colors">
              {car.name}
            </div>
            <div className="col-span-3 text-sm text-muted-foreground font-mono">
              {car.manufacturer}
            </div>
            <div className="col-span-1 text-sm font-bold tabular-nums">
              {car.year || '-'}
            </div>
            <div className="col-span-2">
              <Badge variant="outline" className={`text-xs ${getCategoryColor(car.category)}`}>
                {getCategoryDisplay(car.category)}
              </Badge>
            </div>
            <div className="col-span-1 text-right">
              {car.driveType && (
                <Badge variant="outline" className={`text-xs ${getDriveColor(car.driveType)}`}>
                  {getDriveDisplay(car.driveType)}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCars.length === 0 && (
        <div className="border border-border rounded-lg p-12">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">NO CARS FOUND</p>
            <p className="text-sm text-muted-foreground font-mono">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
