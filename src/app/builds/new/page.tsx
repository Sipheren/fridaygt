'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { BuildUpgradesTab } from '@/components/builds/BuildUpgradesTab'
import { BuildTuningTab } from '@/components/builds/BuildTuningTab'
import { LoadingSection } from '@/components/ui/loading'

interface Car {
  id: string
  name: string
  manufacturer: string
  year: number | null
}

interface SelectedUpgrade {
  category: string
  part: string
}

interface SelectedSetting {
  section: string
  setting: string
  value: string
}

export default function NewBuildPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [carId, setCarId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [selectedUpgrades, setSelectedUpgrades] = useState<Record<string, boolean>>({})
  const [tuningSettings, setTuningSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCars()

    // Pre-select car if carId is in query params
    const preselectedCarId = searchParams.get('carId')
    if (preselectedCarId) {
      setCarId(preselectedCarId)
    }
  }, [])

  const fetchCars = async () => {
    try {
      const response = await fetch('/api/cars')
      const data = await response.json()
      setCars(data.cars || [])
    } catch (error) {
      console.error('Error fetching cars:', error)
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

  const handleTuningSetting = (section: string, setting: string, value: string) => {
    const key = `${section}:${setting}`
    setTuningSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!carId || !name) {
      alert('Please select a car and enter a build name')
      return
    }

    setSaving(true)

    try {
      // Convert selected upgrades to array
      const upgrades: SelectedUpgrade[] = Object.entries(selectedUpgrades)
        .filter(([_, selected]) => selected)
        .map(([key]) => {
          const [category, part] = key.split(':')
          return { category, part }
        })

      // Convert tuning settings to array
      const settings: SelectedSetting[] = Object.entries(tuningSettings)
        .filter(([_, value]) => value.trim() !== '')
        .map(([key, value]) => {
          const [section, setting] = key.split(':')
          return { section, setting, value }
        })

      const response = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          name,
          description: description || null,
          isPublic,
          upgrades,
          settings,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create build')
      }

      const data = await response.json()
      router.push(`/builds/${data.id}`)
    } catch (error) {
      console.error('Error creating build:', error)
      alert('Failed to create build')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading cars..." />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Back Button */}
      <Button type="button" variant="ghost" onClick={() => router.push('/builds')} className="h-11 px-4 sm:h-9">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Builds
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          CREATE NEW BUILD
        </h1>
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Build'}
        </Button>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Build Information</CardTitle>
          <CardDescription>Basic details about your build</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Car Selection */}
          <div className="space-y-2">
            <Label htmlFor="car">Car *</Label>
            <Select value={carId} onValueChange={setCarId} required>
              <SelectTrigger id="car">
                <SelectValue placeholder="Select a car" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {cars.map((car) => (
                  <SelectItem key={car.id} value={car.id}>
                    {car.manufacturer} {car.name}
                    {car.year && ` '${String(car.year).slice(-2)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="flex items-center justify-between space-x-2 border border-border rounded-lg p-4">
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
        <TabsContent value="upgrades">
          <BuildUpgradesTab
            selectedUpgrades={selectedUpgrades}
            onUpgradeToggle={handleUpgradeToggle}
          />
        </TabsContent>

        {/* Tuning Tab */}
        <TabsContent value="tuning">
          <BuildTuningTab
            tuningSettings={tuningSettings}
            onSettingChange={handleTuningSetting}
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Build'}
        </Button>
      </div>
    </form>
  )
}
