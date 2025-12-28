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
  SkeletonCard,
  StatBlock,
  SectionDivider
} from '../components/ui';
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons';
import PageHeader from '../components/layout/PageHeader';
import {
  Sparkles,
  ChartBar,
  ShieldCheck,
  Megaphone,
  Users,
  Activity,
  Eye
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
    // Guard: Do not fetch data if no tenant is selected
    if (!activeTenant) {
      return;
    }

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
  }, [activeTenant]);

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

        <div className="space-y-6">
          {/* Campaign Health Stats - 4 column grid */}
          <SectionDivider
            label="Campaign Health"
            action={
              roiSnapshot?.best_resend && (
                <Badge variant="primary" className="text-xs">
                  Best uplift: {roiSnapshot.best_resend.uplift_points}% pts
                </Badge>
              )
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatBlock
              label="Contacts"
              value={stats.contactsTotal}
              subtitle="Reachable audience"
              icon={Users}
              variant="subtle"
            />
            <StatBlock
              label="Campaigns"
              value={stats.campaignsTotal}
              subtitle="All-time sends"
              icon={Megaphone}
              variant="subtle"
            />
            <StatBlock
              label="Active Sends"
              value={stats.activeSending}
              subtitle="Currently processing"
              icon={Activity}
              variant="subtle"
            />
            <StatBlock
              label="Read Rate"
              value={`${stats.readRate}%`}
              subtitle="Recent campaigns"
              icon={Eye}
              variant="subtle"
            />
          </div>

          {/* Action Buttons */}
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

          {/* ROI Signals & Recent Campaigns */}
          <SectionDivider label="Signals & Recent Activity" spacing="loose" />

          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
            {/* ROI Snapshot */}
            <div className="space-y-4">
              {loading && <SkeletonCard />}
              {!loading && !roiSnapshot && (
                <p className="text-body text-[var(--text-muted)]">
                  Send campaigns to see uplift and ROI snapshots.
                </p>
              )}
              {roiSnapshot && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-slate-900/40">
                    <div>
                      <p className="text-caption text-[var(--text-muted)]">Overall Read Rate</p>
                      <p className="text-h1 font-bold text-[var(--text)]">
                        {roiSnapshot.overall_read_rate?.toFixed(1) ?? 0}%
                      </p>
                    </div>
                    <Badge variant="primary">{roiSnapshot.total_campaigns} campaigns</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <StatBlock
                      label="Uplift Reads"
                      value={`+${roiSnapshot.uplift_reads ?? 0}`}
                      variant="bordered"
                    />
                    <StatBlock
                      label="Avg Uplift"
                      value={`${roiSnapshot.avg_uplift_points?.toFixed(2) ?? 0} pts`}
                      variant="bordered"
                    />
                  </div>

                  {roiSnapshot?.best_resend && (
                    <Alert variant="success" className="p-3">
                      <div className="flex items-center gap-2 text-body-sm">
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          Best uplift resend: {roiSnapshot.best_resend.name} · +{roiSnapshot.best_resend.additional_reads} reads
                        </span>
                      </div>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Recent Campaigns - Simplified list */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary-500" />
                <h3 className="text-h4">Recent Campaigns</h3>
              </div>

              {loading && <SkeletonCard />}
              {!loading && recentCampaigns.length === 0 && (
                <p className="text-body-sm text-[var(--text-muted)]">No campaigns yet. Create your first one.</p>
              )}
              {!loading && recentCampaigns.length > 0 && recentCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-3 rounded-xl border border-[var(--border)] hover:border-primary-300 transition-colors cursor-pointer"
                  onClick={() => navigate(`/campaigns/${camp.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-body-sm font-semibold text-[var(--text)]">{camp.name}</p>
                    <Badge variant={camp.status === 'sent' ? 'success' : 'primary'} className="text-xs">
                      {camp.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-caption text-[var(--text-muted)]">
                    <span>Sent: {camp.sent_count || 0}</span>
                    <span>Read: {camp.read_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
};

export default DashboardPage;
