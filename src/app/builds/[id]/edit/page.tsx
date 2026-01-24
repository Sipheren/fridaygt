'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Save, Wrench, Settings } from 'lucide-react'
import { BuildUpgradesTab } from '@/components/builds/BuildUpgradesTab'
import { BuildTuningTab } from '@/components/builds/BuildTuningTab'
import { LoadingSection } from '@/components/ui/loading'

interface Part {
  id: string
  name: string
  categoryId: string
  description?: string
  isActive: boolean
}

interface BuildUpgrade {
  id: string
  category: string
  part: string | Part
  partId?: string
}

interface BuildSetting {
  id: string
  section: string
  setting: string
  value: string
  settingId?: string
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
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [carName, setCarName] = useState('')
  const [selectedUpgrades, setSelectedUpgrades] = useState<Record<string, boolean>>({})
  const [tuningSettings, setTuningSettings] = useState<Record<string, string>>({})

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
        // Use partId if available, otherwise skip (for legacy data)
        if (upgrade.partId) {
          upgradesMap[upgrade.partId] = true
        }
      })
      setSelectedUpgrades(upgradesMap)

      // Convert settings to input state
      const settingsMap: Record<string, string> = {}
      data.settings.forEach((setting) => {
        // Use settingId if available, otherwise skip (for legacy data)
        if (setting.settingId) {
          settingsMap[setting.settingId] = setting.value
        }
      })
      setTuningSettings(settingsMap)
    } catch (error) {
      console.error('Error fetching build:', error)
      setErrorMessage('Failed to load build')
      setShowErrorDialog(true)
      router.push('/builds')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeToggle = (partId: string) => {
    setSelectedUpgrades((prev) => ({
      ...prev,
      [partId]: !prev[partId],
    }))
  }

  const handleTuningSetting = (settingId: string, value: string) => {
    setTuningSettings((prev) => ({
      ...prev,
      [settingId]: value,
    }))
  }

  const handleTuningSettingDelete = (settingId: string) => {
    setTuningSettings((prev) => {
      const updated = { ...prev }
      delete updated[settingId]
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name) {
      setShowValidationDialog(true)
      return
    }

    setSaving(true)

    try {
      // Convert selected upgrades to array of partIds
      const upgrades = Object.entries(selectedUpgrades)
        .filter(([_, selected]) => selected)
        .map(([partId]) => ({ partId }))

      // Convert tuning settings to array of settingIds
      // Note: Include all settings, even empty ones (needed for custom gears placeholder)
      const settings = Object.entries(tuningSettings)
        .map(([settingId, value]) => ({ settingId, value }))

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
      setErrorMessage('Failed to update build')
      setShowErrorDialog(true)
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
          <TabsTrigger value="upgrades" type="button">
            <Wrench className="h-4 w-4 mr-2" />
            Upgrades & Parts
          </TabsTrigger>
          <TabsTrigger value="tuning" type="button">
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
            onSettingDelete={handleTuningSettingDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation Error</DialogTitle>
            <DialogDescription>
              Please enter a build name before saving.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
