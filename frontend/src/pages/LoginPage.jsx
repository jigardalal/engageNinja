import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/layout/PageHeader'
import {
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ErrorState
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { Lock, ShieldCheck } from 'lucide-react'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login, error: authError } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    if (!formData.password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    const result = await login(formData.email, formData.password)

    if (result.success) {
      const data = result.data || {}
      const platformRole = data.role_global
      const hasPlatformRole = ['platform_admin', 'system_admin', 'platform_support'].includes(platformRole)
      const needsTenantChoice = !hasPlatformRole && (
        data.must_select_tenant || ((data.tenants || []).length > 1 && !data.active_tenant_id)
      )
      const targetPath = hasPlatformRole ? '/admin/tenants' : (needsTenantChoice ? '/tenants' : '/dashboard')
      navigate(targetPath)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-gradient)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl space-y-6">
        <PageHeader
          icon={Lock}
          title="Login to EngageNinja"
          description="Authenticate to manage campaigns, contacts, and billing in one place."
          helper="Unsure which workspace to pick after signing in? We'll guide you."
          actions={
            <SecondaryAction asChild>
              <Link to="/signup">Create account</Link>
            </SecondaryAction>
          }
        />

        <Card variant="glass" className="shadow-2xl">
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="space-y-4">
              {(error || authError) && (
                <ErrorState
                  title="Login failed"
                  description={error || authError}
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
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
                <PrimaryAction type="submit" className="w-full" loading={loading}>
                  Log in
                </PrimaryAction>
              </form>
            </section>

            <section className="space-y-4">
              <CardHeader className="p-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary-500" />
                  <CardTitle className="text-lg">Need help?</CardTitle>
                </div>
                <CardDescription>
                  Use these test credentials or ask support for a reset.
                </CardDescription>
              </CardHeader>
              <div className="space-y-3 text-sm text-[var(--text-muted)]">
                <div>
                  <div className="text-xs font-semibold text-primary-600 uppercase">Platform admin</div>
                  <div>platform.admin@engageninja.local / PlatformAdminPassword123</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary-600 uppercase">Tenant admin</div>
                  <div>admin@engageninja.local / AdminPassword123</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary-600 uppercase">Team member</div>
                  <div>member@engageninja.local / MemberPassword123</div>
                </div>
              </div>
              <CardDescription>
                Forgot your password?{' '}
                <Link to="/contact" className="text-primary-600 font-semibold hover:underline">
                  Contact support
                </Link>
              </CardDescription>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
