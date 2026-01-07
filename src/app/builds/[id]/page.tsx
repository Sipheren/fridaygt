'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Wrench,
  ArrowLeft,
  Globe,
  Lock,
  Copy,
  Trash2,
  Edit,
  Clock,
  Trophy,
  MapPin,
  Settings,
} from 'lucide-react'
import { formatLapTime } from '@/lib/time'
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
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  car: {
    id: string
    name: string
    slug: string
    manufacturer: string
    year: number | null
    category: string
    driveType: string | null
    maxPower: number | null
    weight: number | null
    pp: number | null
  }
  upgrades: BuildUpgrade[]
  settings: BuildSetting[]
  statistics?: {
    totalLaps: number
    fastestTime: number | null
    averageTime: number | null
    uniqueTracks: number
  }
}

export default function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [build, setBuild] = useState<Build | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [cloning, setCloning] = useState(false)

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
      const data = await response.json()
      setBuild(data)
    } catch (error) {
      console.error('Error fetching build:', error)
      alert('Failed to load build')
      router.push('/builds')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this build?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/builds/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete build')
      }

      router.push('/builds')
    } catch (error) {
      console.error('Error deleting build:', error)
      alert('Failed to delete build')
      setDeleting(false)
    }
  }

  const handleClone = async () => {
    setCloning(true)
    try {
      const response = await fetch(`/api/builds/${id}/clone`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to clone build')
      }

      const data = await response.json()
      router.push(`/builds/${data.id}`)
    } catch (error) {
      console.error('Error cloning build:', error)
      alert('Failed to clone build')
      setCloning(false)
    }
  }

  // Group upgrades by category
  const groupedUpgrades = build?.upgrades.reduce((acc, upgrade) => {
    if (!acc[upgrade.category]) {
      acc[upgrade.category] = []
    }
    acc[upgrade.category].push(upgrade)
    return acc
  }, {} as Record<string, BuildUpgrade[]>) || {}

  // Group settings by category
  const groupedSettings = build?.settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, BuildSetting[]>) || {}

  const formatCategoryName = (category: string) => {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatSettingName = (settingId: string) => {
    return settingId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-6">
        <LoadingSection text="Loading build..." />
      </div>
    )
  }

  if (!build) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center py-12 border border-border rounded-lg">
          <p className="text-lg font-semibold">Build not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push('/builds')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Builds
      </Button>

      {/* Build Header */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{build.name}</h1>
              <Badge
                variant={build.isPublic ? 'default' : 'outline'}
                className="flex items-center gap-1"
              >
                {build.isPublic ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Private
                  </>
                )}
              </Badge>
            </div>
            {build.description && (
              <p className="text-muted-foreground">{build.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClone}
              disabled={cloning}
            >
              <Copy className="h-4 w-4 mr-2" />
              {cloning ? 'Cloning...' : 'Clone'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/builds/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Car Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-mono text-xs">CAR</p>
            <Link
              href={`/cars/${build.car.slug}`}
              className="font-semibold hover:text-primary transition-colors"
            >
              {build.car.manufacturer} {build.car.name}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground font-mono text-xs">CREATOR</p>
            <p className="font-semibold">{build.user.name || build.user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-mono text-xs">CREATED</p>
            <p className="font-semibold">
              {new Date(build.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground font-mono text-xs">UPDATED</p>
            <p className="font-semibold">
              {new Date(build.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {build.statistics && build.statistics.totalLaps > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Statistics
            </CardTitle>
            <CardDescription>
              Performance data from {build.statistics.totalLaps} laps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-muted-foreground text-xs font-mono">TOTAL LAPS</p>
                <p className="text-2xl font-bold">{build.statistics.totalLaps}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-mono">FASTEST LAP</p>
                <p className="text-2xl font-bold text-primary font-mono">
                  {build.statistics.fastestTime
                    ? formatLapTime(build.statistics.fastestTime)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-mono">AVERAGE LAP</p>
                <p className="text-2xl font-bold font-mono">
                  {build.statistics.averageTime
                    ? formatLapTime(build.statistics.averageTime)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-mono">TRACKS</p>
                <p className="text-2xl font-bold">{build.statistics.uniqueTracks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrades */}
      {Object.keys(groupedUpgrades).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Upgrades & Parts
            </CardTitle>
            <CardDescription>
              {build.upgrades.length} parts installed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedUpgrades).map(([category, upgrades]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-primary mb-2">
                  {formatCategoryName(category)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {upgrades.map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="flex items-center justify-between px-3 py-2 border border-border rounded text-sm"
                    >
                      <span>{upgrade.part}</span>
                      {upgrade.value && (
                        <Badge variant="outline" className="text-xs">
                          {upgrade.value}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tuning Settings */}
      {Object.keys(groupedSettings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Tuning Settings
            </CardTitle>
            <CardDescription>
              {build.settings.length} settings configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedSettings).map(([category, settings]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-primary mb-2">
                  {formatCategoryName(category)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {settings.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between px-3 py-2 border border-border rounded text-sm"
                    >
                      <span>{formatSettingName(setting.setting)}</span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {setting.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state if no upgrades or settings */}
      {Object.keys(groupedUpgrades).length === 0 &&
        Object.keys(groupedSettings).length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No upgrades or tuning settings configured
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
