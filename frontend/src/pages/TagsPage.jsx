import React, { useEffect, useState, useCallback } from 'react';
import AppShell from '../components/layout/AppShell';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';

const statusBadgeClass = (status) => {
  if (status === 'archived') return 'bg-gray-100 text-gray-800';
  return 'bg-green-100 text-green-800';
};

export default function TagsPage({ embedded = false } = {}) {
  const { userRole } = useAuth();
  const canManage = ['admin', 'owner'].includes(userRole);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/contacts/tags/list?include_archived=1', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load tags');
      }
      const list = data.data || [];
      setTags(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage || !newTag.trim()) return;
    try {
      setCreating(true);
      setError(null);
      const res = await fetch('/api/contacts/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newTag.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tag');
      }
      setNewTag('');
      await fetchTags();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTag = useCallback(
    async (tagId, name, status) => {
      if (!canManage) return;
      try {
        setSavingId(tagId);
        setError(null);
        const res = await fetch(`/api/contacts/tags/${tagId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, status })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update tag');
        }
        setTags((prev) =>
          prev.map((tag) =>
            tag.id === tagId
              ? { ...tag, name: data.name, status: data.status }
              : tag
          )
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setSavingId(null);
      }
    },
    [canManage]
  );

  const visibleTags = tags.filter((tag) => {
    if (statusFilter === 'all') return true;
    return (tag.status || 'active') === statusFilter;
  });

  const Shell = ({ children }) => (
    embedded ? <>{children}</> : (
      <AppShell
        title="Tags"
        subtitle="Manage tags for this workspace"
      >
        {children}
      </AppShell>
    )
  );

  return (
    <Shell>
      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow mb-6 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow mb-6 p-6">
        <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text)] mb-2">New tag name</label>
            <Input
              data-testid="create-tag-input"
              type="text"
              placeholder="e.g., vip"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              disabled={!canManage || creating}
            />
          </div>
          <Button type="submit" disabled={!canManage || creating || !newTag.trim()}>
            {creating ? 'Creating...' : 'Create Tag'}
          </Button>
        </form>
        {!canManage && (
          <p className="text-sm text-[var(--text-muted)] mt-3">
            Only tenant owners and admins can create or edit tags.
          </p>
        )}
      </div>

      {error && (
        <Alert type="error" title="Error" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-[var(--text-muted)]">Loading tags...</p>
        </div>
      ) : visibleTags.length === 0 ? (
        <div
          className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-12 text-center"
          data-testid="empty-tenant-tags"
        >
          <p className="text-[var(--text-muted)]">No tags match this filter.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]" data-testid="tenant-tags-table">
            <thead className="bg-black/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Flags</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visibleTags.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  canManage={canManage}
                  savingId={savingId}
                  onSave={handleSaveTag}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

const TagRow = React.memo(({ tag, canManage, savingId, onSave }) => {
  const [name, setName] = useState(tag.name);
  const [status, setStatus] = useState(tag.status || 'active');

  useEffect(() => {
    setName(tag.name);
    setStatus(tag.status || 'active');
  }, [tag.id, tag.name, tag.status]);

  const trimmedName = name.trim();
  const isSaving = savingId === tag.id;

  return (
    <tr className="hover:bg-black/3 transition">
      <td className="px-6 py-4 whitespace-nowrap">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canManage}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
          disabled={!canManage}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <Badge className={`${statusBadgeClass(status)} ml-2`}>
          {status}
        </Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
        {tag.is_default ? <Badge className="bg-blue-100 text-blue-800">Default</Badge> : '—'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Button
          size="sm"
          disabled={!canManage || isSaving || trimmedName.length === 0}
          onClick={() => onSave(tag.id, trimmedName, status)}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </td>
    </tr>
  );
});
