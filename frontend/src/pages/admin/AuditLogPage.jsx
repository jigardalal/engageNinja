/**
 * AuditLogPage Component
 * View system-wide audit logs with filtering and search
 * Only accessible to platform admins
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import AppShell from '../../components/layout/AppShell';

export const AuditLogPage = () => {
  const { isPlatformAdmin } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);

  // Fetch logs
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [offset, limit, filterAction, filterActor, filterTenant, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let queryParams = new URLSearchParams({
        limit,
        offset
      });

      if (filterAction) queryParams.append('action', filterAction);
      if (filterActor) queryParams.append('userId', filterActor);
      if (filterTenant) queryParams.append('tenantId', filterTenant);
      if (startDate) {
        const iso = new Date(startDate).toISOString();
        queryParams.append('startDate', iso);
      }
      if (endDate) {
        const iso = new Date(endDate).toISOString();
        queryParams.append('endDate', iso);
      }

      const response = await fetch(`/api/admin/audit-logs?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('delete')) return 'bg-red-100 text-red-800';
    if (action.includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('login')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

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

  return (
    <AppShell title="Audit Logs" subtitle="View all system activity and compliance logs">
      <div className="max-w-6xl mx-auto">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[var(--card)] rounded-lg shadow p-6">
              <div className="text-[var(--text-muted)] text-sm font-medium mb-1">Total Events</div>
              <div className="text-3xl font-bold text-[var(--text)]">{stats.summary?.total_logs || 0}</div>
            </div>
            <div className="bg-[var(--card)] rounded-lg shadow p-6">
              <div className="text-[var(--text-muted)] text-sm font-medium mb-1">Platform Events</div>
              <div className="text-3xl font-bold text-[var(--text)]">{stats.summary?.platform_actions || 0}</div>
            </div>
            <div className="bg-[var(--card)] rounded-lg shadow p-6">
              <div className="text-[var(--text-muted)] text-sm font-medium mb-1">Tenant Events</div>
              <div className="text-3xl font-bold text-[var(--text)]">{stats.summary?.tenant_actions || 0}</div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert type="error" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Filters */}
        <div className="bg-[var(--card)] rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-[var(--text)] mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Action
              </label>
              <Input
                type="text"
                placeholder="e.g., user.login, tenant.create"
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Actor (User ID)
              </label>
              <Input
                type="text"
                placeholder="User ID..."
                value={filterActor}
                onChange={(e) => {
                  setFilterActor(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Tenant ID
              </label>
              <Input
                type="text"
                placeholder="Tenant ID..."
                value={filterTenant}
                onChange={(e) => {
                  setFilterTenant(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Items Per Page
              </label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-primary"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Start Date
              </label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                End Date
              </label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => {
                setFilterAction('');
                setFilterActor('');
                setFilterTenant('');
                setStartDate('');
                setEndDate('');
                setOffset(0);
              }}
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)]">Loading audit logs...</p>
          </div>
        )}

        {/* Logs Table */}
        {!loading && logs.length > 0 && (
          <div className="bg-[var(--card)] rounded-lg shadow overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card)] divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-[var(--text)]">
                        {log.actor_name || 'System'}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {log.actor_email || log.actor_user_id || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {log.tenant_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      <div>{log.target_type || '-'}</div>
                      <div className="text-xs text-[var(--text-muted)]">{log.target_id || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      <div title={log.created_at}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="bg-[var(--card)] rounded-lg shadow p-12 text-center">
            <p className="text-[var(--text-muted)]">No audit logs found matching your filters</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-[var(--text-muted)]">
              Page {currentPage} of {totalPages} (Total: {totalCount})
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 border border-[var(--border)] rounded-md text-[var(--text)] hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-[var(--border)] rounded-md text-[var(--text)] hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AuditLogPage;
