import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Alert
} from '../components/ui';

/**
 * Dashboard Page
 * Main authenticated page showing user info and quick actions
 */
export const DashboardPage = () => {
  const navigate = useNavigate();
  const { tenants, activeTenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    contactsTotal: 0,
    campaignsTotal: 0,
    activeSending: 0,
    readRate: 0
  });
  const [roiSnapshot, setRoiSnapshot] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);

  const activeTenantInfo = tenants.find(t => t.tenant_id === activeTenant);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [contactsRes, campaignsRes] = await Promise.all([
          fetch('/api/contacts?limit=1&offset=0', { credentials: 'include' }),
          fetch('/api/campaigns?limit=5&offset=0', { credentials: 'include' })
        ]);

        if (!contactsRes.ok) throw new Error('Failed to load contacts');
        if (!campaignsRes.ok) throw new Error('Failed to load campaigns');

        const contactsData = await contactsRes.json();
        const campaignsData = await campaignsRes.json();
        let roiData = null;

        // Best-effort ROI snapshot fetch (do not block dashboard if it fails)
        try {
          const roiRes = await fetch('/api/campaigns/roi-snapshot?limit=40', { credentials: 'include' });
          if (roiRes.ok) {
            const roiJson = await roiRes.json();
            roiData = roiJson.data || null;
          }
        } catch (e) {
          console.warn('ROI snapshot fetch failed', e);
        }

        const contactsTotal = contactsData.pagination?.total ?? (contactsData.contacts?.length || 0);
        const campaignsList = campaignsData.data || [];
        const campaignsTotal = campaignsData.pagination?.total ?? campaignsList.length;

        const activeSending = campaignsList.filter(c => c.status === 'sending').length;
        const sentCount = campaignsList.reduce((sum, c) => sum + (c.sent_count || 0), 0);
        const readCount = campaignsList.reduce((sum, c) => sum + (c.read_count || 0), 0);
        const readRate = sentCount > 0 ? Math.round((readCount / sentCount) * 100) : 0;

        setStats({
          contactsTotal,
          campaignsTotal,
          activeSending,
          readRate
        });
        setRecentCampaigns(campaignsList.slice(0, 5));
        setRoiSnapshot(roiData);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Quick overview of your EngageNinja workspace"
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-[var(--text-muted)]">Workspace</p>
          <h2 className="text-2xl font-bold text-[var(--text)]">{activeTenantInfo?.name || 'Your Tenant'}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Plan: <span className="font-semibold text-[var(--text)]">{activeTenantInfo?.plan || 'Free Plan'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/settings?tab=tenant')}>Upgrade plan</Button>
          <Button variant="secondary" onClick={() => navigate('/settings?tab=channels')}>Manage settings</Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-sm text-[var(--text-muted)]">Contacts</p>
            <p className="text-2xl font-bold text-[var(--text)]">{stats.contactsTotal}</p>
            <p className="text-xs text-[var(--text-muted)]">Total reachable audience</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-sm text-[var(--text-muted)]">Campaigns</p>
            <p className="text-2xl font-bold text-[var(--text)]">{stats.campaignsTotal}</p>
            <p className="text-xs text-[var(--text-muted)]">All-time campaigns for this tenant</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-sm text-[var(--text-muted)]">Currently sending</p>
            <p className="text-2xl font-bold text-[var(--text)]">{stats.activeSending}</p>
            <p className="text-xs text-[var(--text-muted)]">Active sends in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 px-6 py-5">
            <p className="text-sm text-[var(--text-muted)]">Read rate snapshot</p>
            <p className="text-2xl font-bold text-[var(--text)]">{stats.readRate}%</p>
            <p className="text-xs text-[var(--text-muted)]">Across recent campaigns</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>ROI / uplift snapshot</CardTitle>
            <CardDescription>Recent campaigns and resend impact</CardDescription>
          </div>
          {roiSnapshot?.best_resend && (
            <Badge variant="primary" className="text-xs">
              Best uplift: {roiSnapshot.best_resend.uplift_points}% pts
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <p className="text-sm text-[var(--text-muted)]">
              Loading snapshot...
            </p>
          )}
          {!loading && !roiSnapshot && (
            <p className="text-sm text-[var(--text-muted)]">
              Send and resend campaigns to see uplift and ROI snapshots.
            </p>
          )}
          {roiSnapshot && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--text-muted)]">Overall read rate</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {roiSnapshot.overall_read_rate?.toFixed
                    ? roiSnapshot.overall_read_rate.toFixed(1)
                    : roiSnapshot.overall_read_rate || 0}%
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Across last {roiSnapshot.total_campaigns} campaigns
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--text-muted)]">Uplift reads captured</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  +{roiSnapshot.uplift_reads ?? 0}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Incremental reads from resends</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--text-muted)]">Avg uplift vs original</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {roiSnapshot.avg_uplift_points?.toFixed
                    ? roiSnapshot.avg_uplift_points.toFixed(2)
                    : roiSnapshot.avg_uplift_points || 0} pts
                </p>
                <p className="text-xs text-[var(--text-muted)]">Resend read rate delta</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--text-muted)]">Resends analyzed</p>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {roiSnapshot.resend_count || 0}
                </p>
                <p className="text-xs text-[var(--text-muted)]">In this snapshot window</p>
              </div>
            </div>
          )}

          {roiSnapshot?.best_resend && (
            <Alert variant="success" className="mt-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--text)]">Top uplift resend</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {roiSnapshot.best_resend.name}
                  </p>
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  +{roiSnapshot.best_resend.additional_reads} reads ·{' '}
                  {roiSnapshot.best_resend.uplift_points}% pts vs original
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>Latest 5 campaigns with delivery & reads</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/campaigns')}>View all</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-[var(--text-muted)] text-sm">Loading campaigns...</p>}
          {!loading && recentCampaigns.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm">No campaigns yet. Create your first one.</p>
          )}
          {!loading && recentCampaigns.length > 0 && recentCampaigns.map((camp) => (
            <div key={camp.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
              <div>
                <p className="text-[var(--text)] font-semibold">{camp.name}</p>
                <p className="text-xs text-[var(--text-muted)] capitalize">{camp.channel} • {camp.status}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                <span>Sent: {camp.sent_count || 0}</span>
                <span>Read: {camp.read_count || 0}</span>
                <span>Failed: {camp.failed_count || 0}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="primary" className="capitalize">{camp.channel}</Badge>
                <Badge variant="neutral">{camp.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </AppShell>
  );
};

export default DashboardPage;
