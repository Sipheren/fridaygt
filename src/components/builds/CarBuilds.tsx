'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Plus, Globe, Lock, User, Calendar } from 'lucide-react'
import Link from 'next/link'

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
  _count?: {
    upgrades: number
    settings: number
  }
}

interface Statistics {
  totalBuilds: number
  publicBuilds: number
  privateBuilds: number
}

interface CarBuildsProps {
  carId: string
  carName: string
}

export function CarBuilds({ carId, carName }: CarBuildsProps) {
  const [builds, setBuilds] = useState<Build[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchBuilds()
  }, [carId])

  const fetchBuilds = async () => {
    try {
      const response = await fetch(`/api/builds?carId=${carId}`)
      const data = await response.json()

      const buildsData = data.builds || []
      setBuilds(buildsData)

      // Calculate statistics
      const stats = {
        totalBuilds: buildsData.length,
        publicBuilds: buildsData.filter((b: Build) => b.isPublic).length,
        privateBuilds: buildsData.filter((b: Build) => !b.isPublic).length,
      }
      setStatistics(stats)
    } catch (error) {
      console.error('Error fetching builds:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="h-6 bg-muted/20 rounded w-48 animate-pulse"></div>
          <div className="h-32 bg-muted/20 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">
            BUILDS FOR THIS CAR
            {statistics && statistics.totalBuilds > 0 && (
              <Badge variant="outline" className="ml-2 text-primary border-primary/30">
                {statistics.totalBuilds} {statistics.totalBuilds === 1 ? 'BUILD' : 'BUILDS'}
              </Badge>
            )}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/builds/new?carId=${carId}`)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Build
          </Button>
          <Button
            onClick={() => router.push('/builds')}
            size="sm"
            variant="outline"
          >
            View All Builds
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && statistics.totalBuilds > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Total Builds</p>
            <p className="text-2xl font-bold tabular-nums">{statistics.totalBuilds}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Public</p>
            <p className="text-2xl font-bold tabular-nums text-primary">{statistics.publicBuilds}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono uppercase">Private</p>
            <p className="text-2xl font-bold tabular-nums">{statistics.privateBuilds}</p>
          </div>
        </div>
      )}

      {/* No Builds Message */}
      {builds.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <Wrench className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">NO BUILDS YET</p>
            <p className="text-sm text-muted-foreground">
              No builds have been created for the {carName} yet.
            </p>
          </div>
          <Button
            onClick={() => router.push(`/builds/new?carId=${carId}`)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create First Build
          </Button>
        </div>
      )}

      {/* Builds Grid */}
      {builds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builds.map((build) => (
            <Link
              key={build.id}
              href={`/builds/${build.id}`}
              className="border border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors group"
            >
              {/* Build Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                    {build.name}
                  </h3>
                  {build.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {build.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={build.isPublic ? 'default' : 'outline'}
                  className="flex items-center gap-1 text-xs"
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

              {/* Build Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{build.user.name || build.user.email.split('@')[0]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className="font-mono">{formatDate(build.createdAt)}</span>
                </div>
              </div>

              {/* Part Counts */}
              {build._count && (
                <div className="flex gap-2">
                  {build._count.upgrades > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {build._count.upgrades} {build._count.upgrades === 1 ? 'Part' : 'Parts'}
                    </Badge>
                  )}
                  {build._count.settings > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {build._count.settings} {build._count.settings === 1 ? 'Setting' : 'Settings'}
                    </Badge>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
