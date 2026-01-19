'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Car {
  id: string
  name: string
  slug: string
  manufacturer: string
  year?: number
}

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  car: Car
}

interface BuildSelectorProps {
  selectedBuilds: string[]
  onBuildsChange: (buildIds: string[]) => void
  onCreateNew?: () => void
  allowDuplicateCars?: boolean
  placeholder?: string
  disabled?: boolean
}

export function BuildSelector({
  selectedBuilds,
  onBuildsChange,
  onCreateNew,
  allowDuplicateCars = true,
  placeholder = 'Select builds...',
  disabled = false,
}: BuildSelectorProps) {
  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)

  // Fetch builds
  useEffect(() => {
    const fetchBuilds = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/builds?myBuilds=true')
        if (!response.ok) throw new Error('Failed to fetch builds')
        const data = await response.json()
        setBuilds(data.builds || [])
      } catch (error) {
        console.error('Error fetching builds:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBuilds()
  }, [])

  // Filter builds based on search
  const filteredBuilds = builds.filter((build) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      build.name.toLowerCase().includes(searchLower) ||
      build.car?.manufacturer.toLowerCase().includes(searchLower) ||
      build.car?.name.toLowerCase().includes(searchLower)
    )
  })

  // Group builds by car
  const buildsByCar = filteredBuilds.reduce((acc, build) => {
    const carKey = `${build.car?.manufacturer} ${build.car?.name}`
    if (!acc[carKey]) {
      acc[carKey] = []
    }
    acc[carKey].push(build)
    return acc
  }, {} as Record<string, Build[]>)

  // Get selected build objects
  const selectedBuildObjects = builds.filter((b) =>
    selectedBuilds.includes(b.id)
  )

  // Toggle build selection and close dropdown
  const toggleBuild = (buildId: string) => {
    if (selectedBuilds.includes(buildId)) {
      onBuildsChange(selectedBuilds.filter((id) => id !== buildId))
    } else {
      onBuildsChange([...selectedBuilds, buildId])
    }
    // Close dropdown after selection for better UX
    setOpen(false)
  }

  // Remove build from selection
  const removeBuild = (buildId: string) => {
    onBuildsChange(selectedBuilds.filter((id) => id !== buildId))
  }

  // Clear all selections
  const clearAll = () => {
    onBuildsChange([])
  }

  return (
    <div className="space-y-3">
      {/* Selected Builds Display */}
      {selectedBuildObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
          {selectedBuildObjects.map((build) => (
            <Badge
              key={build.id}
              variant="secondary"
              className="px-3 py-1.5 text-sm flex items-center gap-2"
            >
              <span className="font-medium">
                {build.car?.manufacturer} {build.car?.name}
              </span>
              <span className="text-muted-foreground">·</span>
              <span>{build.name}</span>
              {!disabled && (
                <button
                  onClick={() => removeBuild(build.id)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {selectedBuildObjects.length > 1 && !disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !open && 'h-20'
          )}
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
        >
          {selectedBuildObjects.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="text-sm">
              {selectedBuildObjects.length} build
              {selectedBuildObjects.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </Button>

        {open && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-96 flex flex-col">
            {/* Search Input */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search builds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Create New Button */}
            {onCreateNew && (
              <div className="p-2 border-b">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    onCreateNew()
                    setOpen(false)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Build
                </Button>
              </div>
            )}

            {/* Build List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading builds...
                </div>
              ) : filteredBuilds.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No builds found' : 'No builds yet'}
                </div>
              ) : (
                <div className="p-2">
                  {Object.entries(buildsByCar).map(([carName, carBuilds]) => (
                    <div key={carName} className="mb-3 last:mb-0">
                      {/* Car Header */}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                        {carName}
                      </div>

                      {/* Builds for this car */}
                      {carBuilds.map((build) => {
                        const isSelected = selectedBuilds.includes(build.id)
                        return (
                          <div
                            key={build.id}
                            className={cn(
                              'flex items-start gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors',
                              isSelected && 'bg-accent'
                            )}
                            onClick={() => toggleBuild(build.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleBuild(build.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                {build.name}
                              </div>
                              {build.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {build.description}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      {allowDuplicateCars && (
        <p className="text-xs text-muted-foreground">
          You can select multiple builds from the same car
        </p>
      )}
    </div>
  )
}
