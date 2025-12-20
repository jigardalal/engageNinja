/**
 * AcceptInvitePage Component
 * Allows users to accept team invitations
 * Accessible via /accept-invite?token=<invitation-token>
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export const AcceptInvitePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login, checkAuth } = useAuth();

  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [accepted, setAccepted] = useState(false);

  // State for new user signup
  const [showSignup, setShowSignup] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  // Validate token and get invitation details
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to accept the invitation directly
      // The backend will validate the token and return details
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if error is about authentication needed
        if (response.status === 401) {
          // Need to login/signup first
          setShowSignup(true);
          setInvitationData({ token });
        } else {
          setError(data.error || 'Invalid or expired invitation');
        }
      } else {
        // Invitation accepted successfully
        setAccepted(true);
        setInvitationData(data);
        // Refresh auth context and redirect in 3 seconds
        setTimeout(() => {
          checkAuth();
          navigate('/dashboard');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to validate invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (!signupName.trim()) {
      setError('Name is required');
      return;
    }

    if (!signupPassword || signupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setSigningUp(true);

      // Get email from token - for now we'll need to decode it or the backend provides it
      // This is a limitation - in production you'd want the backend to return the email
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          password: signupPassword,
          name: signupName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setAccepted(true);
      setInvitationData(data);
      setShowSignup(false);

      // Refresh auth and redirect
      setTimeout(() => {
        checkAuth();
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSigningUp(false);
    }
  };

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invitation Accepted!
            </h1>
            <p className="text-gray-600">
              You've been added to the team. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !showSignup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Join Our Team
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Complete your setup to access the platform
        </p>

        {error && (
          <Alert type="error" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        {showSignup ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                disabled={signingUp}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                disabled={signingUp}
                required
                minLength="8"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            <Button
              type="submit"
              disabled={signingUp || !signupName.trim() || !signupPassword}
              className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {signingUp ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {invitationData && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-900">
                  <strong>Tenant:</strong> {invitationData.tenant_name || 'Team'}
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Role:</strong> {invitationData.role || 'Member'}
                </p>
              </div>
            )}

            {!isAuthenticated ? (
              <>
                <p className="text-sm text-gray-600 text-center">
                  You need to log in or create an account first
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                >
                  Log In to Accept
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-gray-200 text-gray-900 hover:bg-gray-300"
                >
                  Create Account
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 text-center">
                  You're logged in. Trying to accept invitation...
                </p>
                <Button
                  onClick={validateToken}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                >
                  Try Again
                </Button>
              </>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          Need help?{' '}
          <a href="/contact" className="text-primary hover:underline">
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
