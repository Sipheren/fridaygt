'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, UserCheck, UserX, Shield, User, Clock, AlertTriangle, Loader2, Users, Edit, Gamepad2 } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'
import { PageWrapper, PageHeader } from '@/components/layout'

type User = {
  id: string
  email: string
  name: string | null
  gamertag: string | null
  role: string
  createdAt: string
}

type Message = {
  type: 'success' | 'error'
  text: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<'approve' | 'delete' | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    gamertag: ''
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUsers()
  }, [])

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 401) {
        router.push('/')
        return
      }
      if (res.status === 403) {
        setIsForbidden(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      showMessage('error', 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
  }

  async function updateUserRole(userId: string, role: string) {
    setProcessingId(userId)
    setProcessingAction('approve')
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })

      if (res.ok) {
        showMessage('success', `User ${role === 'USER' ? 'approved' : 'role updated'}`)
        await fetchUsers()
      } else {
        const data = await res.json()
        showMessage('error', data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      showMessage('error', 'Failed to update user')
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
    }
  }

  function openDeleteDialog(user: User) {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
    setMessage(null)
  }

  async function confirmDelete() {
    if (!userToDelete) return

    setProcessingId(userToDelete.id)
    setProcessingAction('delete')

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        showMessage('success', userToDelete.role === 'PENDING' ? 'User rejected and removed' : 'User removed successfully')
        await fetchUsers()
      } else {
        const data = await res.json()
        showMessage('error', data.error || 'Failed to remove user')
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      showMessage('error', 'Failed to remove user')
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  function openEditDialog(user: User) {
    setEditingUser(user)
    setEditForm({
      name: user.name || '',
      gamertag: user.gamertag || ''
    })
    setEditDialogOpen(true)
    setMessage(null)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()

    if (!editingUser) return

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name || null,
          gamertag: editForm.gamertag
        })
      })

      if (res.ok) {
        showMessage('success', 'Profile updated successfully')
        await fetchUsers()
        setEditDialogOpen(false)
      } else {
        const data = await res.json()
        showMessage('error', data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      showMessage('error', 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <LoadingSection text="Loading users..." />
      </PageWrapper>
    )
  }

  if (isForbidden) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground text-lg">Admin access required</p>
            <p className="text-muted-foreground text-sm">This page is only accessible to administrators.</p>
          </div>
          <Button onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const pendingUsers = users.filter(u => u.role === 'PENDING')
  const activeUsers = users.filter(u => u.role === 'USER')
  const admins = users.filter(u => u.role === 'ADMIN')

  return (
    <PageWrapper>
      {/* Success/Error Message */}
      {message && (
        <div className={`rounded-md border p-4 ${
          message.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-500'
            : 'bg-destructive/10 border-destructive/20 text-destructive'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="USER MANAGEMENT"
        icon={Users}
        description="Approve pending users and manage roles"
        actions={
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="border border-border rounded-lg p-2.5 sm:p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-mono uppercase">Pending</span>
          </div>
          <p className="text-3xl font-bold text-chart-4">{pendingUsers.length}</p>
        </div>
        <div className="border border-border rounded-lg p-2.5 sm:p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <User className="h-4 w-4" />
            <span className="text-xs font-mono uppercase">Active</span>
          </div>
          <p className="text-3xl font-bold text-accent">{activeUsers.length}</p>
        </div>
        <div className="border border-border rounded-lg p-2.5 sm:p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-mono uppercase">Admins</span>
          </div>
          <p className="text-3xl font-bold text-primary">{admins.length}</p>
        </div>
      </div>

      {/* Pending Users */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-chart-4" />
          <h2 className="text-xl font-bold">
            PENDING APPROVAL
            <Badge variant="outline" className="ml-2 text-chart-4 border-chart-4/30">
              {pendingUsers.length}
            </Badge>
          </h2>
        </div>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">No pending users</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map(user => (
              <div key={user.id} className="border border-border rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="font-semibold font-mono text-sm break-all">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => updateUserRole(user.id, 'USER')}
                    disabled={processingId === user.id}
                    className="w-full sm:w-auto min-h-[44px] bg-accent hover:bg-accent"
                  >
                    {processingId === user.id && processingAction === 'approve' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => openDeleteDialog(user)}
                    variant="destructive"
                    disabled={processingId === user.id}
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Users */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold">
            ACTIVE USERS
            <Badge variant="outline" className="ml-2 text-accent border-accent/30">
              {activeUsers.length}
            </Badge>
          </h2>
        </div>
        {activeUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">No active users</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeUsers.map(user => (
              <div
                key={user.id}
                className="border border-border rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4 flex-wrap cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors"
                onClick={() => openEditDialog(user)}
              >
                <div className="space-y-1">
                  <p className="font-semibold font-mono text-sm break-all">
                    {user.name || user.email}
                    {user.name && user.email !== user.name && (
                      <span className="text-muted-foreground text-xs ml-2">
                        ({user.email})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.gamertag ? `GT: ${user.gamertag}` : 'No gamertag set'} • Member since: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div
                  className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    onClick={() => updateUserRole(user.id, 'ADMIN')}
                    variant="outline"
                    disabled={processingId === user.id}
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    {processingId === user.id && processingAction === 'approve' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Promoting...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => openDeleteDialog(user)}
                    variant="ghost"
                    disabled={processingId === user.id}
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Administrators */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">
            ADMINISTRATORS
            <Badge variant="outline" className="ml-2 text-primary border-primary/30">
              {admins.length}
            </Badge>
          </h2>
        </div>
        {admins.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">No administrators</p>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map(user => (
              <div
                key={user.id}
                className="border border-border rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap bg-primary/5 cursor-pointer hover:border-primary/30 hover:bg-primary/10 transition-colors"
                onClick={() => openEditDialog(user)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold font-mono">
                      {user.name || user.email}
                      {user.name && user.email !== user.name && (
                        <span className="text-muted-foreground text-xs ml-2">
                          ({user.email})
                        </span>
                      )}
                    </p>
                    <Badge variant="default" className="text-xs">ADMIN</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user.gamertag ? `GT: ${user.gamertag}` : 'No gamertag set'} • Admin since: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div
                  className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    onClick={() => updateUserRole(user.id, 'USER')}
                    size="sm"
                    variant="outline"
                    disabled={processingId === user.id}
                  >
                    {processingId === user.id && processingAction === 'approve' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Remove Admin'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {userToDelete?.role === 'PENDING' ? 'Reject User' : 'Remove User'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {userToDelete?.role === 'PENDING' ? 'reject' : 'remove'} <strong>{userToDelete?.email}</strong>?
              {userToDelete?.role === 'PENDING' ? (
                <span className="block mt-2 text-muted-foreground">
                  This will permanently delete their account and they will need to sign up again if they want to join.
                </span>
              ) : (
                <span className="block mt-2 text-destructive">
                  This will permanently delete their account and all their data. This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={processingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={processingId !== null}
            >
              {processingId === userToDelete?.id && processingAction === 'delete' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {userToDelete?.role === 'PENDING' ? 'Rejecting...' : 'Removing...'}
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  {userToDelete?.role === 'PENDING' ? 'Reject User' : 'Remove User'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit User Profile
            </DialogTitle>
            <DialogDescription>
              Update profile information for <strong>{editingUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Display Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Enter display name"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Optional display name (max 100 characters)
              </p>
            </div>

            {/* Gamertag Field */}
            <div className="space-y-2">
              <Label htmlFor="edit-gamertag" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Gamertag <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-gamertag"
                value={editForm.gamertag}
                onChange={(e) => setEditForm({...editForm, gamertag: e.target.value})}
                placeholder="Enter gamertag"
                pattern="[a-zA-Z0-9_-]{3,20}"
                required
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                3-20 characters, letters, numbers, hyphens, and underscores only
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
