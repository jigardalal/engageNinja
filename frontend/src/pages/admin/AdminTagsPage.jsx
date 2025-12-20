import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';

export const AdminTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newTag, setNewTag] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchTags();
  }, [statusFilter]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/global-tags${qs ? `?${qs}` : ''}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load tags');
      const data = await res.json();
      setTags(data.tags || []);
      const map = {};
      (data.tags || []).forEach(t => {
        map[t.id] = { name: t.name, status: t.status };
      });
      setDrafts(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    try {
      setCreating(true);
      setError(null);
      const res = await fetch('/api/admin/global-tags', {
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

  const handleSave = async (tagId) => {
    const draft = drafts[tagId];
    if (!draft) return;
    try {
      setSavingId(tagId);
      setError(null);
      const res = await fetch(`/api/admin/global-tags/${tagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: draft.name, status: draft.status })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update tag');
      }
      await fetchTags();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = (tagId, patch) => {
    setDrafts(prev => ({
      ...prev,
      [tagId]: {
        ...prev[tagId],
        ...patch
      }
    }));
  };

  const statusBadge = (status) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <AppShell
      title="Admin — Global Tags"
      subtitle="Manage platform-wide default tags"
    >
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
              type="text"
              placeholder="e.g., vip"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              disabled={creating}
            />
          </div>
          <Button type="submit" disabled={creating || !newTag.trim()}>
            {creating ? 'Creating...' : 'Create Tag'}
          </Button>
        </form>
      </div>

      {error && (
        <Alert type="error" title="Error" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading tags...</p>
        </div>
      ) : tags.length === 0 ? (
        <div
          className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow p-12 text-center"
          data-testid="empty-tags"
        >
          <p className="text-[var(--text-muted)]">No global tags yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] shadow overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-black/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-black/3 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Input
                      value={drafts[tag.id]?.name || ''}
                      onChange={(e) => updateDraft(tag.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={drafts[tag.id]?.status || 'active'}
                      onChange={(e) => updateDraft(tag.id, { status: e.target.value })}
                      className="px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--text)] rounded-md focus:outline-none focus:ring-primary"
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                    <Badge className={`${statusBadge(drafts[tag.id]?.status || tag.status)} ml-2`}>
                      {drafts[tag.id]?.status || tag.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                    {new Date(tag.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      size="sm"
                      disabled={savingId === tag.id}
                      onClick={() => handleSave(tag.id)}
                    >
                      {savingId === tag.id ? 'Saving...' : 'Save'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
};

export default AdminTagsPage;
