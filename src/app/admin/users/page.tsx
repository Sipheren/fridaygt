'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, UserCheck, UserX, Shield, User, Clock } from 'lucide-react'
import { LoadingSection } from '@/components/ui/loading'

type User = {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUsers()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to reject this user?')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <LoadingSection text="Loading users..." />
      </div>
    )
  }

  const pendingUsers = users.filter(u => u.role === 'PENDING')
  const activeUsers = users.filter(u => u.role === 'USER')
  const admins = users.filter(u => u.role === 'ADMIN')

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">USER MANAGEMENT</h1>
          <p className="text-muted-foreground font-mono text-sm">
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
          <div className="text-center py-8">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
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
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => deleteUser(user.id)}
                    size="sm"
                    variant="destructive"
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
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
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
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Make Admin
                  </Button>
                  <Button
                    onClick={() => deleteUser(user.id)}
                    size="sm"
                    variant="ghost"
                  >
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
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
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
                >
                  Remove Admin
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
