import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  SkeletonCard
} from '../components/ui';
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons';
import PageHeader from '../components/layout/PageHeader';
import {
  Sparkles,
  ChartBar,
  ShieldCheck,
  Megaphone,
  Users
} from 'lucide-react';

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
    <AppShell hideTitleBlock title="Dashboard" subtitle="Quick overview of your EngageNinja workspace">
      <div className="space-y-6">
        <PageHeader
          icon={Sparkles}
          title="Workspace command center"
          description="Monitor campaigns, audience health, and ROI from one cohesive view."
          helper={`Plan: ${activeTenantInfo?.plan || 'Free Plan'}`}
          actions={
            <div className="flex flex-wrap gap-3">
              <PrimaryAction onClick={() => navigate('/settings?tab=tenant')}>
                Upgrade plan
              </PrimaryAction>
              <SecondaryAction onClick={() => navigate('/settings?tab=channels')}>
                Manage settings
              </SecondaryAction>
            </div>
          }
          meta={
            <div className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
              <span>{activeTenantInfo?.name || 'Your Tenant'} • Multi-channel commands</span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {stats.contactsTotal.toLocaleString()} contacts
              </span>
            </div>
          }
        />

        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card variant="glass" className="space-y-6">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)] uppercase tracking-[0.4em]">Workspace</p>
                  <CardTitle className="text-3xl">Campaign health + actions</CardTitle>
                </div>
                {roiSnapshot?.best_resend && (
                  <Badge variant="primary" className="text-xs">
                    Best uplift: {roiSnapshot.best_resend.uplift_points}% pts
                  </Badge>
                )}
              </div>
              <CardDescription>
                {recentCampaigns.length > 0
                  ? `Last campaign: ${recentCampaigns[0].name} (${recentCampaigns[0].status})`
                  : 'Start a new campaign to capture uplift.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">Contacts</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{stats.contactsTotal}</p>
                  <p className="text-sm text-[var(--text-muted)]">Reachable audience</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">Campaigns</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{stats.campaignsTotal}</p>
                  <p className="text-sm text-[var(--text-muted)]">All-time sends</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">Active sends</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{stats.activeSending}</p>
                  <p className="text-sm text-[var(--text-muted)]">Currently processing</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">Read rate</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{stats.readRate}%</p>
                  <p className="text-sm text-[var(--text-muted)]">Recent campaigns</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <PrimaryAction onClick={() => navigate('/campaigns/new')}>
                  Launch new campaign
                </PrimaryAction>
                <SecondaryAction onClick={() => navigate('/campaigns')}>
                  View all campaigns
                </SecondaryAction>
                <SecondaryAction onClick={() => navigate('/contacts')}>
                  Review audience
                </SecondaryAction>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card variant="glass" className="space-y-4">
              <CardHeader className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-[var(--text-muted)]">
                  <ChartBar className="h-4 w-4 text-primary-500" />
                  Signals
                </div>
                <Badge variant="secondary" className="text-xs">
                  Real-time
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && <SkeletonCard />}
                {!loading && !roiSnapshot && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Send campaigns to see uplift and ROI snapshots.
                  </p>
                )}
                {roiSnapshot && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Overall read rate</p>
                        <p className="text-2xl font-bold text-[var(--text)]">
                          {roiSnapshot.overall_read_rate?.toFixed(1) ?? roiSnapshot.overall_read_rate ?? 0}%
                        </p>
                      </div>
                      <Badge variant="primary">{roiSnapshot.total_campaigns} campaigns</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[var(--border)] p-3">
                        <p className="text-xs text-[var(--text-muted)]">Uplift reads</p>
                        <p className="text-xl font-semibold text-[var(--text)]">
                          +{roiSnapshot.uplift_reads ?? 0}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] p-3">
                        <p className="text-xs text-[var(--text-muted)]">Avg uplift</p>
                        <p className="text-xl font-semibold text-[var(--text)]">
                          {roiSnapshot.avg_uplift_points?.toFixed(2) ?? roiSnapshot.avg_uplift_points ?? 0} pts
                        </p>
                      </div>
                    </div>
                    {roiSnapshot?.best_resend && (
                      <Alert variant="success" className="p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <ShieldCheck className="h-4 w-4" />
                          <span>
                            Best uplift resend: {roiSnapshot.best_resend.name} · +{roiSnapshot.best_resend.additional_reads} reads
                          </span>
                        </div>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="glass" className="space-y-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary-500" />
                  <span className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Recent campaigns</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading && <SkeletonCard />}
                {!loading && recentCampaigns.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">No campaigns yet. Create your first one.</p>
                )}
                {!loading && recentCampaigns.length > 0 && recentCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-3 shadow-sm backdrop-blur"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{camp.name}</p>
                      <p className="text-xs text-[var(--text-muted)] capitalize">
                        {camp.channel} • {camp.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>Sent: {camp.sent_count || 0}</span>
                      <span>Read: {camp.read_count || 0}</span>
                      <span>Failed: {camp.failed_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" className="capitalize">{camp.channel}</Badge>
                      <Badge variant="secondary">{camp.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
};

export default DashboardPage;
