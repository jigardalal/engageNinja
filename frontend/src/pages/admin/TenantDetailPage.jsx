/**
 * TenantDetailPage Component
 * View and manage individual tenant details, users, and settings
 * Only accessible to platform admins
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import AppShell from '../../components/layout/AppShell';
import TenantEditForm from './TenantEditForm';
import TenantBillingTab from './TenantBillingTab';

export const TenantDetailPage = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { isPlatformAdmin, switchTenant } = useAuth();

  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [openingTenant, setOpeningTenant] = useState(false);

  const [activeTab, setActiveTab] = useState('profile');

  const [newStatus, setNewStatus] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Fetch tenant details
  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    if (!tenantId) {
      setError('No tenant ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tenant not found');
        }
        throw new Error('Failed to fetch tenant details');
      }

      const data = await response.json();
      setTenant(data.tenant);
      setUsers(data.users || []);
      setNewStatus(data.tenant?.status || 'active');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === tenant?.status) {
      return;
    }

    try {
      setUpdating(true);
      setUpdateError(null);
      setUpdateSuccess(null);

      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tenant');
      }

      setUpdateSuccess('Tenant status updated');
      setTimeout(() => setUpdateSuccess(null), 3000);
      await fetchTenant();
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSyncTags = async () => {
    try {
      setSyncing(true);
      setSyncError(null);
      setSyncResult(null);

      const response = await fetch(`/api/admin/tenants/${tenantId}/sync-global-tags`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync global tags');
      }

      setSyncResult(`Synced ${data.added} tag(s) from ${data.total_active_global || data.added} active global tags.`);
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenTenantApp = async () => {
    try {
      setOpeningTenant(true);
      await switchTenant(tenantId);
      navigate('/dashboard');
    } catch (err) {
      setOpeningTenant(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
      deleted: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!isPlatformAdmin()) {
    return (
      <AppShell title="Access Denied" subtitle="Insufficient permissions">
        <div className="max-w-2xl mx-auto">
          <Alert type="error" title="Access Denied">
            You need platform admin privileges to access this page.
          </Alert>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Loading..." subtitle="Please wait">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tenant details...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Error" subtitle="Failed to load tenant details">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate('/admin')}
            className="mb-6 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-black/5"
          >
            ← Back to Dashboard
          </Button>
          <Alert type="error" title="Error">
            {error}
          </Alert>
        </div>
      </AppShell>
    );
  }

  if (!tenant) {
    return (
      <AppShell title="Not Found" subtitle="Tenant does not exist">
        <div className="max-w-4xl mx-auto">
          <Alert type="error" title="Not Found">
            Tenant not found
          </Alert>
        </div>
      </AppShell>
    );
  }

  const renderTabButton = (tabKey, label) => (
    <button
      key={tabKey}
      type="button"
      onClick={() => setActiveTab(tabKey)}
      className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
        activeTab === tabKey
          ? 'border-primary text-primary'
          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <AppShell title={tenant.name} subtitle="Manage tenant details, users, and settings">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <Button
            onClick={() => navigate('/admin')}
            className="bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-black/5"
          >
            ← Back to Dashboard
          </Button>
          <Button
            data-testid="open-tenant-app"
            onClick={handleOpenTenantApp}
            disabled={openingTenant}
          >
            {openingTenant ? 'Opening...' : 'Open Tenant App'}
          </Button>
        </div>

        {(updateSuccess || updateError) && (
          <div className="space-y-3 mb-4">
            {updateSuccess && (
              <Alert type="success" title="Success">
                {updateSuccess}
              </Alert>
            )}
            {updateError && (
              <Alert type="error" title="Error">
                {updateError}
              </Alert>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-[var(--border)]">
          <div className="flex flex-wrap gap-4">
            {renderTabButton('profile', 'Profile')}
            {renderTabButton('quota', 'Quota Overrides')}
            {renderTabButton('billing', 'Billing')}
            {renderTabButton('users', `Users (${users.length})`)}
          </div>
        </div>

        {/* Profile Tab */}
        <div className={activeTab === 'profile' ? 'space-y-6' : 'hidden'}>
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow">
            <div className="px-6 py-8">
              <div className="mt-2">
                <h3 className="text-lg font-medium text-[var(--text)] mb-4">Edit Tenant</h3>
                <TenantEditForm tenant={tenant} onUpdated={fetchTenant} showQuotaSection={false} />
              </div>

              <div className="mt-8 pt-8 border-t border-[var(--border)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-[var(--text)] mb-2">Tags</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Sync active global tags into this tenant (adds missing tags only).
                  </p>
                  {syncError && (
                    <Alert type="error" title="Sync failed" className="mt-3" data-testid="sync-tags-error">
                      {syncError}
                    </Alert>
                  )}
                  {syncResult && (
                    <Alert type="success" title="Sync complete" className="mt-3" data-testid="sync-tags-success">
                      {syncResult}
                    </Alert>
                  )}
                </div>
                <Button
                  data-testid="sync-tags-button"
                  onClick={handleSyncTags}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing...' : 'Sync Global Tags'}
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <h3 className="text-lg font-medium text-[var(--text)] mb-4">Change Status</h3>
                <div className="flex gap-4 items-end">
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">New Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      disabled={updating}
                      className="px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleStatusChange}
                    disabled={updating || newStatus === tenant.status}
                    className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Tab */}
        <div className={activeTab === 'quota' ? 'space-y-6' : 'hidden'}>
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow">
            <div className="px-6 py-8 space-y-6">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium text-[var(--text)]">Quota Overrides</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Override plan defaults that apply to this tenant.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Status</label>
                  <div className="flex gap-2 items-center">
                    <Badge className={getStatusBadgeColor(tenant.status || 'active')}>
                      {tenant.status
                        ? tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)
                        : 'Active'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Users</label>
                  <p className="text-2xl font-bold text-[var(--text)]">{users.length}</p>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Campaigns</label>
                  <p className="text-2xl font-bold text-[var(--text)]">{tenant.campaign_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Contacts</label>
                  <p className="text-2xl font-bold text-[var(--text)]">{tenant.contact_count || 0}</p>
                </div>
              </div>
              <TenantEditForm
                tenant={tenant}
                onUpdated={fetchTenant}
                showProfileSections={false}
                showQuotaSection
              />
            </div>
          </div>
        </div>

        {/* Billing Tab */}
        <div className={activeTab === 'billing' ? 'space-y-6' : 'hidden'}>
          <TenantBillingTab tenantId={tenantId} />
        </div>

        {/* Users Tab */}
        <div className={activeTab === 'users' ? 'space-y-6' : 'hidden'}>
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-medium text-[var(--text)]">Team Members ({users.length})</h3>
            </div>
            {users.length > 0 ? (
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-black/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-black/3 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-[var(--text)]">
                        {user.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[var(--text-muted)]">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={
                          user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'member' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[var(--text-muted)]">
                        {new Date(user.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-12 text-center text-gray-600">
                No team members yet
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default TenantDetailPage;
