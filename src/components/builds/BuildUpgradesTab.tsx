'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PARTS_SHOP_DATA } from '@/data/builds/parts-shop'

interface BuildUpgradesTabProps {
  selectedUpgrades: Record<string, boolean>
  onUpgradeToggle: (category: string, part: string) => void
}

export function BuildUpgradesTab({ selectedUpgrades, onUpgradeToggle }: BuildUpgradesTabProps) {
  const [activeCategory, setActiveCategory] = useState('Sports')

  // Get the active category data
  const activeCategoryData = PARTS_SHOP_DATA.find((c) => c.name === activeCategory)

  return (
    <div className="flex flex-col sm:flex-row gap-4 h-[700px]">
      {/* Category Tabs (Left Side) */}
      <Card className="w-full sm:w-64 p-2">
        <div className="flex flex-row sm:flex-col gap-1">
          {PARTS_SHOP_DATA.map((category) => (
            <Button
              key={category.name}
              type="button"
              variant={activeCategory === category.name ? 'default' : 'ghost'}
              className={cn(
                'justify-start min-h-[44px]',
                activeCategory === category.name
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-primary/5'
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
            {activeCategoryData?.parts.length || 0} parts available
          </p>
        </div>

        <div className="overflow-y-auto h-[580px] pr-4">
          <div className="space-y-2">
            {activeCategoryData?.parts.map((part) => {
              const key = `${activeCategory}:${part}`
              const isChecked = selectedUpgrades[key] || false

              return (
                <div
                  key={part}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-3 transition-colors min-h-[44px]',
                    isChecked
                      ? 'bg-primary/10 border-primary/30'
                      : 'border-border hover:bg-primary/5'
                  )}
                >
                  <Checkbox
                    id={part}
                    checked={isChecked}
                    onCheckedChange={() => onUpgradeToggle(activeCategory, part)}
                    className="min-h-[24px] min-w-[44px]"
                  />
                  <Label
                    htmlFor={part}
                    className="flex-1 cursor-pointer text-sm font-medium"
                  >
                    {part}
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
