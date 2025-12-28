/**
 * TeamPage Component
 * User management and invitation interface for tenant admins/owners
 * Only accessible to users with admin+ role
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, toast } from '../components/ui';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import AppShell from '../components/layout/AppShell';
import PageHeader from '../components/layout/PageHeader';
import { PrimaryAction } from '../components/ui/ActionButtons';
import { Users, ArrowUpDown } from 'lucide-react';
import { DataTable } from '../components/ui';

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
      <AppShell hideTitleBlock
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
      const errorMsg = 'Email is required';
      setInviteError(errorMsg);
      toast({
        title: 'Invalid email',
        description: errorMsg,
        variant: 'error'
      });
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

      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${inviteEmail} as ${inviteRole}`,
        variant: 'success'
      });
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
      toast({
        title: 'Failed to send invitation',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!canManageMembers) {
      const errorMsg = 'You need admin access to change user roles';
      setError(errorMsg);
      toast({
        title: 'Access denied',
        description: errorMsg,
        variant: 'error'
      });
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

      toast({
        title: 'Role updated',
        description: `User role changed to ${newRole}`,
        variant: 'success'
      });
      setSuccessMessage('Role updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchTeamMembers();
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Failed to update role',
        description: err.message,
        variant: 'error'
      });
    }
  };

  const handleRemoveUser = async (userId, userEmail) => {
    if (!canManageMembers) {
      const errorMsg = 'You need admin access to remove users';
      setError(errorMsg);
      toast({
        title: 'Access denied',
        description: errorMsg,
        variant: 'error'
      });
      return;
    }

    if (userId === user?.id) {
      const errorMsg = 'You cannot remove yourself from the tenant';
      setError(errorMsg);
      toast({
        title: 'Cannot remove yourself',
        description: errorMsg,
        variant: 'error'
      });
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

      toast({
        title: 'Member removed',
        description: `${userEmail} has been removed from the team`,
        variant: 'success'
      });
      setSuccessMessage('User removed from team');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchTeamMembers();
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Failed to remove member',
        description: err.message,
        variant: 'error'
      });
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

  const columns = useMemo(() => {
    const sortHeader = (label) => ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] hover:bg-transparent px-0"
      >
        {label}
        <ArrowUpDown className="ml-1 h-4 w-4 text-[var(--text-muted)]" />
      </Button>
    );

    return [
      {
        accessorKey: 'name',
        header: sortHeader('Name'),
        cell: ({ row }) => (
          <div className="text-sm font-semibold text-[var(--text)]">
            {row.original.name || 'Unknown'}
          </div>
        )
      },
      {
        accessorKey: 'email',
        header: sortHeader('Email'),
        cell: ({ row }) => (
          <p className="text-sm text-[var(--text-muted)]">{row.original.email}</p>
        )
      },
      {
        id: 'role',
        header: sortHeader('Role'),
        cell: ({ row }) => {
          const member = row.original;
          if (canManageMembers && member.role !== 'owner') {
            return (
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
            );
          }
          return (
            <Badge className={getRoleBadgeColor(member.role)}>
              {member.role?.charAt(0)?.toUpperCase?.() + member.role?.slice(1)}
            </Badge>
          );
        }
      },
      {
        accessorKey: 'joined_at',
        header: sortHeader('Joined'),
        cell: ({ row }) => (
          <p className="text-sm text-[var(--text-muted)]">
            {row.original.joined_at
              ? new Date(row.original.joined_at).toLocaleDateString()
              : 'Recently'}
          </p>
        )
      },
      {
        id: 'actions',
        header: sortHeader('Actions'),
        cell: ({ row }) => {
          const member = row.original;
          if (!canManageMembers) {
            return null;
          }
          if (member.role === 'owner') {
            return <span className="text-xs text-[var(--text-muted)]">Cannot remove</span>;
          }
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemoveUser(member.id ?? member.user_id, member.email)}
            >
              Remove
            </Button>
          );
        }
      }
    ];
  }, [canManageMembers, selectClassName, handleChangeRole, handleRemoveUser]);

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
        {successMessage && (
          <Alert type="success" title="Success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert type="error" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        <DataTable
          title="Team members"
          description="Assign roles and remove teammates inline."
          columns={columns}
          data={teamMembers}
          loading={loading}
          loadingMessage="Loading team members..."
          emptyIcon={Users}
          emptyTitle="No team members yet"
          emptyDescription="Invite your first teammate to get started."
          emptyAction={
            isAdmin ? (
              <PrimaryAction onClick={() => setShowInviteDialog(true)}>
                Invite team member
              </PrimaryAction>
            ) : null
          }
          searchPlaceholder="Search team members..."
          enableSelection={false}
        />

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
