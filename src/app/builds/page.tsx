'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus, Wrench, Lock, Globe, User } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'

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
  }
}

export default function BuildsPage() {
  const router = useRouter()
  const [builds, setBuilds] = useState<Build[]>([])
  const [filteredBuilds, setFilteredBuilds] = useState<Build[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'mine'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBuilds()
  }, [filter])

  useEffect(() => {
    filterBuilds()
  }, [search, builds])

  const fetchBuilds = async () => {
    try {
      setLoading(true)
      let url = '/api/builds'

      if (filter === 'public') {
        url += '?public=true'
      } else if (filter === 'mine') {
        url += '?myBuilds=true'
      }

      const response = await fetch(url)
      const data = await response.json()
      setBuilds(data.builds || [])
      setFilteredBuilds(data.builds || [])
    } catch (error) {
      console.error('Error fetching builds:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBuilds = () => {
    if (!search) {
      setFilteredBuilds(builds)
      return
    }

    const query = search.toLowerCase()
    const filtered = builds.filter(
      (build) =>
        build.name.toLowerCase().includes(query) ||
        build.description?.toLowerCase().includes(query) ||
        build.car.name.toLowerCase().includes(query) ||
        build.car.manufacturer.toLowerCase().includes(query) ||
        build.user.name?.toLowerCase().includes(query) ||
        build.user.email.toLowerCase().includes(query)
    )
    setFilteredBuilds(filtered)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading builds..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            BUILDS
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredBuilds.length} {filteredBuilds.length === 1 ? 'build' : 'builds'} available
          </p>
        </div>
        <Button asChild>
          <Link href="/builds/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Build
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="build-search"
            name="build-search"
            placeholder="Search builds, cars, or creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            ALL BUILDS
          </Button>
          <Button
            variant={filter === 'public' ? 'default' : 'outline'}
            onClick={() => setFilter('public')}
            size="sm"
          >
            <Globe className="h-3 w-3 mr-2" />
            PUBLIC
          </Button>
          <Button
            variant={filter === 'mine' ? 'default' : 'outline'}
            onClick={() => setFilter('mine')}
            size="sm"
          >
            <User className="h-3 w-3 mr-2" />
            MY BUILDS
          </Button>
        </div>
      </div>

      {/* Builds Grid */}
      {filteredBuilds.length === 0 ? (
        <div className="border border-border rounded-lg py-12">
          <div className="text-center space-y-4">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">NO BUILDS FOUND</p>
              <p className="text-sm text-muted-foreground font-mono">
                {search
                  ? 'Try adjusting your search'
                  : filter === 'mine'
                  ? 'Create your first build to get started'
                  : 'No builds available yet'}
              </p>
            </div>
            {filter === 'mine' && !search && (
              <Button asChild>
                <Link href="/builds/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Build
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBuilds.map((build) => (
            <div
              key={build.id}
              onClick={() => router.push(`/builds/${build.id}`)}
              className="border border-border rounded-lg p-4 sm:p-6 hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm hover:shadow-primary/10 transition-all cursor-pointer group space-y-4"
            >
              {/* Build Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {build.name}
                  </h3>
                  <Badge
                    variant={build.isPublic ? 'default' : 'outline'}
                    className="flex items-center gap-1"
                  >
                    {build.isPublic ? (
                      <>
                        <Globe className="h-3.5 w-3.5 sm:h-3 sm:w-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 sm:h-3 sm:w-3 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>

                {build.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {build.description}
                  </p>
                )}
              </div>

              {/* Car Info */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono">
                  {build.car.manufacturer}
                </Badge>
                <span className="text-muted-foreground">
                  {build.car.name}
                  {build.car.year && ` '${String(build.car.year).slice(-2)}`}
                </span>
              </div>

              {/* Creator & Date */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {build.user.name || build.user.email}
                </div>
                <div>
                  {new Date(build.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
