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
        setUser({
          id: data.user_id,
          email: data.email
        });
        setTenants(data.tenants || []);
        setActiveTenant(data.active_tenant_id);
      } else {
        setUser(null);
        setTenants([]);
        setActiveTenant(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      setTenants([]);
      setActiveTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign up
  const signup = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      setUser({
        id: data.user_id,
        email: data.email
      });
      setTenants([{
        tenant_id: data.tenant_id,
        name: `${email.split('@')[0]}'s Tenant`,
        plan: 'Free Plan'
      }]);
      setActiveTenant(data.tenant_id);

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
        email: data.email
      });
      setTenants(data.tenants || []);
      setActiveTenant(data.active_tenant_id);

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
      setError(null);

      return { success: true };
    } catch (err) {
      console.error('Logout failed:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch tenant
  const switchTenant = useCallback((tenantId) => {
    setActiveTenant(tenantId);
  }, []);

  const value = {
    user,
    tenants,
    activeTenant,
    loading,
    error,
    signup,
    login,
    logout,
    switchTenant,
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
