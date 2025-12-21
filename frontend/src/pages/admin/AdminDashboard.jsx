import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Users, Building2, Sparkles } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import AppShell from '../../components/layout/AppShell'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LoadingState,
  ErrorState,
  EmptyState,
  Dialog,
  DialogFooter,
  DialogContent,
  PrimaryAction,
  SecondaryAction
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
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

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus

    return matchesSearch && matchesStatus
  })

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
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <CardTitle>Tenant controls</CardTitle>
                  <CardDescription className="text-[var(--text-muted)]">
                    Search by name or ID, then adjust status inline.
                  </CardDescription>
                </div>
                <div className="w-full md:w-auto">
                  <Input
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr,240px]">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Status filter</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] shadow-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <CardDescription className="text-sm text-[var(--text-muted)]">
                  Total tenants: {tenants.length}
                </CardDescription>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Tenant directory</CardTitle>
                  <CardDescription className="text-[var(--text-muted)]">
                    {`Showing ${filteredTenants.length} of ${tenants.length} tenants`}
                  </CardDescription>
                </div>
                {loading ? null : <Badge>{filterStatus === 'all' ? 'All' : filterStatus}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {error && <ErrorState title="Something went wrong" description={error} />}
              {loading ? (
                <LoadingState message="Loading tenants..." />
              ) : filteredTenants.length === 0 ? (
                <EmptyState
                  title="No tenants"
                  description="Try a different search or filter to find tenants."
                  icon={Building2}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div className="text-sm font-semibold text-[var(--text)]">{tenant.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">{tenant.id}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-[var(--text-muted)]">{tenant.plan_name || 'Standard'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-[var(--text-muted)]">{tenant.user_count || 0}</div>
                          </TableCell>
                          <TableCell>
                            <select
                              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs"
                              value={tenant.status || 'active'}
                              onChange={(e) => handleStatusChange(tenant.id, e.target.value)}
                              disabled={updatingTenantId === tenant.id}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="archived">Archived</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-[var(--text-muted)]">
                              {new Date(tenant.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/tenants/${tenant.id}`)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-xs text-[var(--text-muted)]">
              Tenant statuses sync across the platform and refresh immediately after updates.
            </CardFooter>
          </Card>
        </div>

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
            <div className="grid gap-4">
              {insightStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/80 px-4 py-3 shadow-inner dark:bg-slate-900/70"
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
