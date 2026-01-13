'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, UserCheck, UserX, Shield, User, Clock, AlertTriangle, Loader2, Users } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'

type User = {
  id: string
  email: string
  name: string | null
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
  const [message, setMessage] = useState<Message | null>(null)
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

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <LoadingSection text="Loading users..." />
      </div>
    )
  }

  const pendingUsers = users.filter(u => u.role === 'PENDING')
  const activeUsers = users.filter(u => u.role === 'USER')
  const admins = users.filter(u => u.role === 'ADMIN')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            USER MANAGEMENT
          </h1>
          <p className="text-muted-foreground">
            Approve pending users and manage roles
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-mono uppercase">Pending</span>
          </div>
          <p className="text-3xl font-bold text-chart-4">{pendingUsers.length}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <User className="h-4 w-4" />
            <span className="text-xs font-mono uppercase">Active</span>
          </div>
          <p className="text-3xl font-bold text-accent">{activeUsers.length}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-muted/30">
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
              <div key={user.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="font-semibold font-mono">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateUserRole(user.id, 'USER')}
                    size="sm"
                    className="bg-accent hover:bg-accent/80"
                    disabled={processingId === user.id}
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
                    size="sm"
                    variant="destructive"
                    disabled={processingId === user.id}
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
              <div key={user.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="font-semibold font-mono">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateUserRole(user.id, 'ADMIN')}
                    size="sm"
                    variant="outline"
                    disabled={processingId === user.id}
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
                    size="sm"
                    variant="ghost"
                    disabled={processingId === user.id}
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
              <div key={user.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap bg-primary/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold font-mono">{user.email}</p>
                    <Badge variant="default" className="text-xs">ADMIN</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Admin since: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
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
    </div>
  )
}
