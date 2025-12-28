import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Users, ShieldCheck } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Alert,
  Input,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingState,
  ErrorState,
  EmptyState,
  PrimaryAction,
  SecondaryAction,
  Select
} from '../../components/ui'
import { Dialog, DialogContent, DialogFooter } from '../../components/ui'

export const UserDetailPage = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [platformRole, setPlatformRole] = useState('none')
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [tenantSearch, setTenantSearch] = useState('')
  const [tenantOptions, setTenantOptions] = useState([])
  const [tenantsLoading, setTenantsLoading] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [assignRole, setAssignRole] = useState('member')
  const [showToggleConfirm, setShowToggleConfirm] = useState(false)
  const [pendingToggleAction, setPendingToggleAction] = useState(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [pendingRemoveAction, setPendingRemoveAction] = useState(null)
  const isProtectedAdmin = user?.role_global === 'platform_admin' || user?.role_global === 'system_admin'

  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (user) {
      setPlatformRole(user.role_global || 'none')
    }
  }, [user])

  useEffect(() => {
    if (!showAssignDialog) return
    let cancelled = false

    const fetchTenants = async () => {
      try {
        setTenantsLoading(true)
        const query = tenantSearch ? `?search=${encodeURIComponent(tenantSearch)}&limit=25` : '?limit=25'
        const res = await fetch(`/api/admin/tenants${query}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load tenants')
        const data = await res.json()
        if (cancelled) return
        const existing = new Set((tenants || []).map((t) => t.tenant_id))
        const options = (data.tenants || []).filter((t) => !existing.has(t.id))
        setTenantOptions(options)
      } catch (err) {
        if (!cancelled) {
          setActionError(err.message)
        }
      } finally {
        if (!cancelled) setTenantsLoading(false)
      }
    }

    fetchTenants()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAssignDialog, tenantSearch])

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include' })
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'User not found' : 'Failed to fetch user')
      }
      const data = await res.json()
      setUser(data.user)
      setTenants(data.tenants || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const flashSuccess = (message) => {
    setActionSuccess(message)
    setTimeout(() => setActionSuccess(null), 3000)
  }

  const updateUser = async (updates) => {
    try {
      setUpdating(true)
      setActionError(null)
      setActionSuccess(null)
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user')
      flashSuccess('User updated')
      await fetchUser()
      return true
    } catch (err) {
      setActionError(err.message)
      return false
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleActive = async () => {
    if (isProtectedAdmin && user?.active) {
      setActionError('Platform admin accounts cannot be deactivated')
      return
    }
    const nextActive = !user?.active
    const verb = nextActive ? 'activate' : 'deactivate'
    setPendingToggleAction({ verb, email: user?.email, nextActive })
    setShowToggleConfirm(true)
  }

  const confirmToggleUser = async () => {
    if (!pendingToggleAction) return
    setShowToggleConfirm(false)
    await updateUser({ active: pendingToggleAction.nextActive })
    setPendingToggleAction(null)
  }

  const handleUpdatePlatformRole = async () => {
    if (isProtectedAdmin && (user?.role_global || 'none') !== platformRole) {
      setActionError('Platform admin accounts cannot have their platform role changed')
      return
    }
    if ((user?.role_global || 'none') === platformRole) return
    await updateUser({ role_global: platformRole })
  }

  const handleAssignTenant = async (e) => {
    e.preventDefault()
    if (!selectedTenantId) return
    try {
      setUpdating(true)
      setActionError(null)
      setActionSuccess(null)
      const res = await fetch(`/api/admin/users/${userId}/tenants/${selectedTenantId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: assignRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign tenant')
      flashSuccess('User assigned to tenant')
      setShowAssignDialog(false)
      setSelectedTenantId('')
      setTenantSearch('')
      setAssignRole('member')
      await fetchUser()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleChangeTenantRole = async (tenantId, role) => {
    try {
      setUpdating(true)
      setActionError(null)
      setActionSuccess(null)
      const res = await fetch(`/api/admin/users/${userId}/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update membership')
      flashSuccess('Membership updated')
      await fetchUser()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveFromTenant = async (tenantId, tenantName) => {
    setPendingRemoveAction({ tenantId, tenantName })
    setShowRemoveConfirm(true)
  }

  const confirmRemoveFromTenant = async () => {
    if (!pendingRemoveAction) return
    const { tenantId } = pendingRemoveAction
    setShowRemoveConfirm(false)
    try {
      setUpdating(true)
      setActionError(null)
      setActionSuccess(null)
      const res = await fetch(`/api/admin/users/${userId}/tenants/${tenantId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove membership')
      flashSuccess('Membership removed')
      await fetchUser()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUpdating(false)
      setPendingRemoveAction(null)
    }
  }

  const tenantRoles = ['member', 'admin', 'viewer']

  return (
    <AdminPageLayout
      shellTitle={user ? `${user.email}` : 'User'}
      shellSubtitle="Platform user profile"
      hero={{
        icon: Users,
        description: 'Inspect platform accounts, assign tenants, and manage roles.',
        helper: user?.role_global || 'No platform role',
        actions: (
          <div className="flex flex-wrap gap-3">
            <PrimaryAction onClick={() => navigate('/admin/users')}>
              Back to users
            </PrimaryAction>
            <SecondaryAction onClick={() => setShowAssignDialog(true)}>
              Assign tenant
            </SecondaryAction>
          </div>
        )
      }}
    >
      {loading ? (
        <LoadingState message="Loading user details..." />
      ) : (
        <div className="space-y-6">
          {actionError && <ErrorState title="Action failed" description={actionError} />}
          {actionSuccess && (
            <Alert title="Success" type="success">
              {actionSuccess}
            </Alert>
          )}
          <Card variant="glass">
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Name</p>
                <p className="text-lg font-semibold text-[var(--text)]">{user?.name || '—'}</p>
                <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-[var(--text-muted)]">Platform role</p>
                <div className="flex gap-2">
                  <Select
                    value={platformRole}
                    onChange={(e) => setPlatformRole(e.target.value)}
                    disabled={isProtectedAdmin}
                  >
                    {['none', 'platform_support', 'platform_admin', 'system_admin'].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                  <Button onClick={handleUpdatePlatformRole} disabled={updating || isProtectedAdmin}>
                    Save role
                  </Button>
                </div>
                <Badge className={user?.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {user?.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              <Button onClick={handleToggleActive} variant={user?.active ? 'secondary' : 'primary'}>
                {user?.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button onClick={() => setShowAssignDialog(true)} variant="ghost">
                Assign tenant
              </Button>
            </CardFooter>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>
                <ShieldCheck className="h-4 w-4 text-primary-500" /> Current tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenants.length === 0 ? (
                <EmptyState title="No tenants" description="This user is not assigned to any tenant yet." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.tenant_id}>
                          <TableCell>
                            <p className="text-sm font-semibold text-[var(--text)]">{tenant.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{tenant.tenant_id}</p>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={tenant.role || 'member'}
                              onChange={(e) => handleChangeTenantRole(tenant.tenant_id, e.target.value)}
                            >
                              {tenantRoles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveFromTenant(tenant.tenant_id, tenant.name)}>
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)} title="Assign tenant">
        <DialogContent>
          <form onSubmit={handleAssignTenant} className="space-y-4">
            {actionError && <ErrorState title="Action failed" description={actionError} />}
            <Input
              placeholder="Search tenants..."
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
            />
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)]">Tenant</label>
              <Select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
              >
                <option value="">Select tenant</option>
                {tenantOptions.map((tenantOption) => (
                  <option key={tenantOption.id} value={tenantOption.id}>
                    {tenantOption.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)]">Role</label>
              <Select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
              >
                {tenantRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowAssignDialog(false)} disabled={tenantsLoading}>
            Cancel
          </Button>
          <Button onClick={handleAssignTenant} disabled={!selectedTenantId || tenantsLoading || updating}>
            {tenantsLoading || updating ? 'Saving...' : 'Assign'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={showToggleConfirm}
        onClose={() => {
          setShowToggleConfirm(false)
          setPendingToggleAction(null)
        }}
        title={pendingToggleAction?.verb ? `${pendingToggleAction.verb.charAt(0).toUpperCase() + pendingToggleAction.verb.slice(1)} user` : 'Confirm action'}
        description={`Are you sure you want to ${pendingToggleAction?.verb} ${pendingToggleAction?.email}?`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowToggleConfirm(false)
                setPendingToggleAction(null)
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmToggleUser} disabled={updating}>
              {updating ? 'Updating...' : 'Confirm'}
            </Button>
          </>
        }
      />

      <Dialog
        open={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false)
          setPendingRemoveAction(null)
        }}
        title="Remove from tenant"
        description={`Remove ${user?.email} from ${pendingRemoveAction?.tenantName}? This cannot be undone.`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRemoveConfirm(false)
                setPendingRemoveAction(null)
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemoveFromTenant} disabled={updating}>
              {updating ? 'Removing...' : 'Remove'}
            </Button>
          </>
        }
      />
    </AdminPageLayout>
  )
}

export default UserDetailPage
