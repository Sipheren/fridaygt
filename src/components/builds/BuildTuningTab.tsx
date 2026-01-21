'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  displayValue?: string
  isActive: boolean
  inputType?: string
  decimalPlaces?: number | null
  minValue?: number | null
  maxValue?: number | null
  step?: number | null
  unit?: string | null
  options?: string[] | null
  section: TuningSection
}

interface BuildTuningTabProps {
  tuningSettings: Record<string, string>
  onSettingChange: (settingId: string, value: string) => void
}

// Helper function to render the appropriate input based on inputType
function renderSettingInput(
  setting: TuningSetting,
  currentValue: string,
  onChange: (value: string) => void
) {
  const inputType = setting.inputType || 'text'

  // SELECT dropdown
  if (inputType === 'select' && setting.options && setting.options.length > 0) {
    return (
      <Select
        value={currentValue || setting.displayValue || setting.options[0]}
        onValueChange={onChange}
      >
        <SelectTrigger className="min-h-[44px] w-full">
          <SelectValue placeholder="Select option..." />
        </SelectTrigger>
        <SelectContent>
          {setting.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // NUMBER or DECIMAL
  if (inputType === 'number' || inputType === 'decimal') {
    const step = setting.step || (inputType === 'decimal' ? 0.01 : 1)
    const min = setting.minValue ?? undefined
    const max = setting.maxValue ?? undefined

    return (
      <div className="flex items-center gap-2">
        <Input
          id={setting.id}
          type="number"
          step={step}
          min={min}
          max={max}
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter value..."
          className="min-h-[44px] w-full"
        />
        {setting.unit && (
          <span className="text-sm text-muted-foreground whitespace-nowrap min-w-fit">
            {setting.unit}
          </span>
        )}
      </div>
    )
  }

  // RATIO format (e.g., "0:100" for Front/Rear Torque Distribution)
  if (inputType === 'ratio') {
    // Parse current value as "front:rear"
    const [front = 0, rear = 100] = currentValue.split(':').map(Number)

    return (
      <div className="flex items-center gap-2">
        <Input
          id={`${setting.id}-front`}
          type="number"
          step={1}
          min={0}
          max={100}
          value={front}
          onChange={(e) => onChange(`${e.target.value}:${rear}`)}
          placeholder="Front"
          className="min-h-[44px] flex-1 text-center"
        />
        <span className="text-muted-foreground font-medium">:</span>
        <Input
          id={`${setting.id}-rear`}
          type="number"
          step={1}
          min={0}
          max={100}
          value={rear}
          onChange={(e) => onChange(`${front}:${e.target.value}`)}
          placeholder="Rear"
          className="min-h-[44px] flex-1 text-center"
        />
      </div>
    )
  }

  // Default TEXT input
  return (
    <Input
      id={setting.id}
      type="text"
      value={currentValue}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
      className="min-h-[44px] w-full"
    />
  )
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
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Section Navigation */}
      {/* Mobile: Dropdown selector */}
      <div className="sm:hidden w-full">
        <Select value={activeSection} onValueChange={setActiveSection}>
          <SelectTrigger className="min-h-[44px] w-full">
            <SelectValue placeholder="Select section..." />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.name}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Vertical sidebar tabs */}
      <Card className="hidden sm:block w-64 p-2">
        <div className="flex flex-col gap-1">
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
      <Card className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{activeSection}</h3>
          <p className="text-sm text-muted-foreground">
            {activeSectionSettings.length} settings
          </p>
        </div>

        <div className="overflow-y-auto flex-1 pr-4">
          <div className="space-y-4">
            {activeSectionSettings.map((setting) => {
              const currentValue = tuningSettings[setting.id] || ''

              return (
                <div key={setting.id} className="space-y-2">
                  <Label htmlFor={setting.id} className="text-sm font-medium">
                    {setting.name}
                  </Label>
                  {renderSettingInput(setting, currentValue, (value) =>
                    onSettingChange(setting.id, value)
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
