'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SearchableComboBox } from '@/components/ui/searchable-combobox'
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
import { ArrowLeft, Save, Wrench, Settings, User } from 'lucide-react'
import { BuildUpgradesTab } from '@/components/builds/BuildUpgradesTab'
import { BuildTuningTab } from '@/components/builds/BuildTuningTab'
import { LoadingSection } from '@/components/ui/loading'
import { formatCarOptions } from '@/lib/dropdown-helpers'
import type { DbCar } from '@/types/database'

interface ApiUser {
  id: string
  name: string | null
  email: string
  role: 'PENDING' | 'USER' | 'ADMIN'
}

export default function NewBuildPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cars, setCars] = useState<DbCar[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Form fields
  const [carId, setCarId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUpgrades, setSelectedUpgrades] = useState<Record<string, boolean>>({})
  const [tuningSettings, setTuningSettings] = useState<Record<string, string>>({})
  // Gear ratios as direct fields
  const [gears, setGears] = useState<Record<string, string>>({
    finalDrive: '',
    gear1: '',
    gear2: '',
    gear3: '',
    gear4: '',
    gear5: '',
    gear6: '',
    // Gears 7-20 can be added dynamically
  })
  const [visibleGearCount, setVisibleGearCount] = useState(6) // Start with 6 gears

  useEffect(() => {
    fetchUsers()
    fetchCars()

    // Pre-select car if carId is in query params
    const preselectedCarId = searchParams.get('carId')
    if (preselectedCarId) {
      setCarId(preselectedCarId)
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?active=true')
      const data = await response.json()

      // Get current user info
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()

      if (sessionData.user) {
        // Find current user in the list and set as default
        const activeUsers = data.users || []
        setUsers(activeUsers)
        const currentUserInList = activeUsers.find((u: ApiUser) => u.email === sessionData.user.email)
        if (currentUserInList) {
          setCurrentUser({ id: currentUserInList.id, role: currentUserInList.role })
          setSelectedUserId(currentUserInList.id)
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

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

  // Format car options for SearchableComboBox
  const carOptions = useMemo(() => formatCarOptions(cars), [cars])

  // Format user options for SearchableComboBox
  const userOptions = useMemo(() => {
    return users.map(user => ({
      value: user.id,
      label: user.name || user.email,
      subtitle: user.email,
    }))
  }, [users])

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

  const handleGearChange = (gearKey: string, value: string) => {
    setGears((prev) => ({
      ...prev,
      [gearKey]: value,
    }))
  }

  const handleAddGear = () => {
    if (visibleGearCount < 20) {
      setVisibleGearCount((prev) => prev + 1)
    }
  }

  const handleRemoveGear = (gearNumber: number) => {
    setGears((prev) => {
      const updated = { ...prev }
      delete updated[`gear${gearNumber}`]
      return updated
    })
    if (gearNumber === visibleGearCount) {
      setVisibleGearCount((prev) => Math.max(6, prev - 1))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!carId || !name) {
      setShowValidationDialog(true)
      return
    }

    setSaving(true)

    try {
      // Convert selected upgrades to array of partIds
      const upgrades = Object.entries(selectedUpgrades)
        .filter(([_, selected]) => selected)
        .map(([partId]) => ({ partId }))

      // Convert tuning settings to array of settingIds (standard settings only)
      const settings = Object.entries(tuningSettings)
        .map(([settingId, value]) => ({ settingId, value }))

      const response = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          name,
          description: description || null,
          isPublic,
          userId: currentUser?.role === 'ADMIN' && selectedUserId !== currentUser.id ? selectedUserId : null,
          upgrades,
          settings,
          // Include gears as direct fields
          ...gears,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create build')
      }

      const data = await response.json()
      router.push(`/builds/${data.id}`)
    } catch (error) {
      console.error('Error creating build:', error)
      setErrorMessage('Failed to create build')
      setShowErrorDialog(true)
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
            <SearchableComboBox
              options={carOptions}
              value={carId}
              onValueChange={setCarId}
              placeholder="Select a car"
              searchPlaceholder="Search cars..."
              disabled={saving}
              isLoading={loading}
              grouped
              virtualized
            />
          </div>

          {/* Build Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Build Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Street Racing Setup, Track Day Special"
              className="min-h-[44px]"
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
              className="min-h-[44px]"
              rows={4}
            />
          </div>

          {/* Creator Selection (Admin only) */}
          {currentUser?.role === 'ADMIN' && (
            <div className="space-y-2">
              <Label htmlFor="creator">Creator</Label>
              <SearchableComboBox
                options={userOptions}
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder="Select creator"
                searchPlaceholder="Search users..."
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                As an admin, you can create builds on behalf of other users
              </p>
            </div>
          )}

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
            onSettingDelete={handleTuningSettingDelete}
            gears={gears}
            onGearChange={handleGearChange}
            onAddGear={handleAddGear}
            onRemoveGear={handleRemoveGear}
            visibleGearCount={visibleGearCount}
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

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation Error</DialogTitle>
            <DialogDescription>
              Please select a car and enter a build name before saving.
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
