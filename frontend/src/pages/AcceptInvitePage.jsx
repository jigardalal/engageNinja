/**
 * AcceptInvitePage Component
 * Allows users to accept team invitations
 * Accessible via /accept-invite?token=<invitation-token>
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Alert,
  EmptyState,
  LoadingState
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { ShieldCheck, MessageCircle } from 'lucide-react'

export const AcceptInvitePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, login, checkAuth } = useAuth()

  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invitationData, setInvitationData] = useState(null)
  const [accepted, setAccepted] = useState(false)

  const [showSignup, setShowSignup] = useState(false)
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signingUp, setSigningUp] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      return
    }

    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setShowSignup(true)
          setInvitationData({ token })
        } else {
          setError(data.error || 'Invalid or expired invitation')
        }
        return
      }

      setAccepted(true)
      setInvitationData(data)
      setTimeout(() => {
        checkAuth()
        navigate('/dashboard')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to validate invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)

    if (!signupName.trim()) {
      setError('Name is required')
      return
    }

    if (!signupPassword || signupPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      setSigningUp(true)
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          password: signupPassword,
          name: signupName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      setAccepted(true)
      setInvitationData(data)
      setShowSignup(false)
      setTimeout(() => {
        checkAuth()
        navigate('/dashboard')
      }, 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSigningUp(false)
    }
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center px-4">
        <div className="w-full max-w-3xl space-y-6">
          <PageHeader
            icon={ShieldCheck}
            title="Invitation accepted"
            description="You’ll land in the workspace soon."
            helper="Redirecting to your dashboard..."
            actions={
              <PrimaryAction asChild>
                <Link to="/dashboard">Open dashboard</Link>
              </PrimaryAction>
            }
          />
          <Card variant="glass">
            <CardContent>
              <EmptyState
                icon={MessageCircle}
                title="Welcome aboard"
                description="We are syncing your permissions. The dashboard will open in a moment."
                action={
                  <PrimaryAction asChild>
                    <Link to="/dashboard">Go to dashboard</Link>
                  </PrimaryAction>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading && !showSignup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center px-4">
        <div className="w-full max-w-3xl space-y-6">
          <PageHeader
            icon={ShieldCheck}
            title="Verifying invitation"
            description="Give us a moment while we confirm your token."
          />
          <Card variant="glass">
            <CardContent>
              <LoadingState message="Validating invitation..." />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <PageHeader
          icon={ShieldCheck}
          title="Accept your invitation"
          description="Finish the quick setup to join the workspace."
          helper="Need help? Reply to the invite email or contact support."
        />

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Confirm your identity</CardTitle>
            <CardDescription>Provide your name and a secure password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            {showSignup ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Jordan Reyes"
                    disabled={signingUp}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Strong password"
                    disabled={signingUp}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <PrimaryAction type="submit" className="w-full" loading={signingUp}>
                    Complete signup
                  </PrimaryAction>
                  <SecondaryAction asChild>
                    <Link to="/login">Back to login</Link>
                  </SecondaryAction>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {invitationData && (
                  <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-900/60 p-4 space-y-1 text-sm">
                    <p className="text-[var(--text-muted)]">Tenant</p>
                    <p className="font-semibold text-[var(--text)]">{invitationData.tenant_name || 'EngageNinja workspace'}</p>
                    <p className="text-[var(--text-muted)]">Role: {invitationData.role || 'Member'}</p>
                  </div>
                )}
                {!isAuthenticated ? (
                  <>
                    <p className="text-sm text-[var(--text-muted)] text-center">
                      Sign in or create an account to accept the invitation.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => navigate('/login')} className="w-full sm:w-auto">
                        Log in to accept
                      </Button>
                      <Button variant="ghost" onClick={() => navigate('/signup')} className="w-full sm:w-auto">
                        Create account
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[var(--text-muted)] text-center">
                      Already signed in? Retry the verification.
                    </p>
                    <Button onClick={validateToken} className="w-full">
                      Retry verification
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AcceptInvitePage
