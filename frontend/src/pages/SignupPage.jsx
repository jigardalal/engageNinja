import React, { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/layout/PageHeader'
import {
  Input,
  Label,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { CheckCircle2, ShieldCheck, MessageCircle, Hammer, Sparkles } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'

export const SignupPage = () => {
  const navigate = useNavigate()
  const { signup, error: authError } = useAuth()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef(null)
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

  const trialHighlights = [
    { icon: CheckCircle2, label: 'No credit card required' },
    { icon: CheckCircle2, label: 'Free trials available' },
    { icon: Sparkles, label: 'WhatsApp, email, and automation in one platform' }
  ]

  const onboardingSteps = [
    { icon: ShieldCheck, label: 'Verify your email address & phone number' },
    { icon: MessageCircle, label: 'Tell us which channels you want to automate' },
    { icon: Hammer, label: 'Start building workflows in minutes' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleAgreementChange = (e) => {
    setAcceptedTerms(e.target.checked)
    if (e.target.checked && error) {
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName.trim()) {
      setError('First name is required')
      return
    }

    if (!formData.companyName.trim()) {
      setError('Company or workspace name is required')
      return
    }

    if (!acceptedTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy')
      return
    }

    if (recaptchaSiteKey && !recaptchaToken) {
      setError('Please complete the captcha')
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    if (!formData.password) {
      setError('Password is required')
      return
    }

    if (formData.password.length < 9) {
      setError('Password must be at least 9 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format')
      return
    }

    setLoading(true)
    const signupResult = await signup({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim() || null,
      companyName: formData.companyName.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim(),
      password: formData.password,
      recaptchaToken: recaptchaToken || null
    })

    if (signupResult.success) {
      navigate('/dashboard')
    } else {
      setError(signupResult.error)
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      setRecaptchaToken('')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-gradient)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl space-y-6">
        <PageHeader
          icon={Sparkles}
          title="Join EngageNinja"
          description="Create your workspace and orchestrate WhatsApp, email, and automation without context switching."
          helper="No credit card required · Free tier runs forever"
          actions={
            <SecondaryAction asChild>
              <Link to="/login">Already have an account?</Link>
            </SecondaryAction>
          }
        />

        <Card variant="glass" className="shadow-2xl">
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-4">
              {(error || authError) && (
                <Alert variant="error">{error || authError}</Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Jordan"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Reyes"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company / workspace</Label>
                  <Input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Engage Ninja LLC"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Optional"
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                      placeholder="At least 9 characters"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                  <input
                    id="agreeTerms"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={acceptedTerms}
                    onChange={handleAgreementChange}
                    disabled={loading}
                  />
                  <label htmlFor="agreeTerms" className="text-[var(--text-muted)]">
                    I agree to the{' '}
                    <Link to="/terms" className="font-semibold text-primary-600 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="font-semibold text-primary-600 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                {recaptchaSiteKey && (
                  <div>
                    <ReCAPTCHA
                      sitekey={recaptchaSiteKey}
                      onChange={(token) => {
                        setRecaptchaToken(token)
                        if (token && error) setError('')
                      }}
                      ref={recaptchaRef}
                    />
                  </div>
                )}

                <PrimaryAction type="submit" className="w-full" loading={loading}>
                  {loading ? 'Creating workspace...' : 'Start free workspace'}
                </PrimaryAction>
              </form>
            </section>

            <section className="space-y-6">
              <div className="space-y-3">
                {trialHighlights.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 text-primary-500" />
                      <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
                    </div>
                  )
                })}
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/60 p-4 dark:bg-slate-900/60 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Try EngageNinja in three steps:</p>
                  <CardDescription>We guide the setup and approvals so you can ship fast.</CardDescription>
                </div>
                <div className="space-y-3 text-sm text-[var(--text-muted)]">
                  {onboardingSteps.map((step) => {
                    const Icon = step.icon
                    return (
                      <div key={step.label} className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 text-primary-500" />
                        <p>{step.label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-3">
          {onboardingSteps.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.label} variant="glass">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary-500" />
                    <CardTitle className="text-lg">{step.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[var(--text-muted)]">
                    {step.label} so your workspace is ready for campaign automation.
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </section>
      </div>
    </div>
  )
}

export default SignupPage
