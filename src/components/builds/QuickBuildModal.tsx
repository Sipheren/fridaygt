'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableComboBox } from '@/components/ui/searchable-combobox'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCarOptions } from '@/lib/dropdown-helpers'
import type { DbCar } from '@/types/database'

interface QuickBuildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBuildCreated?: (buildId: string) => void
  preselectedCarId?: string
}

export function QuickBuildModal({
  open,
  onOpenChange,
  onBuildCreated,
  preselectedCarId,
}: QuickBuildModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cars, setCars] = useState<DbCar[]>([])
  const [carsLoading, setCarsLoading] = useState(false)
  const [formData, setFormData] = useState({
    carId: preselectedCarId || '',
    name: '',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch cars when modal opens
  useEffect(() => {
    if (open && cars.length === 0) {
      fetchCars()
    }
  }, [open])

  const fetchCars = async () => {
    try {
      setCarsLoading(true)
      const response = await fetch('/api/cars')
      if (!response.ok) throw new Error('Failed to fetch cars')
      const data = await response.json()
      setCars(data.cars || [])
    } catch (err) {
      console.error('Error fetching cars:', err)
      setError('Failed to load cars')
    } finally {
      setCarsLoading(false)
    }
  }

  // Pass through open change to parent
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.carId) {
      setError('Please select a car')
      return
    }

    if (!formData.name.trim()) {
      setError('Please enter a build name')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/builds/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: formData.carId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create build')
      }

      const build = await response.json()

      // Call callback if provided
      if (onBuildCreated) {
        onBuildCreated(build.id)
      }

      // Reset form and close modal
      setFormData({
        carId: preselectedCarId || '',
        name: '',
        description: '',
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating build:', err)
      setError(err instanceof Error ? err.message : 'Failed to create build')
    } finally {
      setLoading(false)
    }
  }

  // Format car options for SearchableComboBox
  const carOptions = formatCarOptions(cars)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Quick Build</DialogTitle>
          <DialogDescription>
            Create a basic build setup. You can add upgrades and tuning settings
            later from the builds page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Car Selection */}
          <div className="space-y-2">
            <Label htmlFor="car">Car *</Label>
            <SearchableComboBox
              options={carOptions}
              value={formData.carId}
              onValueChange={(value) =>
                setFormData({ ...formData, carId: value })
              }
              placeholder="Select a car"
              searchPlaceholder="Search cars..."
              disabled={loading}
              isLoading={carsLoading}
              error={cars.length === 0 && !carsLoading ? "Failed to load cars" : undefined}
              grouped
              virtualized
            />
          </div>

          {/* Build Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Build Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Nürburgring Setup, Spa Quali..."
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this build..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Build
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
