import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ShieldCheck } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import {
  Input,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LoadingState,
  ErrorState,
  EmptyState,
  PrimaryAction,
  SecondaryAction
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const platformRoles = ['none', 'platform_support', 'platform_admin', 'system_admin']

const roleBadgeClass = (role) => {
  const map = {
    system_admin: 'bg-purple-100 text-purple-800',
    platform_admin: 'bg-blue-100 text-blue-800',
    platform_support: 'bg-green-100 text-green-800',
    none: 'bg-gray-100 text-gray-800'
  }
  return map[role] || map.none
}

export const AdminUsersPage = () => {
  const navigate = useNavigate()
  const { isPlatformAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [roleUpdates, setRoleUpdates] = useState({})
  const [roleSaving, setRoleSaving] = useState({})
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async (term = search) => {
    try {
      setLoading(true)
      setError(null)
      const query = term ? `?search=${encodeURIComponent(term)}` : ''
      const res = await fetch(`/api/admin/users${query}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshUsers = () => fetchUsers(search)

  const handleSearchChange = (value) => {
    setSearch(value)
    fetchUsers(value)
  }

  const savePlatformRole = async (userId, role) => {
    if (!role) return
    try {
      setRoleSaving((prev) => ({ ...prev, [userId]: true }))
      setError(null)
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role_global: role })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')
      fetchUsers(search)
    } catch (err) {
      setError(err.message)
    } finally {
      setRoleSaving((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const setUserActive = async (userId, active) => {
    const verb = active ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${verb} this user?`)) return

    try {
      setActionLoading((prev) => ({ ...prev, [userId]: true }))
      setError(null)
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user')
      fetchUsers(search)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  if (!isPlatformAdmin()) return null

  const activeCount = users.filter((user) => user.active).length

  return (
    <AdminPageLayout
      shellTitle="Admin — Users"
      shellSubtitle="View every platform user and role assignment"
      hero={{
        icon: Users,
        description: 'Monitor platform-wide users, update roles, and surface protected accounts.',
        helper: `${users.length} users • ${activeCount} active`,
        actions: (
          <div className="flex flex-wrap gap-3">
            <SecondaryAction onClick={() => handleSearchChange('')}>Reset search</SecondaryAction>
            <PrimaryAction onClick={refreshUsers}>Refresh users</PrimaryAction>
          </div>
        )
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card variant="glass">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Search & filters</CardTitle>
                <CardDescription className="text-[var(--text-muted)]">
                  Search by name, email, or internal ID.
                </CardDescription>
              </div>
              <div className="w-full md:w-72">
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && <ErrorState title="Unable to load users" description={error} />}
            {loading ? (
              <LoadingState message="Loading users..." />
            ) : users.length === 0 ? (
              <EmptyState
                title="No users"
                description="Invite platform admins or support staff to see them listed here."
                icon={ShieldCheck}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tenants</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isProtectedRole =
                        user.role_global === 'platform_admin' || user.role_global === 'system_admin'
                      const currentRole = roleUpdates[user.id] ?? (user.role_global || 'none')
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <p className="text-sm font-semibold text-[var(--text)]">
                              {user.name || `${user.first_name || '—'} ${user.last_name || ''}`.trim() || '—'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">ID: {user.id}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={currentRole}
                                onChange={(e) =>
                                  setRoleUpdates((prev) => ({ ...prev, [user.id]: e.target.value }))
                                }
                                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-sm"
                                disabled={isProtectedRole}
                              >
                                {platformRoles.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                              <Badge className={`${roleBadgeClass(user.role_global || 'none')} text-xs font-semibold`}>
                                {user.role_global || 'none'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={
                                  isProtectedRole ||
                                  roleSaving[user.id] ||
                                  currentRole === (user.role_global || 'none')
                                }
                                onClick={() => savePlatformRole(user.id, currentRole)}
                              >
                                {roleSaving[user.id] ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {user.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="text-xs font-semibold bg-primary-100 text-primary-700">
                              {user.tenant_count || 0} tenants
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-[var(--text-muted)]">
                              {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2 text-sm">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/users/${user.id}`)}>
                                View
                              </Button>
                              <Button
                                variant={user.active ? 'secondary' : 'primary'}
                                size="sm"
                                onClick={() => setUserActive(user.id, !user.active)}
                                disabled={!!actionLoading[user.id]}
                              >
                                {actionLoading[user.id]
                                  ? 'Saving...'
                                  : user.active
                                  ? 'Deactivate'
                                  : 'Activate'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card variant="glass" className="space-y-3">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Track platform user counts and role distributions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
              <span>Total users</span>
              <strong className="text-[var(--text)]">{users.length}</strong>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
              <span>Active users</span>
              <strong className="text-[var(--text)]">{activeCount}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  )
}

export default AdminUsersPage
