import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, Eye, Power, ShieldCheck, Users } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import {
  Button,
  Badge,
  ErrorState,
  PrimaryAction,
  DataTable
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const platformRoles = ['none', 'platform_support', 'platform_admin', 'system_admin']
const badgeGlass = 'text-xs font-normal bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-white/20'

export const AdminUsersPage = () => {
  const navigate = useNavigate()
  const { isPlatformAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [roleUpdates, setRoleUpdates] = useState({})
  const [roleSaving, setRoleSaving] = useState({})
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshUsers = () => fetchUsers()

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

  const sortHeader = (label) => ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] hover:bg-transparent px-0"
    >
      {label}
      <ArrowUpDown className="ml-1 h-4 w-4 text-[var(--text-muted)]" />
    </Button>
  )

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: sortHeader('Name'),
        cell: ({ row }) => {
          const user = row.original
          const displayName =
            user.name ||
            `${user.first_name || '—'} ${user.last_name || ''}`.trim() ||
            '—'
          return (
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{displayName}</p>
            </div>
          )
        }
      },
      {
        accessorKey: 'email',
        header: sortHeader('Email'),
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)]">{row.original.email}</span>
        )
      },
      {
        id: 'role',
        accessorFn: (user) => user.role_global || 'none',
        header: sortHeader('Role'),
        cell: ({ row }) => {
          const user = row.original
          const isProtectedRole =
            user.role_global === 'platform_admin' || user.role_global === 'system_admin'
          const currentRole = roleUpdates[user.id] ?? (user.role_global || 'none')
          const baseRole = user.role_global || 'none'
          return (
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
              <Badge className={`${badgeGlass} text-primary-700`}>
                {baseRole}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                disabled={
                  isProtectedRole ||
                  roleSaving[user.id] ||
                  currentRole === baseRole
                }
                onClick={() => savePlatformRole(user.id, currentRole)}
              >
                {roleSaving[user.id] ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )
        }
      },
      {
        id: 'status',
        accessorFn: (user) => (user.active ? 'active' : 'inactive'),
        header: sortHeader('Status'),
        cell: ({ row }) => (
          <Badge
            className={`${badgeGlass} ${row.original.active ? 'text-green-800' : 'text-gray-800'}`}
          >
            {row.original.active ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
      {
        accessorKey: 'tenant_count',
        header: sortHeader('Tenants'),
        cell: ({ row }) => (
          <Badge className={`${badgeGlass} text-primary-700`}>
            {row.original.tenant_count || 0} tenants
          </Badge>
        )
      },
      {
        accessorKey: 'created_at',
        header: sortHeader('Created'),
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)]">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        )
      }
    ],
    [roleUpdates, roleSaving, savePlatformRole]
  )

  const rowActions = useMemo(
    () => (user) => [
      {
        label: 'View user',
        icon: <Eye className="h-4 w-4" />,
        onClick: () => navigate(`/admin/users/${user.id}`)
      },
      {
        label: user.active ? 'Deactivate user' : 'Activate user',
        icon: <Power className="h-4 w-4" />,
        variant: user.active ? 'destructive' : 'default',
        disabled: !!actionLoading[user.id],
        onClick: () => {
          if (actionLoading[user.id]) return
          setUserActive(user.id, !user.active)
        }
      }
    ],
    [navigate, actionLoading, setUserActive]
  )

  return (
    <AdminPageLayout
      shellTitle="Admin — Users"
      shellSubtitle="View every platform user and role assignment"
      hero={{
        icon: Users,
        description: 'Monitor platform-wide users, update roles, and surface protected accounts.',
        helper: `${users.length} users • ${activeCount} active`,
        actions: (
          <PrimaryAction onClick={refreshUsers}>Refresh users</PrimaryAction>
        )
      }}
    >
      <div className="space-y-4">
        {error && <ErrorState title="Unable to load users" description={error} />}
        <DataTable
          columns={columns}
          data={users}
          title="Platform users"
          description="Review platform roles, activation state, and tenant assignments."
          searchPlaceholder="Filter users..."
          loading={loading}
          loadingMessage="Loading users..."
          emptyIcon={ShieldCheck}
          emptyTitle="No users"
          emptyDescription="Invite platform admins or support staff to see them listed here."
          rowActions={rowActions}
        />
      </div>
    </AdminPageLayout>
  )
}

export default AdminUsersPage
