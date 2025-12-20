import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Alert } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

const PLAN_COLORS = {
  Starter: 'bg-amber-100 text-amber-800 border-amber-200',
  Growth: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Pro: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  default: 'bg-slate-100 text-slate-800 border-slate-300'
};

const getPlanColor = (plan) => PLAN_COLORS[plan] || PLAN_COLORS.default;

/**
 * Tenants Page
 * Dedicated screen to view and switch tenants
 */
export const TenantsPage = () => {
  const navigate = useNavigate();
  const { tenants = [], activeTenant, switchTenant, isSwitchingTenant, switchingTenantId } = useAuth();
  const { theme } = useTheme();
  const [loadingTenant, setLoadingTenant] = useState(null);
  const [error, setError] = useState('');
  const isDark = theme === 'dark';

  const handleSwitch = async (tenantId) => {
    setError('');
    setLoadingTenant(tenantId);
    const result = await switchTenant(tenantId);
    if (!result?.success) {
      setError(result?.error || 'Failed to switch tenant');
    }
    setLoadingTenant(null);
    if (result?.success) {
      // After the intentional delay inside switchTenant, navigate to dashboard
      navigate('/dashboard');
    }
  };

  return (
    <AppShell
      title="Tenants"
      subtitle="Switch between your EngageNinja workspaces"
    >
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your workspaces</CardTitle>
          <CardDescription>Select a tenant to make it active for this session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenants.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No tenants found for your account.</p>
          )}
          <div className="space-y-3">
            {tenants.map((tenant) => {
              const isActive = tenant.tenant_id === activeTenant;
              const activeCard = isDark
                ? 'border-primary-400 bg-[#0f172a] shadow-[0_20px_45px_rgba(15,23,42,0.5)] text-[var(--text)]'
                : 'border-primary-500 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)] text-[var(--text)]';
              const inactiveCard = isDark
                ? 'border-[#1f2937] bg-[#111827] hover:border-primary-200 hover:bg-[#161b2f] hover:shadow-lg hover:-translate-y-1 text-[var(--text)]'
                : 'border-[#cbd5e1] bg-[#f8fafc] hover:border-primary-200 hover:shadow-lg hover:-translate-y-1 text-[var(--text)]';
              return (
                <div
                  key={tenant.tenant_id}
                  className={`flex flex-col gap-4 rounded-2xl border p-5 transition duration-200 ${
                    isActive ? activeCard : `${inactiveCard} cursor-pointer`
                  }`}
                  onClick={() => {
                    if (isActive || isSwitchingTenant || loadingTenant === tenant.tenant_id) return
                    handleSwitch(tenant.tenant_id)
                  }}
                  aria-label={`Switch to ${tenant.name}`}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold tracking-wide ${
                          isActive
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'bg-white text-[#0f172a] border border-[#e2e8f0]'
                        }`}
                      >
                        {tenant.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                          Workspace
                        </p>
                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[color:var(--text-strong,#0f172a)]'}`}>
                          {tenant.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="neutral"
                        className={`text-xs font-semibold ${getPlanColor(tenant.plan)}`}
                      >
                        {tenant.plan}
                      </Badge>
                      {isActive && (
                        <Badge className="text-xs font-semibold bg-primary-700 text-white ring-1 ring-primary-700">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                      <span>Default Contacts: <strong className="text-[var(--text)]">3</strong></span>
                      <span>Audience plan: <strong className="text-[var(--text)]">{tenant.plan}</strong></span>
                    </div>
                    <Button
                      size="sm"
                      variant={isActive ? 'secondary' : 'primary'}
                      disabled={loadingTenant === tenant.tenant_id || isSwitchingTenant || isActive}
                      className={
                        isActive
                          ? isDark
                            ? 'bg-white/5 text-white border border-white/30 disabled:opacity-100 disabled:cursor-default'
                            : 'bg-white text-[color:#0f172a] border border-primary-300 disabled:opacity-100 disabled:cursor-default'
                          : undefined
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        handleSwitch(tenant.tenant_id)
                      }}
                    >
                      {loadingTenant === tenant.tenant_id || switchingTenantId === tenant.tenant_id
                        ? 'Switching...'
                        : isActive
                          ? 'Current'
                          : 'Switch'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isSwitchingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl p-6 w-full max-w-sm text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[var(--text)]">Switching tenants</p>
              <p className="text-sm text-[var(--text-muted)]">
                Please hold on while we switch you to {tenants.find(t => t.tenant_id === switchingTenantId)?.name || 'the selected tenant'}.
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">This may take a couple of seconds in production.</p>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default TenantsPage;
