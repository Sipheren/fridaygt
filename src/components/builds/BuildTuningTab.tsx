'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface TuningSection {
  id: string
  name: string
  displayOrder: number
}

interface TuningSetting {
  id: string
  sectionId: string
  name: string
  description?: string
  defaultValue?: string
  isActive: boolean
  section: TuningSection
}

interface BuildTuningTabProps {
  tuningSettings: Record<string, string>
  onSettingChange: (settingId: string, value: string) => void
}

export function BuildTuningTab({ tuningSettings, onSettingChange }: BuildTuningTabProps) {
  const [sections, setSections] = useState<TuningSection[]>([])
  const [settings, setSettings] = useState<TuningSetting[]>([])
  const [activeSection, setActiveSection] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [sectionsRes, settingsRes] = await Promise.all([
          fetch('/api/tuning-settings/sections'),
          fetch('/api/tuning-settings')
        ])

        if (!sectionsRes.ok) throw new Error('Failed to fetch sections')
        if (!settingsRes.ok) throw new Error('Failed to fetch settings')

        const sectionsData = await sectionsRes.json()
        const settingsData = await settingsRes.json()

        setSections(sectionsData.sections)
        setSettings(settingsData.settings)

        // Set first section as active if none selected
        if (sectionsData.sections.length > 0) {
          setActiveSection(sectionsData.sections[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tuning data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Only fetch once on mount

  // Get the active section data
  const activeSectionObj = sections.find((s) => s.name === activeSection)
  const activeSectionSettings = settings.filter((s) => s.sectionId === activeSectionObj?.id)

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
      {/* Section Tabs (Left Side) */}
      <Card className="w-full sm:w-64 p-2">
        <div className="flex flex-row sm:flex-col gap-1">
          {sections.map((section) => (
            <Button
              key={section.id}
              type="button"
              variant={activeSection === section.name ? 'default' : 'ghost'}
              className={cn(
                'justify-start min-h-[44px]',
                activeSection === section.name
                  ? 'bg-primary text-primary-foreground'
                  : ''
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
            {activeSectionSettings.length} settings
          </p>
        </div>

        <div className="overflow-y-auto h-[580px] pr-4">
          <div className="space-y-4">
            {activeSectionSettings.map((setting) => {
              const currentValue = tuningSettings[setting.id] || ''

              return (
                <div key={setting.id} className="space-y-2">
                  <Label htmlFor={setting.id} className="text-sm font-medium">
                    {setting.name}
                  </Label>
                  <Input
                    id={setting.id}
                    type="text"
                    value={currentValue}
                    onChange={(e) =>
                      onSettingChange(setting.id, e.target.value)
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
