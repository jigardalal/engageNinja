import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protected Route Component
 * Enforces authentication, tenant selection, and role-based access control
 *
 * Props:
 * - children: Component to render if access is granted
 * - requiredRole: Minimum role required (viewer, member, admin, owner)
 * - requirePlatformAdmin: Require platform admin role
 * - fallback: Component to show if access denied (default: Access Denied)
 */
export const ProtectedRoute = ({
  children,
  requiredRole = null,
  requirePlatformAdmin = false,
  fallback = null
}) => {
  const location = useLocation();
  const {
    isAuthenticated,
    loading,
    mustSelectTenant,
    activeTenant,
    tenants,
    hasRole,
    isPlatformAdmin,
    hasPlatformRole,
    userRole
  } = useAuth();
  const isAdminPath = location.pathname.startsWith('/admin');
  const platformUser = hasPlatformRole ? hasPlatformRole() : false;

  // CRITICAL: Redirect to tenant selection BEFORE loading check
  // This prevents users from accessing tenant-scoped pages while auth is loading
  const needsTenantSelection = !isAdminPath && location.pathname !== '/tenants' && !activeTenant && !platformUser;
  if (needsTenantSelection && isAuthenticated) {
    return <Navigate to="/tenants" replace />;
  }

  // Show loading spinner while checking auth (only for auth pages or admin paths)
  if (loading && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to tenant selection if explicitly required
  if (mustSelectTenant && location.pathname !== '/tenants' && !isAdminPath && !platformUser) {
    return <Navigate to="/tenants" replace />;
  }

  // Check platform admin requirement
  if (requirePlatformAdmin && !isPlatformAdmin()) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">You need platform admin privileges to access this page.</p>
            <a href="/dashboard" className="text-primary hover:underline">
              Return to Dashboard
            </a>
          </div>
        </div>
      )
    );
  }

  // Check tenant role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-2">
              You need at least <strong>{requiredRole}</strong> role to access this page.
            </p>
            <p className="text-gray-500 mb-6">Your current role: <strong>{userRole || 'none'}</strong></p>
            <a href="/dashboard" className="text-primary hover:underline">
              Return to Dashboard
            </a>
          </div>
        </div>
      )
    );
  }

  return children;
};

export default ProtectedRoute;
