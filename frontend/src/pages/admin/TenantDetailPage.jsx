import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Building2, ShieldCheck, ArrowRightLeft, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  LoadingState,
  Alert,
  Badge,
  ErrorState,
  EmptyState,
  PrimaryAction,
  SecondaryAction,
  toast
} from '../../components/ui'
import TenantEditForm from './TenantEditForm'
import TenantBillingTab from './TenantBillingTab'

const statusOptions = ['active', 'suspended', 'archived']

export const TenantDetailPage = () => {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const { isPlatformAdmin, switchTenant } = useAuth()

  const [tenant, setTenant] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updateError, setUpdateError] = useState(null)
  const [updateSuccess, setUpdateSuccess] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [openingTenant, setOpeningTenant] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [newStatus, setNewStatus] = useState(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchTenant()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const fetchTenant = async () => {
    if (!tenantId) {
      setError('No tenant ID provided')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tenant not found')
        }
        throw new Error('Failed to fetch tenant details')
      }
      const data = await response.json()
      setTenant(data.tenant)
      setUsers(data.users || [])
      setNewStatus(data.tenant?.status || 'active')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === tenant?.status) return
    try {
      setUpdating(true)
      setUpdateError(null)
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update tenant')
      }
      toast({
        title: 'Tenant status updated',
        description: `Tenant status changed to ${newStatus}`,
        variant: 'success'
      })
      await fetchTenant()
    } catch (err) {
      setUpdateError(err.message)
      toast({
        title: 'Failed to update tenant',
        description: err.message || 'Please try again',
        variant: 'error'
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleSyncTags = async () => {
    try {
      setSyncing(true)
      setSyncError(null)
      const response = await fetch(`/api/admin/tenants/${tenantId}/sync-global-tags`, {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync global tags')
      }
      const message = `Synced ${data.added} tag(s) from ${data.total_active_global || data.added} active global tags.`
      toast({
        title: 'Tags synced',
        description: message,
        variant: 'success'
      })
    } catch (err) {
      setSyncError(err.message)
      toast({
        title: 'Failed to sync tags',
        description: err.message || 'Please try again',
        variant: 'error'
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleOpenTenantApp = async () => {
    try {
      setOpeningTenant(true)
      await switchTenant(tenantId)
      toast({
        title: 'Tenant opened',
        description: 'Switching to tenant dashboard',
        variant: 'success'
      })
      navigate('/dashboard')
    } catch (err) {
      setOpeningTenant(false)
      toast({
        title: 'Failed to open tenant',
        description: 'Unable to switch tenant context',
        variant: 'error'
      })
    }
  }

  const statusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
      deleted: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const roleSummary = useMemo(() => {
    return users.reduce((acc, user) => {
      const role = user.role || 'member'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})
  }, [users])

  if (!isPlatformAdmin()) return null

  if (loading) {
    return (
    <AdminPageLayout
      shellTitle="Loading tenant..."
      shellSubtitle="Please wait"
      hero={{ icon: Building2 }}
    >
        <LoadingState message="Loading tenant details..." />
      </AdminPageLayout>
    )
  }

  if (error) {
    return (
    <AdminPageLayout
      shellTitle="Tenant error"
      shellSubtitle="Unable to render tenant"
      hero={{ icon: Building2 }}
    >
        <Card>
          <CardContent>
            <Alert title="Error" type="error">
              {error}
            </Alert>
          </CardContent>
        </Card>
      </AdminPageLayout>
    )
  }

  if (!tenant) {
    return (
    <AdminPageLayout
      shellTitle="Tenant missing"
      shellSubtitle="No tenant data found"
      hero={{ icon: Building2 }}
    >
        <EmptyState title="Tenant not found" description="Confirm the tenant ID or return to the admin dashboard." />
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout
      shellTitle={`Tenant ${tenant.name}`}
      shellSubtitle={`ID: ${tenant.tenant_id}`}
      hero={{
        icon: Building2,
        description: 'Manage tenant metadata, sync tags, and hop into the workspace.',
        helper: tenant.plan_name ? `Plan: ${tenant.plan_name}` : 'Plan unknown',
        actions: (
          <div className="flex flex-wrap gap-3">
            <PrimaryAction onClick={handleOpenTenantApp} disabled={openingTenant}>
              <ArrowRightLeft className="h-4 w-4" /> Switch to tenant
            </PrimaryAction>
            <SecondaryAction onClick={handleSyncTags} disabled={syncing}>
              <ShieldCheck className="h-4 w-4" /> Sync tags
            </SecondaryAction>
          </div>
        )
      }}
    >
      {updateError && <ErrorState title="Update failed" description={updateError} />}
      {updateSuccess && (
        <Alert title="Success" type="success">
          {updateSuccess}
        </Alert>
      )}
      {syncError && <ErrorState title="Sync failed" description={syncError} />}
      {syncResult && (
        <Alert title="Sync complete" type="success">
          {syncResult}
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <div>
                <CardTitle>Tenant status</CardTitle>
                <CardDescription className="text-[var(--text-muted)]">
                  Update provisioning status and review subscription details.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Status</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Badge className={`${statusBadge(tenant.status)} text-xs font-semibold`}>{tenant.status}</Badge>
                  <Button onClick={handleStatusChange} disabled={updating || newStatus === tenant.status}>
                    {updating ? 'Saving...' : 'Save status'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-[var(--text-muted)]">Tenant admins</p>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                  <span>{users.length} total users</span>
                  {Object.entries(roleSummary).map(([role, count]) => (
                    <Badge key={role} className="text-xs font-semibold bg-primary-100 text-primary-700">
                      {role}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Workspace controls</CardTitle>
                  <CardDescription className="text-[var(--text-muted)]">
                    Switch between profile and billing views below.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {['profile', 'billing'].map((tab) => (
                    <Button
                      key={tab}
                      size="sm"
                      variant={activeTab === tab ? 'primary' : 'ghost'}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'profile' ? 'Profile' : 'Billing'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'profile' ? (
                <TenantEditForm tenant={tenant} onUpdated={fetchTenant} />
              ) : (
                <TenantBillingTab tenantId={tenantId} />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card variant="glass" className="space-y-3">
            <CardHeader>
              <div>
                <CardTitle>Tenant snapshot</CardTitle>
                <CardDescription className="text-[var(--text-muted)]">
                  Quick context for the admin console.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>
                <span className="font-semibold text-[var(--text)]">Plan:</span> {tenant.plan_name || '—'}
              </p>
              <p>
                <span className="font-semibold text-[var(--text)]">Created:</span>{' '}
                {new Date(tenant.created_at).toLocaleDateString()}
              </p>
              <p>
                <span className="font-semibold text-[var(--text)]">Region:</span> {tenant.region || 'global'}
              </p>
            </CardContent>
          </Card>
          <Card variant="glass" className="space-y-3">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
            <PrimaryAction onClick={() => navigate('/admin/tenants')}>
              <Users className="h-4 w-4" /> Back to tenants
            </PrimaryAction>
              <SecondaryAction onClick={handleSyncTags} disabled={syncing}>
                <ShieldCheck className="h-4 w-4" /> Sync tags now
              </SecondaryAction>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageLayout>
  )
}

export default TenantDetailPage
