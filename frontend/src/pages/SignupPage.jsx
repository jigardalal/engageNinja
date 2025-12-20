import React, { useRef, useState } from 'react';
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
import { CheckCircle2, ShieldCheck, MessageCircle, Hammer, Sparkles } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

/**
 * Signup Page
 * User registration form
 */
export const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, error: authError } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef(null);
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const trialHighlights = [
    { icon: CheckCircle2, label: 'No credit card required' },
    { icon: CheckCircle2, label: 'Free trials available' },
    { icon: Sparkles, label: 'Access to all EngageNinja products (WhatsApp, email, automation)' }
  ];
  const onboardingSteps = [
    { icon: ShieldCheck, label: 'Verify your email address & phone number' },
    { icon: MessageCircle, label: 'Tell us what you want to build first' },
    { icon: Hammer, label: 'Start building!' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error on input change
  };

  const handleAgreementChange = (e) => {
    setAcceptedTerms(e.target.checked);
    if (e.target.checked && error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (!formData.companyName.trim()) {
      setError('Company or workspace name is required');
      return;
    }

    if (!acceptedTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (recaptchaSiteKey && !recaptchaToken) {
      setError('Please complete the captcha');
      return;
    }

    // Validation
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 9) {
      setError('Password must be at least 9 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      return;
    }

    setLoading(true);
    const signupResult = await signup({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim() || null,
      companyName: formData.companyName.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim(),
      password: formData.password,
      recaptchaToken: recaptchaToken || null
    });

    if (signupResult.success) {
      // Signup successful, redirect to dashboard
      navigate('/dashboard');
    } else {
      setError(signupResult.error);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken('');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-gradient)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-5xl shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">
              EN
            </div>
            <Badge variant="primary">Create account</Badge>
          </div>
          <CardTitle>Join EngageNinja</CardTitle>
          <CardDescription>Spin up your workspace and start sending</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {(error || authError) && (
            <Alert variant="error">{error || authError}</Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Lee"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Brown"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company or Workspace Name</Label>
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
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    disabled={loading}
                  />
                </div>

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
                    placeholder="At least 9 characters"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                    By creating an account I agree to EngageNinja's{' '}
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
                  <div className="space-y-2">
                    <ReCAPTCHA
                      sitekey={recaptchaSiteKey}
                      onChange={(token) => {
                        setRecaptchaToken(token);
                        if (token && error) setError('');
                      }}
                      ref={recaptchaRef}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className="w-full"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Start your forever free workspace
                </p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">
                  Stay on our free tier as long as you like
                </h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  WhatsApp-first workflows, AI-assisted drafts, and one-click resends help you go from
                  demo to delivery without juggling tools.
                </p>
              </div>

              <div className="space-y-3">
                {trialHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-2">
                      <Icon className="mt-1 h-4 w-4 text-primary-500" />
                      <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Get up and running:</p>
                <div className="mt-3 space-y-3">
                  {onboardingSteps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label} className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 text-primary-500" />
                        <p className="text-sm text-[var(--text-muted)]">{step.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[0.65rem] text-[var(--text-muted)]">
                Free tier access is perpetual, though usage caps and product limits may apply for the
                no-cost plan.
              </p>
            </div>
          </div>

          <p className="text-[0.75rem] text-[var(--text-muted)]">
            EngageNinja will use your details to create a workspace, share important updates, and send
            transactional messages about your usage. You can manage notification preferences in your
            account settings.
          </p>
        </CardContent>

        <CardFooter className="text-center text-sm text-[var(--text-muted)] flex flex-col gap-2">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-semibold">
              Log in
            </Link>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Need help? Reach us at{' '}
            <a href="mailto:support@engageninja.com" className="text-primary-600 font-semibold">
              support@engageninja.com
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupPage;
