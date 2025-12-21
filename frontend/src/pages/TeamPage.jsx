/**
 * TeamPage Component
 * User management and invitation interface for tenant admins/owners
 * Only accessible to users with admin+ role
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import AppShell from '../components/layout/AppShell';
import PageHeader from '../components/layout/PageHeader';
import { PrimaryAction } from '../components/ui/ActionButtons';
import { Users } from 'lucide-react';

export const TeamPage = ({ embedded = false } = {}) => {
  const { activeTenant, hasRole, userRole, user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Check if user has admin access
  const isAdmin = hasRole('admin');
  const isOwner = userRole === 'owner';
  const canManageMembers = isAdmin;
  const selectClassName = 'px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary focus:ring-2 focus:ring-offset-0 transition';

  const inviteAction = isAdmin ? (
    <PrimaryAction onClick={() => setShowInviteDialog(true)}>
      Invite team member
    </PrimaryAction>
  ) : null;

  const Shell = ({ children }) => (
    embedded ? <>{children}</> : (
      <AppShell
        title="Team Members"
        subtitle="Manage your team members and their roles"
      >
        <PageHeader
          icon={Users}
          title="Team management"
          description="Invite, role, and remove members across the tenant."
          helper={isAdmin ? 'Admin access only' : 'View-only mode'}
          actions={inviteAction}
        />
        {children}
      </AppShell>
    )
  );

  // Fetch team members
  useEffect(() => {
    fetchTeamMembers();
  }, [activeTenant]);

  const fetchTeamMembers = async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tenant/users', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load team members');
      }

      const data = await response.json();
      setTeamMembers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }

    try {
      setInviting(true);
      const response = await fetch('/api/tenant/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail.toLowerCase(),
          role: inviteRole
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteDialog(false);
      setSuccessMessage(`User invited as ${inviteRole}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh team members
      await fetchTeamMembers();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!canManageMembers) {
      setError('You need admin access to change user roles');
      return;
    }

    try {
      const response = await fetch(`/api/tenant/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change role');
      }

      setSuccessMessage('Role updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchTeamMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveUser = async (userId, userEmail) => {
    if (!canManageMembers) {
      setError('You need admin access to remove users');
      return;
    }

    if (userId === user?.id) {
      setError('You cannot remove yourself from the tenant');
      return;
    }

    if (!window.confirm(`Remove ${userEmail} from this team?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tenant/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove user');
      }

      setSuccessMessage('User removed from team');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchTeamMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (!isAdmin) {
    return embedded ? (
      <Alert type="error" title="Access Denied">
        You need admin role to access team management. Current role: {userRole}
      </Alert>
    ) : (
      <AppShell title="Team Management" subtitle="Access Denied">
        <Alert type="error" title="Access Denied">
          You need admin role to access team management. Current role: {userRole}
        </Alert>
      </AppShell>
    );
  }

  return (
    <Shell>
      <div>
        {/* Success Message */}
        {successMessage && (
          <Alert type="success" title="Success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert type="error" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)]">Loading team members...</p>
          </div>
        )}

        {/* Team Members List */}
        {!loading && teamMembers.length > 0 && (
          <div className="bg-[var(--card)] rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-black/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Joined
                  </th>
                  {canManageMembers && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-[var(--card)] divide-y divide-[var(--border)]">
                {teamMembers.map((member, index) => (
                  <tr key={member.id || member.user_id || member.email || `${member.role}-${index}`} className="hover:bg-black/5">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">
                      {member.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canManageMembers && member.role !== 'owner' ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id ?? member.user_id, e.target.value)}
                            className={`${selectClassName} text-sm`}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </>
                      ) : (
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {member.joined_at
                        ? new Date(member.joined_at).toLocaleDateString()
                        : 'Recently'}
                    </td>
                    {canManageMembers && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveUser(member.id ?? member.user_id, member.email)}
                            className="text-red-600 hover:text-red-900 transition"
                          >
                            Remove
                          </button>
                        )}
                        {member.role === 'owner' && (
                          <span className="text-[var(--text-muted)] text-xs">Cannot remove</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && teamMembers.length === 0 && (
          <div className="bg-[var(--card)] rounded-lg shadow p-12 text-center">
            <p className="text-[var(--text-muted)] mb-4">No team members yet</p>
            {isAdmin && (
              <Button
                onClick={() => setShowInviteDialog(true)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                Invite Your First Team Member
              </Button>
            )}
          </div>
        )}

        {/* Invite Dialog */}
        <Dialog
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          title="Invite Team Member"
        >
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {inviteError && (
              <Alert type="error" title="Error">
                {inviteError}
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={inviting}
                className={`${selectClassName} w-full`}
              >
                <option value="viewer">Viewer - Read-only access</option>
                <option value="member">Member - Can send campaigns & create contacts</option>
                <option value="admin">Admin - Can manage team & configure channels</option>
                <option value="owner">Owner - Full tenant control</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                onClick={() => setShowInviteDialog(false)}
                disabled={inviting}
                className="px-4 py-2 border border-[var(--border)] rounded-md text-[var(--text)] hover:bg-black/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </Shell>
  );
};

export default TeamPage;
