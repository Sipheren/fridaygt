'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface PartCategory {
  id: string
  name: string
  displayOrder: number
}

interface Part {
  id: string
  categoryId: string
  name: string
  description?: string
  isActive: boolean
  category: PartCategory
}

interface BuildUpgradesTabProps {
  selectedUpgrades: Record<string, boolean>
  onUpgradeToggle: (partId: string) => void
}

export function BuildUpgradesTab({ selectedUpgrades, onUpgradeToggle }: BuildUpgradesTabProps) {
  const [categories, setCategories] = useState<PartCategory[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [categoriesRes, partsRes] = await Promise.all([
          fetch('/api/parts/categories'),
          fetch('/api/parts')
        ])

        if (!categoriesRes.ok) throw new Error('Failed to fetch categories')
        if (!partsRes.ok) throw new Error('Failed to fetch parts')

        const categoriesData = await categoriesRes.json()
        const partsData = await partsRes.json()

        setCategories(categoriesData.categories)
        setParts(partsData.parts)

        // Set first category as active if none selected
        if (categoriesData.categories.length > 0) {
          setActiveCategory(categoriesData.categories[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load parts data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Only fetch once on mount

  // Get the active category data
  const activeCategoryObj = categories.find((c) => c.name === activeCategory)
  const activeCategoryParts = parts.filter((p) => p.categoryId === activeCategoryObj?.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[700px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[700px]">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 h-[700px]">
      {/* Category Tabs (Left Side) */}
      <Card className="w-full sm:w-64 p-2">
        <div className="flex flex-row sm:flex-col gap-1">
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant={activeCategory === category.name ? 'default' : 'ghost'}
              className={cn(
                'justify-start min-h-[44px]',
                activeCategory === category.name
                  ? 'bg-primary text-primary-foreground'
                  : ''
              )}
              onClick={() => setActiveCategory(category.name)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Parts List (Right Side) */}
      <Card className="flex-1 p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{activeCategory}</h3>
          <p className="text-sm text-muted-foreground">
            {activeCategoryParts.length} parts available
          </p>
        </div>

        <div className="overflow-y-auto h-[580px] pr-4">
          <div className="space-y-2">
            {activeCategoryParts.map((part) => {
              const isChecked = selectedUpgrades[part.id] || false

              return (
                <div
                  key={part.id}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-3 transition-colors min-h-[44px]',
                    isChecked
                      ? 'bg-primary/10 border-primary/30'
                      : 'border-border gt-hover-card'
                  )}
                >
                  <Checkbox
                    id={part.id}
                    checked={isChecked}
                    onCheckedChange={() => onUpgradeToggle(part.id)}
                    className="min-h-[24px] min-w-[44px]"
                  />
                  <Label
                    htmlFor={part.id}
                    className="flex-1 cursor-pointer text-sm font-medium"
                  >
                    {part.name}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
