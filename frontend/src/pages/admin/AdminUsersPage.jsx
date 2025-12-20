import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';

export const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [roleUpdates, setRoleUpdates] = useState({});
  const [roleSaving, setRoleSaving] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (searchTerm = '') => {
    try {
      setLoading(true);
      setError(null);
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const res = await fetch(`/api/admin/users${query}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    fetchUsers(value);
  };

  const setUserActive = async (userId, active) => {
    const verb = active ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${verb} this user?`)) return;

    try {
      setActionLoading(prev => ({ ...prev, [userId]: true }));
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      await fetchUsers(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const platformRoles = ['none', 'platform_support', 'platform_admin', 'system_admin'];

  const handleRoleSelectChange = (userId, value) => {
    setRoleUpdates((prev) => ({
      ...prev,
      [userId]: value
    }));
  };

  const savePlatformRole = async (userId, role) => {
    if (!role) return;
    try {
      setRoleSaving((prev) => ({ ...prev, [userId]: true }));
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role_global: role })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role');
      }
      await fetchUsers(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setRoleSaving((prev) => ({ ...prev, [userId]: false }));
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

  return (
    <AppShell
      title="Admin — Users"
      subtitle="View all platform users and their tenant memberships"
    >
      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow mb-6">
        <div className="px-6 py-6 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Search users</label>
            <Input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                fetchUsers('');
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Error" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-12 text-center">
          <p className="text-[var(--text-muted)]">No users found.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow">
          <div className="overflow-x-auto">
            <table className="min-w-[880px] divide-y divide-[var(--border)]">
              <thead className="bg-black/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Platform Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Tenants
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
              {users.map((user) => {
                const isProtectedAdmin = user.active && (user.role_global === 'platform_admin' || user.role_global === 'system_admin');
                return (
                  <tr key={user.id} className="hover:bg-black/3 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">
                    {user.name || `${user.first_name || '—'} ${user.last_name || ''}`.trim() || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const isProtectedRole = user.role_global === 'system_admin' || user.role_global === 'platform_admin';
                        return (
                          <>
                            <select
                              value={roleUpdates[user.id] ?? (user.role_global || 'none')}
                              onChange={(e) => handleRoleSelectChange(user.id, e.target.value)}
                              className="px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--card)] text-[var(--text)] focus:outline-none focus:ring-primary focus:ring-2 focus:ring-offset-0"
                              disabled={isProtectedRole}
                            >
                              {platformRoles.map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={
                                roleSaving[user.id] ||
                                isProtectedRole ||
                                (roleUpdates[user.id] ?? (user.role_global || 'none')) === (user.role_global || 'none')
                              }
                              onClick={() => savePlatformRole(user.id, roleUpdates[user.id] ?? (user.role_global || 'none'))}
                              className="h-10 px-3 py-1"
                            >
                              {roleSaving[user.id] ? 'Saving...' : 'Save'}
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {user.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                    {user.tenant_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-primary hover:text-primary/80 transition"
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        View
                      </button>
                      {isProtectedAdmin ? (
                        <span className="text-[var(--text-muted)] text-xs">Protected</span>
                      ) : (
                        <button
                          className={user.active ? 'text-red-600 hover:text-red-900 transition' : 'text-green-700 hover:text-green-900 transition'}
                          onClick={() => setUserActive(user.id, !user.active)}
                          disabled={!!actionLoading[user.id]}
                        >
                          {actionLoading[user.id]
                            ? 'Saving...'
                            : (user.active ? 'Deactivate' : 'Activate')}
                        </button>
                      )}
                    </div>
                  </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default AdminUsersPage;
