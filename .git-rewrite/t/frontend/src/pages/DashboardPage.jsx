import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell';

/**
 * Dashboard Page
 * Main authenticated page showing user info and quick actions
 */
export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, tenants, activeTenant, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const activeTenantInfo = tenants.find(t => t.tenant_id === activeTenant);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Quick overview of your EngageNinja workspace"
      actions={
        <button onClick={handleLogout} className="btn-secondary">
          Log Out
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-300 text-sm">Current Tenant</p>
          <p className="text-xl font-bold text-white mt-1">{activeTenantInfo?.name}</p>
        </div>
        <div className="card">
          <p className="text-gray-300 text-sm">Plan</p>
          <p className="text-xl font-bold text-primary-100 mt-1">{activeTenantInfo?.plan}</p>
        </div>
        <div className="card">
          <p className="text-gray-300 text-sm">Tenants</p>
          <p className="text-xl font-bold text-white mt-1">{tenants.length}</p>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
          <p className="text-sm text-gray-400">Jump to common tasks</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => navigate('/contacts')} className="btn-primary">
            New Contact
          </button>
          <button onClick={() => navigate('/campaigns')} className="btn-primary">
            New Campaign
          </button>
          <button onClick={() => navigate('/settings/channels')} className="btn-secondary">
            Settings
          </button>
        </div>
      </div>

      {tenants.length > 1 && (
        <div className="card mt-6">
          <h2 className="text-2xl font-bold text-white mb-4">Your Tenants</h2>
          <div className="space-y-2">
            {tenants.map(tenant => (
              <div
                key={tenant.tenant_id}
                className={`p-3 rounded border cursor-pointer transition ${
                  tenant.tenant_id === activeTenant
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <p className="font-medium text-white">{tenant.name}</p>
                <p className="text-sm text-gray-300">{tenant.plan}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default DashboardPage;
