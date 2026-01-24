'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Wrench, Lock, Globe, User, Trash2, Pencil } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper, PageHeader, EmptyState, SearchBar } from '@/components/layout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'mine'>('all')
  const [loading, setLoading] = useState(true)
  const [deletingBuildId, setDeletingBuildId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Derived state - computed from builds and search
  const filteredBuilds = useMemo(() => {
    if (!search) {
      return builds
    }

    const query = search.toLowerCase()
    return builds.filter(
      (build) =>
        build.name.toLowerCase().includes(query) ||
        build.description?.toLowerCase().includes(query) ||
        build.car.name.toLowerCase().includes(query) ||
        build.car.manufacturer.toLowerCase().includes(query) ||
        build.user.name?.toLowerCase().includes(query) ||
        build.user.email.toLowerCase().includes(query)
    )
  }, [builds, search])

  useEffect(() => {
    fetchBuilds()
  }, [filter])

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
    } catch (error) {
      console.error('Error fetching builds:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBuild = async (buildId: string) => {
    setPendingDeleteId(buildId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return

    setDeletingBuildId(pendingDeleteId)
    setShowDeleteDialog(false)

    try {
      const res = await fetch(`/api/builds/${pendingDeleteId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error || 'Failed to delete build')
        setShowErrorDialog(true)
        return
      }

      // Refresh the builds list
      await fetchBuilds()
    } catch (error) {
      console.error('Error deleting build:', error)
      setErrorMessage('Failed to delete build')
      setShowErrorDialog(true)
    } finally {
      setDeletingBuildId(null)
      setPendingDeleteId(null)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading builds..." />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* Header */}
      <PageHeader
        title="BUILDS"
        icon={Wrench}
        description={`${builds.length} ${builds.length === 1 ? 'build' : 'builds'} available`}
        actions={
          <Button asChild className="gap-2 min-h-[44px]">
            <Link href="/builds/new">
              <Plus className="h-4 w-4" />
              Create Build
            </Link>
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <SearchBar
          placeholder="Search builds, cars, or creators..."
          value={search}
          onChange={setSearch}
        />
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
            className="min-h-[44px] text-xs"
          >
            All Builds
          </Button>
          <Button
            variant={filter === 'public' ? 'default' : 'outline'}
            onClick={() => setFilter('public')}
            size="sm"
            className="min-h-[44px] text-xs"
          >
            <Globe className="h-3 w-3 mr-2" />
            Public
          </Button>
          <Button
            variant={filter === 'mine' ? 'default' : 'outline'}
            onClick={() => setFilter('mine')}
            size="sm"
            className="min-h-[44px] text-xs"
          >
            <User className="h-3 w-3 mr-2" />
            My Builds
          </Button>
        </div>
      </div>

      {/* Builds List */}
      {filteredBuilds.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            builds.length === 0
              ? 'No builds found'
              : search || filter !== 'all'
              ? 'No builds match your search or filter'
              : 'No builds found'
          }
          actions={
            filter === 'mine' && builds.length === 0 && (
              <Button asChild>
                <Link href="/builds/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Build
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredBuilds.map((build) => (
            <div
              key={build.id}
              className="group relative flex items-start gap-2 gt-hover-card"
            >
              <Link href={`/builds/${build.id}`} className="flex-1 min-w-0">
                <div className="flex items-start gap-3 w-full p-3 sm:p-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Build Name */}
                    <div className="pr-12 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base sm:text-lg block truncate">
                          {build.name}
                        </span>
                        <Badge
                          variant={build.isPublic ? 'default' : 'secondary'}
                          className="text-xs shrink-0"
                        >
                          {build.isPublic ? (
                            <>
                              <Globe className="h-3 w-3 mr-1" />
                              Public
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </>
                          )}
                        </Badge>
                      </div>
                      {build.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {build.description}
                        </p>
                      )}
                    </div>

                    {/* Car */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{build.car.manufacturer}</span>
                      <span>•</span>
                      <span className="truncate">{build.car.name}</span>
                      {build.car.year && (
                        <>
                          <span>•</span>
                          <span>'{String(build.car.year).slice(-2)}</span>
                        </>
                      )}
                    </div>

                    {/* Creator */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{build.user.name || build.user.email}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Action Buttons */}
              <div className="p-2 sm:p-4 shrink-0 flex gap-1">
                {/* Edit Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push(`/builds/${build.id}/edit`)
                  }}
                  className="shrink-0 h-11 w-11 sm:h-9 sm:w-9"
                  title="Edit build"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteBuild(build.id)
                  }}
                  disabled={deletingBuildId === build.id}
                  className="gt-hover-icon-btn-destructive shrink-0 h-11 w-11 sm:h-9 sm:w-9"
                  title="Delete build"
                >
                  {deletingBuildId === build.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Build?</DialogTitle>
            <DialogDescription>
              This will permanently delete this build. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setPendingDeleteId(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Build
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
    </PageWrapper>
  )
}
