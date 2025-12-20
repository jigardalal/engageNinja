/**
 * AdminDashboard Component
 * Platform admin dashboard for managing tenants and users
 * Only accessible to platform admins
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import AppShell from '../../components/layout/AppShell';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createOwnerEmail, setCreateOwnerEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [stats, setStats] = useState(null);
  const [updatingTenantId, setUpdatingTenantId] = useState(null);

  // Fetch tenants and stats
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tenants
      const tenantsRes = await fetch('/api/admin/tenants', {
        credentials: 'include'
      });

      if (!tenantsRes.ok) {
        throw new Error('Failed to fetch tenants');
      }

      const tenantsData = await tenantsRes.json();
      setTenants(tenantsData.tenants || []);

      // Fetch stats
      const statsRes = await fetch('/api/admin/stats', {
        credentials: 'include'
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError('Tenant name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: createName,
          ownerEmail: createOwnerEmail || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tenant');
      }

      setShowCreateDialog(false);
      setCreateName('');
      setCreateOwnerEmail('');
      await fetchData();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleViewTenant = (tenantId) => {
    navigate(`/admin/tenants/${tenantId}`);
  };

  const handleStatusChange = async (tenantId, newStatus) => {
    try {
      setUpdatingTenantId(tenantId);
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      await fetchData(); // Refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingTenantId(null);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

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
      <AppShell title="Admin Dashboard" subtitle="Access Denied">
        <Alert type="error" title="Access Denied">
          You need platform admin privileges to access this page.
        </Alert>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle="Manage all tenants and platform settings"
      actions={
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/admin/audit-logs')}
            className="bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-black/5"
          >
            View Audit Logs
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-primary text-white hover:bg-primary/90"
          >
            + Create Tenant
          </Button>
        </div>
      }
    >
      <div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Tenants', value: stats.tenants },
              { label: 'Active Tenants', value: stats.active_tenants },
              { label: 'Total Users', value: stats.users },
              { label: 'Active Users', value: stats.active_users },
              { label: 'Platform Admins', value: stats.platform_admins },
              { label: 'Campaigns', value: stats.campaigns },
              { label: 'Contacts', value: stats.contacts },
              { label: 'WhatsApp Messages Sent', value: stats.whatsapp_messages_sent },
              { label: 'Email Messages Sent', value: stats.email_messages_sent }
            ].map((card) => (
              <div key={card.label} className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-6">
                <div className="text-[var(--text-muted)] text-sm font-medium mb-1">{card.label}</div>
                <div className="text-3xl font-bold text-[var(--text)]">{card.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert type="error" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Controls */}
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Search Tenants
              </label>
              <Input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)]">Loading tenants...</p>
          </div>
        )}

        {/* Tenants Table */}
        {!loading && filteredTenants.length > 0 && (
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow overflow-hidden">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card)] divide-y divide-[var(--border)]">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-black/3 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {tenant.plan_name || 'Standard'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {tenant.user_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={tenant.status || 'active'}
                        onChange={(e) => handleStatusChange(tenant.id, e.target.value)}
                        disabled={updatingTenantId === tenant.id}
                        className="text-xs border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded px-2 py-1 cursor-pointer disabled:opacity-50"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewTenant(tenant.id)}
                        className="text-primary hover:text-primary/80 transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTenants.length === 0 && tenants.length > 0 && (
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-12 text-center">
            <p className="text-[var(--text-muted)]">No tenants match your search</p>
          </div>
        )}

        {!loading && tenants.length === 0 && (
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-12 text-center">
            <p className="text-[var(--text-muted)]">No tenants yet. Use the "Create Tenant" button above to get started.</p>
          </div>
        )}

        {/* Create Tenant Dialog */}
        <Dialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          title="Create New Tenant"
        >
          <form onSubmit={handleCreateTenant} className="space-y-4">
            {createError && (
              <Alert type="error" title="Error">
                {createError}
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Tenant Name
              </label>
              <Input
                type="text"
                placeholder="Acme Corp"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                disabled={creating}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Owner Email (Optional)
              </label>
              <Input
                type="email"
                placeholder="owner@example.com"
                value={createOwnerEmail}
                onChange={(e) => setCreateOwnerEmail(e.target.value)}
                disabled={creating}
              />
              <p className="text-xs text-gray-500 mt-1">
                If provided, this user will be set as the tenant owner
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !createName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Tenant'}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
};

export default AdminDashboard;
