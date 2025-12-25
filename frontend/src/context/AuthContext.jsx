import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

// Create auth context
const AuthContext = createContext(null);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [activeTenant, setActiveTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mustSelectTenant, setMustSelectTenant] = useState(false);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);
  const [switchingTenantId, setSwitchingTenantId] = useState(null);

  // Role state
  const [userRole, setUserRole] = useState(null); // Current tenant role (viewer, member, admin, owner)
  const [platformRole, setPlatformRole] = useState('none'); // Platform role (none, platform_admin, system_admin)

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 checkAuth() success:', { user_id: data.user_id, active_tenant_id: data.active_tenant_id });
        }
        setUser({
          id: data.user_id,
          email: data.email,
          name: data.name || data.full_name,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          timezone: data.timezone
        });
        const incomingTenants = data.tenants || [];
        setTenants(incomingTenants);
        setActiveTenant(data.active_tenant_id);

        // Extract role information
        setPlatformRole(data.role_global || 'none');

        // Find current tenant role
        if (data.active_tenant_id && incomingTenants.length > 0) {
          const currentTenant = incomingTenants.find(t => t.tenant_id === data.active_tenant_id);
          setUserRole(currentTenant?.role || null);
        } else {
          setUserRole(null);
        }

        setMustSelectTenant(
          !!data.must_select_tenant || (!data.active_tenant_id && incomingTenants.length > 1)
        );
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 checkAuth() failed - not OK:', response.status);
        }
        setUser(null);
        setTenants([]);
        setActiveTenant(null);
        setUserRole(null);
        setPlatformRole('none');
        setMustSelectTenant(false);
      }
    } catch (err) {
      // Silently handle auth check errors
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 checkAuth() error:', err.message);
      }
      setUser(null);
      setTenants([]);
      setActiveTenant(null);
      setUserRole(null);
      setPlatformRole('none');
      setMustSelectTenant(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign up
  const signup = useCallback(async (payload) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      const emailUsed = data.email || payload.email;
      setUser({
        id: data.user_id,
        email: data.email,
        name: data.name || data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        timezone: data.timezone
      });
      const newTenants = [{
        tenant_id: data.tenant_id,
        name: data.tenant_name || `${emailUsed.split('@')[0]}'s Tenant`,
        plan: 'Free Plan',
        role: 'owner' // New signup creates user as owner
      }];
      setTenants(newTenants);
      setActiveTenant(data.tenant_id);
      setUserRole('owner');
      setPlatformRole('none');
      setMustSelectTenant(false);

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Log in
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setUser({
        id: data.user_id,
        email: data.email,
        name: data.name || data.full_name
      });
      const incomingTenants = data.tenants || [];
      setTenants(incomingTenants);
      setActiveTenant(data.active_tenant_id);

      // Extract role information
      setPlatformRole(data.role_global || 'none');

      // Find current tenant role
      if (data.active_tenant_id && incomingTenants.length > 0) {
        const currentTenant = incomingTenants.find(t => t.tenant_id === data.active_tenant_id);
        setUserRole(currentTenant?.role || null);
      } else {
        setUserRole(null);
      }

      setMustSelectTenant(
        !!data.must_select_tenant || (!data.active_tenant_id && incomingTenants.length > 1)
      );

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Log out
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      setUser(null);
      setTenants([]);
      setActiveTenant(null);
      setUserRole(null);
      setPlatformRole('none');
      setError(null);
      setMustSelectTenant(false);
      setIsSwitchingTenant(false);
      setSwitchingTenantId(null);

      return { success: true };
    } catch (err) {
      console.error('Logout failed:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch tenant
  const switchTenant = useCallback(async (tenantId) => {
    const previous = activeTenant;
    setActiveTenant(tenantId);
    setIsSwitchingTenant(true);
    setSwitchingTenantId(tenantId);
    try {
      const response = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId })
      });

      if (!response.ok) {
        throw new Error('Failed to switch tenant');
      }

      const data = await response.json();
      const updatedTenants = data.tenants || tenants;
      if (data.tenants) setTenants(data.tenants);
      if (data.active_tenant_id) setActiveTenant(data.active_tenant_id);

      // Update user role for the new tenant
      const newCurrentTenant = updatedTenants.find(t => t.tenant_id === tenantId);
      setUserRole(newCurrentTenant?.role || null);

      setMustSelectTenant(false);

      // Small intentional delay to surface a visible switch state in production
      await new Promise(resolve => setTimeout(resolve, 1200));
    } catch (err) {
      console.error('Failed to persist tenant switch', err);
      setActiveTenant(previous);
      setIsSwitchingTenant(false);
      setSwitchingTenantId(null);
      return { success: false, error: err.message };
    }
    setIsSwitchingTenant(false);
    setSwitchingTenantId(null);
    return { success: true };
  }, [activeTenant, tenants]);

  // Role helper methods
  const hasRole = useCallback((minRole) => {
    if (!userRole) return false;
    const roleHierarchy = { viewer: 0, member: 1, admin: 2, owner: 3 };
    return roleHierarchy[userRole] >= roleHierarchy[minRole];
  }, [userRole]);

  const isPlatformAdmin = useCallback(() => {
    return platformRole === 'platform_admin' || platformRole === 'system_admin';
  }, [platformRole]);

  const hasPlatformRole = useCallback(() => {
    return ['platform_admin', 'system_admin', 'platform_support'].includes(platformRole);
  }, [platformRole]);

  const canManageTeam = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  const canConfigureChannels = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  const canSendCampaigns = useCallback(() => {
    return hasRole('member');
  }, [hasRole]);

  const canCreateContacts = useCallback(() => {
    return hasRole('member');
  }, [hasRole]);

  const canViewData = useCallback(() => {
    return !!userRole;
  }, [userRole]);

  const value = {
    // User & Tenant data
    user,
    tenants,
    activeTenant,

    // Role information
    userRole,
    platformRole,

    // UI state
    loading,
    error,
    mustSelectTenant,
    isSwitchingTenant,
    switchingTenantId,

    // Auth methods
    signup,
    login,
    logout,
    switchTenant,

    // Role helper methods
    hasRole,
    isPlatformAdmin,
    hasPlatformRole,
    canManageTeam,
    canConfigureChannels,
    canSendCampaigns,
    canCreateContacts,
    canViewData,

    // Computed
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
