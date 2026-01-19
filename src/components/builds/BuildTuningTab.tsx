'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TUNING_SECTIONS } from '@/data/builds/tuning-settings'

interface BuildTuningTabProps {
  tuningSettings: Record<string, string>
  onSettingChange: (section: string, setting: string, value: string) => void
}

export function BuildTuningTab({ tuningSettings, onSettingChange }: BuildTuningTabProps) {
  const [activeSection, setActiveSection] = useState('Suspension')

  // Get the active section data
  const activeSectionData = TUNING_SECTIONS.find((s) => s.name === activeSection)

  return (
    <div className="flex flex-col sm:flex-row gap-4 h-[700px]">
      {/* Section Tabs (Left Side) */}
      <Card className="w-full sm:w-64 p-2">
        <div className="flex flex-row sm:flex-col gap-1">
          {TUNING_SECTIONS.map((section) => (
            <Button
              key={section.name}
              type="button"
              variant={activeSection === section.name ? 'default' : 'ghost'}
              className={cn(
                'justify-start min-h-[44px]',
                activeSection === section.name
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-primary/5'
              )}
              onClick={() => setActiveSection(section.name)}
            >
              {section.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Settings Inputs (Right Side) */}
      <Card className="flex-1 p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{activeSection}</h3>
          <p className="text-sm text-muted-foreground">
            {activeSectionData?.settings.length || 0} settings
          </p>
        </div>

        <div className="overflow-y-auto h-[580px] pr-4">
          <div className="space-y-4">
            {activeSectionData?.settings.map((setting) => {
              const key = `${activeSection}:${setting}`
              const currentValue = tuningSettings[key] || ''

              return (
                <div key={setting} className="space-y-2">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {setting}
                  </Label>
                  <Input
                    id={key}
                    type="text"
                    value={currentValue}
                    onChange={(e) =>
                      onSettingChange(activeSection, setting, e.target.value)
                    }
                    placeholder="Enter value..."
                    className="min-h-[44px]"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
