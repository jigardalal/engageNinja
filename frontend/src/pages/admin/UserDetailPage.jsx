import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';

export const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [platformRole, setPlatformRole] = useState('none');

  // Assign tenant dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantOptions, setTenantOptions] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [assignRole, setAssignRole] = useState('member');
  const isProtectedAdmin = user?.role_global === 'platform_admin' || user?.role_global === 'system_admin';

  useEffect(() => {
    fetchUser();
  }, [userId]);

  useEffect(() => {
    if (user) {
      setPlatformRole(user.role_global || 'none');
    }
  }, [user]);

  useEffect(() => {
    if (!showAssignDialog) return;
    let cancelled = false;

    const fetchTenants = async () => {
      try {
        setTenantsLoading(true);
        const query = tenantSearch ? `?search=${encodeURIComponent(tenantSearch)}&limit=25` : '?limit=25';
        const res = await fetch(`/api/admin/tenants${query}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load tenants');
        const data = await res.json();
        if (cancelled) return;

        const existing = new Set((tenants || []).map(t => t.tenant_id));
        const options = (data.tenants || []).filter(t => !existing.has(t.id));
        setTenantOptions(options);
      } catch (err) {
        if (!cancelled) {
          setActionError(err.message);
        }
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    };

    fetchTenants();
    return () => { cancelled = true; };
  }, [showAssignDialog, tenantSearch, tenants]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'User not found' : 'Failed to fetch user');
      }
      const data = await res.json();
      setUser(data.user);
      setTenants(data.tenants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const flashSuccess = (message) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const updateUser = async (updates) => {
    try {
      setUpdating(true);
      setActionError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      flashSuccess('User updated');
      await fetchUser();
      return true;
    } catch (err) {
      setActionError(err.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async () => {
    if (isProtectedAdmin && user.active) {
      setActionError('Platform admin accounts cannot be deactivated');
      return;
    }
    const nextActive = !user.active;
    const verb = nextActive ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${verb} ${user.email}?`)) return;
    await updateUser({ active: nextActive });
  };

  const handleUpdatePlatformRole = async () => {
    if (isProtectedAdmin && (user.role_global || 'none') !== platformRole) {
      setActionError('Platform admin accounts cannot have their platform role changed');
      return;
    }
    if ((user.role_global || 'none') === platformRole) return;
    await updateUser({ role_global: platformRole });
  };

  const handleAssignTenant = async (e) => {
    e.preventDefault();
    if (!selectedTenantId) return;

    try {
      setUpdating(true);
      setActionError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/admin/users/${userId}/tenants/${selectedTenantId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: assignRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign tenant');
      flashSuccess('User assigned to tenant');
      setShowAssignDialog(false);
      setSelectedTenantId('');
      setTenantSearch('');
      setAssignRole('member');
      await fetchUser();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeTenantRole = async (tenantId, role) => {
    try {
      setUpdating(true);
      setActionError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/admin/users/${userId}/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update membership');
      flashSuccess('Membership updated');
      await fetchUser();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveFromTenant = async (tenantId, tenantName) => {
    if (!window.confirm(`Remove ${user.email} from ${tenantName}?`)) return;
    try {
      setUpdating(true);
      setActionError(null);
      setActionSuccess(null);
      const res = await fetch(`/api/admin/users/${userId}/tenants/${tenantId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove user from tenant');
      flashSuccess('User removed from tenant');
      await fetchUser();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const roleBadge = (role) => {
    const map = {
      system_admin: 'bg-purple-100 text-purple-800',
      platform_admin: 'bg-blue-100 text-blue-800',
      platform_support: 'bg-green-100 text-green-800',
      none: 'bg-gray-100 text-gray-800'
    };
    return map[role] || map.none;
  };

  const tenantBadge = (role) => {
    const map = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return map[role] || map.viewer;
  };

  if (loading) {
    return (
      <AppShell title="Loading user..." subtitle="Please wait">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading user details...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !user) {
    return (
      <AppShell title="User" subtitle="Error loading user">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate('/admin/users')}
            className="mb-6 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-black/5"
          >
            ← Back to Users
          </Button>
          <Alert type="error" title="Error">
            {error || 'User not found'}
          </Alert>
        </div>
      </AppShell>
    );
  }

    return (
      <AppShell title={user.name || user.email} subtitle="Platform user detail">
      <div className="max-w-5xl mx-auto">
        <Button
          onClick={() => navigate('/admin/users')}
          className="mb-6 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-black/5"
        >
          ← Back to Users
        </Button>

        {actionSuccess && (
          <Alert type="success" title="Success" className="mb-4">
            {actionSuccess}
          </Alert>
        )}
        {actionError && (
          <Alert type="error" title="Action failed" className="mb-4">
            {actionError}
          </Alert>
        )}

        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--text-muted)]">User ID</p>
                <p className="text-sm font-mono text-[var(--text)]">{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Email</p>
                <p className="text-[var(--text)]">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Name</p>
                <p className="text-[var(--text)]">{user.name || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">First Name</p>
                  <p className="text-[var(--text)]">{user.first_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Last Name</p>
                  <p className="text-[var(--text)]">{user.last_name || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Phone</p>
                <p className="text-[var(--text)]">{user.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Timezone</p>
                <p className="text-[var(--text)]">{user.timezone || '—'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Platform Role</p>
                <Badge className={roleBadge(user.role_global || 'none')}>
                  {user.role_global || 'none'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Status</p>
                <Badge className={user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {user.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Created</p>
                <p className="text-[var(--text)]">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border)] flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm text-[var(--text-muted)] mb-1">Platform Role</label>
              <select
                value={platformRole}
                onChange={(e) => setPlatformRole(e.target.value)}
                disabled={updating || isProtectedAdmin}
                className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
              >
                <option value="none">none</option>
                <option value="platform_support">platform_support</option>
                <option value="platform_admin">platform_admin</option>
                <option value="system_admin">system_admin</option>
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Setting `system_admin` requires system admin privileges.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleUpdatePlatformRole}
                disabled={updating || isProtectedAdmin || (user.role_global || 'none') === platformRole}
              >
                Update Role
              </Button>
              <Button
                variant="secondary"
                onClick={handleToggleActive}
                disabled={updating || (isProtectedAdmin && user.active)}
              >
                {user.active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-[var(--text)]">Tenant Memberships ({tenants.length})</h3>
              <Button onClick={() => setShowAssignDialog(true)} disabled={updating}>
                + Assign to Tenant
              </Button>
            </div>
          </div>
          {tenants.length === 0 ? (
            <div className="px-6 py-12 text-center text-[var(--text-muted)]">No tenant memberships</div>
          ) : (
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {tenants.map((tenant) => (
                  <tr key={tenant.tenant_id} className="hover:bg-black/3 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Badge className={tenantBadge(tenant.role)}>
                          {tenant.role}
                        </Badge>
                        <select
                          defaultValue={tenant.role}
                          onChange={(e) => handleChangeTenantRole(tenant.tenant_id, e.target.value)}
                          disabled={updating}
                          className="px-2 py-1 text-sm border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
                        >
                          <option value="viewer">viewer</option>
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {new Date(tenant.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {tenant.role === 'owner' ? (
                        <span className="text-[var(--text-muted)] text-xs">Owner protected</span>
                      ) : (
                        <button
                          className="text-red-600 hover:text-red-900 transition disabled:opacity-50"
                          onClick={() => handleRemoveFromTenant(tenant.tenant_id, tenant.name)}
                          disabled={updating}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Dialog
          isOpen={showAssignDialog}
          onClose={() => setShowAssignDialog(false)}
          title="Assign User to Tenant"
        >
          <form onSubmit={handleAssignTenant} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Search Tenants
              </label>
              <Input
                type="text"
                placeholder="Search by tenant name or id..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                disabled={updating}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Showing tenants the user is not already assigned to.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Tenant
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                disabled={updating || tenantsLoading}
                className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
              >
                <option value="">{tenantsLoading ? 'Loading...' : 'Select a tenant'}</option>
                {tenantOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Role
              </label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                disabled={updating}
                className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
              >
                <option value="viewer">viewer</option>
                <option value="member">member</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAssignDialog(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updating || !selectedTenantId}
              >
                Assign
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
};

export default UserDetailPage;
