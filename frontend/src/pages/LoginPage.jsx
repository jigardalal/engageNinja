import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Input,
  Label,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge
} from '../components/ui';

/**
 * Login Page
 * User authentication form
 */
export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password);

    if (result.success) {
      const data = result.data || {};
      const platformRole = data.role_global;
      const hasPlatformRole = ['platform_admin', 'system_admin', 'platform_support'].includes(platformRole);
      const needsTenantChoice = !hasPlatformRole && (
        data.must_select_tenant || ((data.tenants || []).length > 1 && !data.active_tenant_id)
      );
      const targetPath = hasPlatformRole ? '/admin/tenants' : (needsTenantChoice ? '/tenants' : '/dashboard');
      navigate(targetPath);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-gradient)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">
              EN
            </div>
            <Badge variant="primary">WhatsApp-first CX</Badge>
          </div>
          <CardTitle>EngageNinja</CardTitle>
          <CardDescription>Login to orchestrate campaigns, contacts, and channels.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {(error || authError) && (
            <Alert variant="error" title="Login failed">
              {error || authError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-primary-600 hover:underline font-semibold">
              Sign up
            </Link>
          </div>

          <div className="border-t border-[var(--border)] pt-4 text-sm text-[var(--text-muted)] space-y-2">
            <div className="font-semibold text-[var(--text)]">Test Credentials</div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-primary-600 uppercase">Platform Admin (Phase 6)</div>
              <div>platform.admin@engageninja.local / PlatformAdminPassword123</div>
              <div className="text-xs text-[var(--text-muted)]">Access: Tenant management, audit logs, admin dashboard</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-primary-600 uppercase">Tenant Owners & Admins</div>
              <div>admin@engageninja.local / AdminPassword123</div>
              <div>user@engageninja.local / UserPassword123</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-primary-600 uppercase">Team Members</div>
              <div>member@engageninja.local / MemberPassword123</div>
              <div>viewer@engageninja.local / ViewerPassword123</div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
