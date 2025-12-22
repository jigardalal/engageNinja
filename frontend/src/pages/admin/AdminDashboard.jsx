import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Users, Building2, Sparkles, ArrowUpDown } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import AppShell from '../../components/layout/AppShell'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  ErrorState,
  Dialog,
  DialogFooter,
  DialogContent,
  Input,
  PrimaryAction,
  SecondaryAction,
  DataTable
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' }
]

const statLabels = [
  { key: 'tenants', label: 'Total tenants' },
  { key: 'active_tenants', label: 'Active tenants' },
  { key: 'users', label: 'Platform users' },
  { key: 'platform_admins', label: 'Platform admins' }
]

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const { isPlatformAdmin } = useAuth()

  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createOwnerEmail, setCreateOwnerEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [updatingTenantId, setUpdatingTenantId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [tenantsRes, statsRes] = await Promise.all([
        fetch('/api/admin/tenants', { credentials: 'include' }),
        fetch('/api/admin/stats', { credentials: 'include' })
      ])

      if (!tenantsRes.ok) {
        const tenantsPayload = await tenantsRes.json().catch(() => ({}))
        throw new Error(tenantsPayload.error || 'Failed to fetch tenants')
      }

      const tenantsData = await tenantsRes.json()
      setTenants(tenantsData.tenants || [])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (tenantId, newStatus) => {
    try {
      setUpdatingTenantId(tenantId)
      setError(null)
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update tenant status')
      }
      await fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingTenantId(null)
    }
  }

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
        cell: ({ row }) => (
          <p className="text-sm font-semibold text-[var(--text)]">{row.original.name}</p>
        )
      },
      {
        accessorKey: 'plan_name',
        header: sortHeader('Plan'),
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)]">{row.original.plan_name || 'Standard'}</span>
        )
      },
      {
        accessorKey: 'user_count',
        header: sortHeader('Users'),
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)] font-mono">{row.original.user_count || 0}</span>
        )
      },
      {
        id: 'status',
        accessorFn: (tenant) => tenant.status || 'active',
        header: sortHeader('Status'),
        cell: ({ row }) => {
          const tenant = row.original
          return (
            <select
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs"
              value={tenant.status || 'active'}
              onChange={(e) => handleStatusChange(tenant.id, e.target.value)}
              disabled={updatingTenantId === tenant.id}
            >
              {statusOptions
                .filter((option) => option.value !== 'all')
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          )
        }
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
    [handleStatusChange, updatingTenantId]
  )

  const rowActions = useMemo(
    () => (tenant) => [
      {
        label: 'View tenant',
        icon: <Building2 className="h-4 w-4" />,
        onClick: () => navigate(`/admin/tenants/${tenant.id}`)
      }
    ],
    [navigate]
  )

  const handleCreateTenant = async (e) => {
    e.preventDefault()
    if (!createName.trim()) {
      setCreateError('Tenant name is required')
      return
    }

    try {
      setCreating(true)
      setCreateError(null)
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: createName,
          ownerEmail: createOwnerEmail || undefined
        })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create tenant')
      }
      setCreateName('')
      setCreateOwnerEmail('')
      setShowCreateDialog(false)
      await fetchData()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (!isPlatformAdmin()) {
    return (
      <AppShell title="Admin Dashboard" subtitle="Access Denied">
        <Alert type="error" title="Access Denied">
          You need platform admin privileges to access this page.
        </Alert>
      </AppShell>
    )
  }

  const heroActions = (
    <div className="flex flex-wrap gap-3">
      <SecondaryAction onClick={() => navigate('/admin/audit-logs')}>
        View audit logs
      </SecondaryAction>
      <PrimaryAction onClick={() => setShowCreateDialog(true)}>
        Create tenant
      </PrimaryAction>
    </div>
  )

  const insightStats = stats
    ? statLabels.map((item) => ({
        label: item.label,
        value: stats[item.key] || 0,
        icon: item.key === 'platform_admins' ? Building2 : item.key === 'users' ? Users : Sparkles
      }))
    : []

  return (
    <AdminPageLayout
      shellTitle="Admin Dashboard"
      shellSubtitle="Manage tenants and platform settings"
      hero={{
        icon: ShieldCheck,
        description: 'Monitor tenants, templates, and platform usage from one place.',
        helper: 'Filter tenants, update status, and dive into details.',
        actions: heroActions
      }}
    >
      <div className="space-y-6">
        <Card variant="glass" className="space-y-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" />
              <CardTitle>Insights</CardTitle>
            </div>
            <CardDescription className="text-[var(--text-muted)]">
              High-level platform metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {insightStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className="flex flex-1 min-w-[200px] items-center gap-3 rounded-2xl border border-white/20 bg-white/80 px-4 py-3 shadow-inner dark:bg-slate-900/70"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">{stat.label}</p>
                      <p className="text-2xl font-semibold text-[var(--text)]">{stat.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {error && <ErrorState title="Something went wrong" description={error} />}
        <DataTable
          title="Tenant directory"
          description={`Showing ${tenants.length} tenants • statuses editable inline`}
          columns={columns}
          data={tenants}
          loading={loading}
          loadingMessage="Loading tenants..."
          emptyIcon={Building2}
          emptyTitle="No tenants"
          emptyDescription="Try a different search or filter to find tenants."
          rowActions={rowActions}
          searchPlaceholder="Search tenants..."
          enableSelection={false}
        />
      </div>

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Create new tenant"
        description="Give the workspace a name and optionally assign an owner above."
        variant="glass"
      >
        <DialogContent>
          {createError && (
            <Alert type="error" title="Unable to create tenant">
              {createError}
            </Alert>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)]">Tenant name</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Acme Corp"
                disabled={creating}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text)]">Owner email (optional)</label>
              <Input
                type="email"
                value={createOwnerEmail}
                onChange={(e) => setCreateOwnerEmail(e.target.value)}
                placeholder="owner@company.com"
                disabled={creating}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowCreateDialog(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreateTenant} disabled={creating || !createName.trim()}>
            {creating ? 'Creating Tenant…' : 'Create Tenant'}
          </Button>
        </DialogFooter>
      </Dialog>
    </AdminPageLayout>
  )
}

export default AdminDashboard
