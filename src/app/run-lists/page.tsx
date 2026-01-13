'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Globe, Lock, User, Calendar, List, Radio, ListChecks } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface RunList {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  entries: { count: number }[]
}

export default function RunListsPage() {
  const router = useRouter()
  const [runLists, setRunLists] = useState<RunList[]>([])
  const [filteredRunLists, setFilteredRunLists] = useState<RunList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'my'>('all')

  useEffect(() => {
    fetchRunLists()
  }, [filter])

  useEffect(() => {
    filterRunLists()
  }, [searchQuery, runLists])

  const fetchRunLists = async () => {
    setLoading(true)
    try {
      let url = '/api/run-lists'
      const params = new URLSearchParams()

      if (filter === 'public') {
        params.append('public', 'true')
      } else if (filter === 'my') {
        params.append('myLists', 'true')
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setRunLists(data.runLists || [])
      } else {
        console.error('Error fetching run lists:', data.error)
        setRunLists([])
      }
    } catch (error) {
      console.error('Error fetching run lists:', error)
      setRunLists([])
    } finally {
      setLoading(false)
    }
  }

  const filterRunLists = () => {
    if (!searchQuery.trim()) {
      setFilteredRunLists(runLists)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = runLists.filter(list =>
      list.name.toLowerCase().includes(query) ||
      list.description?.toLowerCase().includes(query) ||
      list.createdBy.name.toLowerCase().includes(query)
    )
    setFilteredRunLists(filtered)
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus

    // Optimistic update - update UI immediately
    setRunLists(prev =>
      prev.map(list =>
        list.id === id
          ? { ...list, isActive: newStatus }
          : list
      )
    )

    try {
      const res = await fetch(`/api/run-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to toggle active status')

      // If successful, refresh to get server state
      fetchRunLists()
    } catch (error) {
      console.error('Error toggling active status:', error)

      // Revert optimistic update on error
      setRunLists(prev =>
        prev.map(list =>
          list.id === id
            ? { ...list, isActive: currentStatus }
            : list
        )
      )

      alert('Failed to update active status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ListChecks className="h-8 w-8 text-primary" />
              RUN LISTS
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage racing session playlists
            </p>
          </div>
          <Button onClick={() => router.push('/run-lists/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Run List
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="run-list-search"
              name="run-list-search"
              type="text"
              placeholder="Search run lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All Lists
            </Button>
            <Button
              variant={filter === 'public' ? 'default' : 'outline'}
              onClick={() => setFilter('public')}
            >
              Public
            </Button>
            <Button
              variant={filter === 'my' ? 'default' : 'outline'}
              onClick={() => setFilter('my')}
            >
              My Lists
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && <LoadingSection text="Loading run lists..." />}

        {/* Run Lists Grid */}
        {!loading && filteredRunLists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRunLists.map((runList) => (
              <Card
                key={runList.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/run-lists/${runList.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{runList.name}</CardTitle>
                    <Badge variant={runList.isPublic ? 'default' : 'secondary'}>
                      {runList.isPublic ? (
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
                  <CardDescription className="line-clamp-2">
                    {runList.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div
                      className="flex items-center justify-between gap-2 pb-3 border-b"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <Radio className={`h-4 w-4 ${runList.isActive ? 'text-secondary animate-pulse' : ''}`} />
                        <Label
                          htmlFor={`active-${runList.id}`}
                          className={`cursor-pointer ${runList.isActive ? 'text-secondary font-semibold' : ''}`}
                        >
                          {runList.isActive ? 'Active Run List' : 'Set as Active'}
                        </Label>
                      </div>
                      <Switch
                        id={`active-${runList.id}`}
                        checked={runList.isActive}
                        onCheckedChange={() => toggleActive(runList.id, runList.isActive)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      <span>{runList.entries?.length || 0} races</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{runList.createdBy.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(runList.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRunLists.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <List className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No run lists found</h3>
              <p className="text-muted-foreground text-center mb-6">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : filter === 'my'
                  ? "You haven't created any run lists yet"
                  : 'No run lists available'}
              </p>
              {filter === 'my' && (
                <Button onClick={() => router.push('/run-lists/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Run List
                </Button>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  )
}
