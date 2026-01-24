'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { Loader2, Plus } from 'lucide-react'

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
  displayOrder?: number | null
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

interface CustomGear {
  name: string
  value: string
}

interface BuildTuningTabProps {
  tuningSettings: Record<string, string>
  onSettingChange: (settingId: string, value: string) => void
  onSettingDelete?: (settingId: string) => void
  // Gear props (gears are now direct build fields, not settings)
  gears: Record<string, string>
  onGearChange: (gearKey: string, value: string) => void
  onAddGear: () => void
  onRemoveGear: (gearNumber: number) => void
  visibleGearCount: number
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

  // DUAL input (front:rear split for suspension settings)
  if (inputType === 'dual') {
    // Parse current value as "front:rear"
    const [front = '', rear = ''] = currentValue.split(':')

    return (
      <div className="flex items-center gap-2">
        <Input
          id={`${setting.id}-front`}
          type="text"
          inputMode="decimal"
          value={front}
          onChange={(e) => onChange(`${e.target.value}:${rear}`)}
          placeholder="Front"
          className="min-h-[44px] flex-1"
        />
        <Input
          id={`${setting.id}-rear`}
          type="text"
          inputMode="decimal"
          value={rear}
          onChange={(e) => onChange(`${front}:${e.target.value}`)}
          placeholder="Rear"
          className="min-h-[44px] flex-1"
        />
      </div>
    )
  }

  // NUMBER or DECIMAL
  if (inputType === 'number' || inputType === 'decimal') {
    return (
      <div className="flex items-center gap-2">
        <Input
          id={setting.id}
          type="text"
          inputMode="decimal"
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
    const [front = '', rear = ''] = currentValue.split(':')

    return (
      <div className="flex items-center gap-2">
        <Input
          id={`${setting.id}-front`}
          type="text"
          inputMode="numeric"
          value={front}
          onChange={(e) => onChange(`${e.target.value}:${rear}`)}
          placeholder="Front"
          className="min-h-[44px] flex-1 text-center"
        />
        <span className="text-muted-foreground font-medium">:</span>
        <Input
          id={`${setting.id}-rear`}
          type="text"
          inputMode="numeric"
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

export function BuildTuningTab({
  tuningSettings,
  onSettingChange,
  onSettingDelete,
  gears,
  onGearChange,
  onAddGear,
  onRemoveGear,
  visibleGearCount,
}: BuildTuningTabProps) {
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

  // Helper to get ordinal suffix (1st, 2nd, 3rd, etc.) - memoized
  const getOrdinalSuffix = useCallback((n: number): string => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }, [])

  // Get the active section data - memoized
  const activeSectionObj = useMemo(
    () => sections.find((s) => s.name === activeSection),
    [sections, activeSection]
  )

  // Get active section settings - memoized to avoid re-filtering on every render
  const activeSectionSettings = useMemo(() => {
    let filtered = settings.filter((s) => s.sectionId === activeSectionObj?.id)

    // For Transmission: only show Final Drive (gears are handled separately via props)
    const isTransmission = activeSection === 'Transmission'
    if (isTransmission) {
      filtered = filtered.filter(s => s.name === 'Final Drive')
    }

    return filtered
  }, [settings, activeSectionObj, activeSection])

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
            {activeSection === 'Transmission'
              ? `${activeSectionSettings.length + visibleGearCount} settings`
              : `${activeSectionSettings.length} settings`
            }
          </p>
        </div>

        <div className="overflow-y-auto flex-1 pr-4">
          <div className="space-y-4">
            {activeSection === 'Transmission' ? (
              <>
                {/* Render gears 1-6 or more based on visibleGearCount */}
                {Array.from({ length: visibleGearCount }, (_, i) => {
                  const gearNumber = i + 1
                  const gearKey = `gear${gearNumber}`
                  const currentValue = gears[gearKey] || ''
                  return (
                    <div key={gearKey} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {gearNumber}{getOrdinalSuffix(gearNumber)} Gear
                        </Label>
                        {gearNumber > 6 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveGear(gearNumber)}
                            className="text-destructive hover:text-destructive h-8 px-2"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={currentValue}
                        onChange={(e) => onGearChange(gearKey, e.target.value)}
                        placeholder="Enter gear ratio..."
                        className="min-h-[44px]"
                      />
                    </div>
                  )
                })}

                {/* Add Gear Button (only show if we have less than 20 gears) */}
                {visibleGearCount < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAddGear}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Gear
                  </Button>
                )}

                {/* Final Drive at bottom */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label className="text-sm font-medium">Final Drive</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={gears.finalDrive || ''}
                    onChange={(e) => onGearChange('finalDrive', e.target.value)}
                    placeholder="Enter final drive ratio..."
                    className="min-h-[44px]"
                  />
                </div>
              </>
            ) : (
              /* Non-transmission sections: render normally */
              activeSectionSettings.map((setting) => {
                const currentValue = tuningSettings[setting.id] || ''

                return (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={setting.id} className="text-sm font-medium">
                      {setting.name}
                      {setting.unit && (
                        <span className="text-muted-foreground font-normal ml-1">
                          ({setting.unit})
                        </span>
                      )}
                    </Label>
                    {renderSettingInput(setting, currentValue, (value) =>
                      onSettingChange(setting.id, value)
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
