'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowLeft, Save, Wrench, Settings } from 'lucide-react'
import upgradesData from '@/data/gt7-upgrades.json'
import tuningData from '@/data/gt7-tuning.json'
import { LoadingSection } from '@/components/ui/loading'

interface BuildUpgrade {
  id: string
  category: string
  part: string
  value: string | null
}

interface BuildSetting {
  id: string
  category: string
  setting: string
  value: string
}

interface Build {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  carId: string
  car: {
    id: string
    name: string
    manufacturer: string
    year: number | null
  }
  upgrades: BuildUpgrade[]
  settings: BuildSetting[]
}

export default function EditBuildPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [carName, setCarName] = useState('')
  const [selectedUpgrades, setSelectedUpgrades] = useState<Record<string, boolean>>({})
  const [tuningSettings, setTuningSettings] = useState<Record<string, number>>({})

  useEffect(() => {
    params.then((p) => {
      setId(p.id)
      fetchBuild(p.id)
    })
  }, [])

  const fetchBuild = async (buildId: string) => {
    try {
      const response = await fetch(`/api/builds/${buildId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch build')
      }
      const data: Build = await response.json()

      // Set form fields
      setName(data.name)
      setDescription(data.description || '')
      setIsPublic(data.isPublic)
      setCarName(`${data.car.manufacturer} ${data.car.name}${data.car.year ? ` '${String(data.car.year).slice(-2)}` : ''}`)

      // Convert upgrades to checkbox state
      const upgradesMap: Record<string, boolean> = {}
      data.upgrades.forEach((upgrade) => {
        const key = `${upgrade.category}:${upgrade.part}`
        upgradesMap[key] = true
      })
      setSelectedUpgrades(upgradesMap)

      // Convert settings to slider state
      const settingsMap: Record<string, number> = {}
      data.settings.forEach((setting) => {
        const key = `${setting.category}:${setting.setting}`
        settingsMap[key] = parseFloat(setting.value)
      })
      setTuningSettings(settingsMap)
    } catch (error) {
      console.error('Error fetching build:', error)
      alert('Failed to load build')
      router.push('/builds')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeToggle = (category: string, partName: string) => {
    const key = `${category}:${partName}`
    setSelectedUpgrades((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleTuningSetting = (category: string, settingId: string, value: number) => {
    const key = `${category}:${settingId}`
    setTuningSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name) {
      alert('Please enter a build name')
      return
    }

    setSaving(true)

    try {
      // Convert selected upgrades to array
      const upgrades = Object.entries(selectedUpgrades)
        .filter(([_, selected]) => selected)
        .map(([key]) => {
          const [category, part] = key.split(':')
          return { category, part, value: null }
        })

      // Convert tuning settings to array
      const settings = Object.entries(tuningSettings)
        .map(([key, value]) => {
          const [category, setting] = key.split(':')
          return { category, setting, value: String(value) }
        })

      const response = await fetch(`/api/builds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          isPublic,
          upgrades,
          settings,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update build')
      }

      router.push(`/builds/${id}`)
    } catch (error) {
      console.error('Error updating build:', error)
      alert('Failed to update build')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading build..." />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Back Button */}
      <Button type="button" variant="ghost" onClick={() => router.push(`/builds/${id}`)} className="h-11 px-4 sm:h-9">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Build
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          EDIT BUILD
        </h1>
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Build Information</CardTitle>
          <CardDescription>Basic details about your build</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Car (Read-only) */}
          <div className="space-y-2">
            <Label>Car</Label>
            <div className="px-3 py-2 border border-border rounded-lg bg-muted/50 text-sm">
              {carName}
            </div>
            <p className="text-xs text-muted-foreground">
              Car cannot be changed after creation
            </p>
          </div>

          {/* Build Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Build Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Street Racing Setup, Track Day Special"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your build setup, tuning philosophy, or notes"
              rows={4}
            />
          </div>

          {/* Public Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-border rounded-lg p-3 sm:p-4">
            <div className="space-y-1">
              <Label htmlFor="public" className="text-base font-semibold">
                Make Public
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow other users to view and clone this build
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="min-h-[44px] data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upgrades and Tuning Tabs */}
      <Tabs defaultValue="upgrades" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upgrades">
            <Wrench className="h-4 w-4 mr-2" />
            Upgrades & Parts
          </TabsTrigger>
          <TabsTrigger value="tuning">
            <Settings className="h-4 w-4 mr-2" />
            Tuning Settings
          </TabsTrigger>
        </TabsList>

        {/* Upgrades Tab */}
        <TabsContent value="upgrades" className="space-y-4">
          {Object.entries(upgradesData.upgradeCategories).map(([categoryKey, category]) => (
            <Card key={categoryKey}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {category.parts.map((part) => {
                    const key = `${categoryKey}:${part.name}`
                    return (
                      <div
                        key={part.id}
                        className="flex items-center space-x-2 border border-border rounded-lg p-3 hover:bg-accent/5 transition-colors min-h-[44px]"
                      >
                        <Checkbox
                          id={part.id}
                          checked={selectedUpgrades[key] || false}
                          onCheckedChange={() =>
                            handleUpgradeToggle(categoryKey, part.name)
                          }
                          className="min-h-[24px] min-w-[44px]"
                        />
                        <Label
                          htmlFor={part.id}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {part.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tuning Tab */}
        <TabsContent value="tuning" className="space-y-4">
          {Object.entries(tuningData.tuningCategories).map(([categoryKey, category]) => (
            <Card key={categoryKey}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {category.settings.map((setting) => {
                  const key = `${categoryKey}:${setting.id}`
                  const currentValue = tuningSettings[key] ?? setting.default

                  return (
                    <div key={setting.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={setting.id} className="text-sm font-medium">
                          {setting.name}
                        </Label>
                        <span className="text-sm font-mono text-primary">
                          {currentValue}
                          {setting.unit && ` ${setting.unit}`}
                        </span>
                      </div>
                      <Slider
                        id={setting.id}
                        min={setting.min}
                        max={setting.max}
                        step={setting.step}
                        value={[currentValue]}
                        onValueChange={([value]) =>
                          handleTuningSetting(categoryKey, setting.id, value)
                        }
                        className="w-full"
                      />
                      {setting.description && (
                        <p className="text-xs text-muted-foreground">
                          {setting.description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
