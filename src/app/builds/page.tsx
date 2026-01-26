/**
 * Builds Listing Page
 *
 * Purpose: Main page for viewing and managing car builds
 * - Lists all builds with search and filtering capabilities
 * - Supports public/private builds with visibility badges
 * - Edit and delete functionality for owned builds
 * - Navigate to build details and creation
 *
 * **Key Features:**
 * - Search: Full-text search across build name, description, car, creator
 * - Filters: All builds, Public only, My builds
 * - Build cards: Display name, car info, creator, visibility badge
 * - Action buttons: Edit, Delete (with confirmation dialog)
 * - Empty states: Contextual messages for no results
 * - Loading states: Loading spinner during data fetch
 *
 * **Data Flow:**
 * 1. Page loads → fetchBuilds() called with filter
 * 2. API call: GET /api/builds?public=true or ?myBuilds=true
 * 3. Builds stored in state → filtered by search term
 * 4. User can click build → Navigate to /builds/[id]
 * 5. User can edit → Navigate to /builds/[id]/edit
 * 6. User can delete → Confirm dialog → DELETE /api/builds/[id]
 *
 * **State Management:**
 * - builds: Array of all builds from API
 * - search: Search query string
 * - filter: 'all' | 'public' | 'mine'
 * - loading: Loading state during fetch
 * - deletingBuildId: ID of build being deleted (for loading state)
 * - showDeleteDialog: Delete confirmation dialog visibility
 * - pendingDeleteId: ID of build pending deletion
 * - showErrorDialog: Error dialog visibility
 * - errorMessage: Error message to display
 *
 * **Filtering Logic:**
 * - All: Shows all builds user can access (public + own)
 * - Public: Only builds with isPublic = true
 * - Mine: Only builds created by current user
 * - Search: Client-side filter by name, description, car, creator
 *
 * **Delete Flow:**
 * 1. User clicks delete → deleteBuild(buildId) called
 * 2. Sets pendingDeleteId → Shows delete confirmation dialog
 * 3. User confirms → confirmDelete() called
 * 4. DELETE /api/builds/[id] → Sets deletingBuildId
 * 5. On success → Refresh builds list
 * 6. On error → Show error dialog, user stays on page
 *
 * **Build Card Display:**
 * - Build name (large, bold)
 * - Visibility badge (Public/Private icon)
 * - Description (optional, line-clamp-1)
 * - Car info (manufacturer • name • year)
 * - Creator name/email fallback
 * - Action buttons (Edit, Delete)
 *
 * **Empty State Logic:**
 * - No builds: "No builds found" + "Create Your First Build" (if filter=mine)
 * - Search/filter: "No builds match your search or filter"
 * - Icon: Wrench icon
 *
 * **API Integration:**
 * - GET /api/builds: Fetch all builds
 * - GET /api/builds?public=true: Fetch public builds only
 * - GET /api/builds?myBuilds=true: Fetch user's builds only
 * - DELETE /api/builds/[id]: Delete a build
 * - Response: { builds: Build[], error?: string }
 *
 * **Access Control:**
 * - Authenticated: User must be logged in
 * - Public builds: Any user can view
 * - Private builds: Only creator can view
 * - Delete: Only creator can delete
 * - Edit: Only creator can edit
 *
 * **Page Layout:**
 * - PageWrapper: Standard container with padding
 * - PageHeader: Title "BUILDS", icon, description, actions
 * - SearchBar: Search input with centered icon
 * - Filter buttons: 3-column grid (All, Public, My Builds)
 * - Build cards: Stacked list with hover effects
 * - Dialogs: Delete confirmation, error display
 *
 * **Styling:**
 * - Cards: gt-hover-card class for hover effects
 * - Buttons: min-h-[44px] for touch targets
 * - Badges: Public (default), Private (secondary)
 * - Loading: LoadingSection component with spinner
 * - Responsive: Mobile-first, stacked on mobile
 *
 * **Navigation:**
 * - Create Build: /builds/new (from header button)
 * - Build Detail: /builds/[id] (from card click)
 * - Edit Build: /builds/[id]/edit (from edit button)
 *
 * **Error Handling:**
 * - Fetch error: Console log, show empty state
 * - Delete error: Show error dialog with message
 * - API returns error: Show error dialog with data.error
 * - User stays: Can retry after error
 *
 * **Optimizations:**
 * - useMemo: Filter builds memoized to avoid re-filter on every render
 * - Client-side search: Faster than API calls for search
 * - Lazy loading: Only fetch when filter changes
 *
 * **Accessibility:**
 * - Button labels: Clear text labels
 * - Touch targets: 44px minimum for mobile
 * - Loading states: Visual feedback during operations
 * - Error messages: Clear, actionable
 *
 * **Debugging Tips:**
 * - Builds not loading: Check API endpoint and auth
 * - Search not working: Check filteredBuilds useMemo logic
 * - Delete not working: Check API permissions and error dialog
 * - Filter not working: Check fetchBuilds URL params
 *
 * **Common Issues:**
 * - No builds shown: Check user has created builds or filter settings
 * - Delete fails: Check user is owner of build
 * - Search not finding: Check search query matches build fields
 * - Filter button active: Check filter state matches URL param
 *
 * **Related Files:**
 * - @/app/builds/new/page.tsx: Create new build
 * - @/app/builds/[id]/page.tsx: Build detail page
 * - @/app/builds/[id]/edit/page.tsx: Edit build page
 * - @/app/api/builds/route.ts: Builds API endpoint
 * - @/components/layout: PageWrapper, PageHeader, EmptyState, SearchBar
 */

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

// ============================================================
// TYPES
// ============================================================
// Build interface from API
// - id: Unique identifier
// - name: Build display name
// - description: Optional build description
// - isPublic: Visibility flag (public/private)
// - createdAt: Creation timestamp
// - updatedAt: Last update timestamp
// - user: Creator info (id, name, email)
// - car: Associated car info (id, name, slug, manufacturer, year)
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
  // ============================================================
  // STATE
  // ============================================================
  // - router: Next.js router for navigation
  // - builds: Array of builds from API
  // - search: Search query string
  // - filter: Current filter (all | public | mine)
  // - loading: Loading state during fetch
  // - deletingBuildId: ID of build being deleted (for loading state)
  // - showDeleteDialog: Delete confirmation dialog visibility
  // - pendingDeleteId: ID of build pending deletion
  // - showErrorDialog: Error dialog visibility
  // - errorMessage: Error message to display
  //
  // Why this state?
  // - builds: Store fetched builds for display and filtering
  // - search: Client-side search for instant feedback
  // - filter: Server-side filter for public/my builds
  // - deletingBuildId: Show loading state on specific build during delete
  // - pendingDeleteId: Track which build is pending deletion in dialog
  // ============================================================

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

  // ============================================================
  // DERIVED STATE - FILTERED BUILDS
  // ============================================================
  // Memoized filtered builds based on search query
  // - Searches: build name, description, car name, car manufacturer, creator name/email
  // - Case-insensitive: Uses toLowerCase() for comparison
  // - Performance: Memoized to avoid re-filter on every render
  // - Client-side: Faster than API calls for search
  //
  // Why useMemo?
  // - Avoid re-filtering builds on every render
  // - Only re-filter when builds or search changes
  // - Better performance for large build lists
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

  // ============================================================
  // DATA FETCHING
  // ============================================================
  // Fetch builds on mount and when filter changes
  // - Calls API with filter param
  // - Updates builds state
  // - Handles errors gracefully
  //
  // Why useEffect?
  // - Fetch on mount: Load builds when page loads
  // - Fetch on filter change: Reload when filter changes
  // - dependency array [filter]: Only refetch when filter changes
  useEffect(() => {
    fetchBuilds()
  }, [filter])

  // Fetch builds from API
  // - Filter: all (default), public (?public=true), mine (?myBuilds=true)
  // - Response: { builds: Build[] }
  // - Error handling: Console log, set loading false
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

  // ============================================================
  // DELETE HANDLERS
  // ============================================================
  // Delete build with confirmation dialog
  // - Step 1: User clicks delete → deleteBuild() called
  // - Step 2: Set pendingDeleteId → Show dialog
  // - Step 3: User confirms → confirmDelete() called
  // - Step 4: Delete API call → Refresh list on success
  //
  // Why two-step process?
  // - Confirmation: Prevent accidental deletion
  // - User control: User can cancel deletion
  // - Better UX: Clear warning before destructive action

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

  // ============================================================
  // LOADING STATE
  // ============================================================
  // Show loading spinner while fetching builds
  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading builds..." />
      </PageWrapper>
    )
  }

  // ============================================================
  // PAGE RENDER
  // ============================================================
  // Main page layout with header, search, filters, and build list
  return (
    <PageWrapper>
      {/* Header */}
      {/* - Title: "BUILDS" with Wrench icon */}
      {/* - Description: Count of builds (singular/plural) */}
      {/* - Actions: Create Build button */}
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
      {/* - SearchBar: Client-side search with icon */}
      {/* - Filter buttons: All, Public, My Builds (3-column grid) */}
      {/* - Active state: default variant, inactive: outline variant */}
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
      {/* - Empty state: Show when no builds match filter/search */}
      {/* - Build cards: Stacked list with hover effects */}
      {/* - Each card: Name, badge, description, car, creator, actions */}
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
              {/* Build Card Link */}
              {/* - Clickable card: Navigates to build detail */}
              {/* - Displays: Name, badge, description, car, creator */}
              <Link href={`/builds/${build.id}`} className="flex-1 min-w-0">
                <div className="flex items-start gap-3 w-full p-3 sm:p-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Build Name */}
                    {/* - Large, bold text */}
                    {/* - Truncated: truncate for long names */}
                    {/* - Badge: Public (Globe icon) or Private (Lock icon) */}
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
                      {/* Optional description (line-clamp-1) */}
                      {build.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {build.description}
                        </p>
                      )}
                    </div>

                    {/* Car Info */}
                    {/* - Manufacturer: Monospace font, small */}
                    {/* - Name: Truncated for long names */}
                    {/* - Year: Last 2 digits only (e.g., '24 for 2024) */}
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
                    {/* - User icon: Small icon */}
                    {/* - Name fallback: name → email */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{build.user.name || build.user.email}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Action Buttons */}
              {/* - Edit button: Pencil icon, navigates to edit page */}
              {/* - Delete button: Trash icon, shows confirmation */}
              {/* - Loading state: Spinner during delete */}
              {/* - Prevent default: Stop link navigation when clicking buttons */}
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
                {/* - Destructive style: gt-hover-icon-btn-destructive */}
                {/* - Loading: Spinner when deleting this build */}
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
      {/* - Warning: "This will permanently delete this build" */}
      {/* - Actions: Cancel (outline), Delete Build (destructive) */}
      {/* - State: Resets pendingDeleteId on cancel */}
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
      {/* - Shows: Error message from API or generic message */}
      {/* - Action: Close button (outline variant) */}
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
