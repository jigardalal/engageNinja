import React, { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import PageHeader from '../components/layout/PageHeader';
import { Card, Input, Button, Alert, Badge, Select, toast } from '../components/ui';
import { Building, User, MapPin, Clock, MessageSquare } from 'lucide-react';
import TenantFormField from '../components/TenantFormField';
import Tenant10DLCModal from '../components/modals/Tenant10DLCModal';
import TenantRegistrationHistoryModal from '../components/modals/TenantRegistrationHistoryModal';
import { useAuth } from '../context/AuthContext';
import { timezoneOptions } from '../data/timezones';

export default function TenantProfilePage({ embedded = false } = {}) {
  const { hasRole } = useAuth();
  const planOptions = [
    { value: 'free', label: 'Free' },
    { value: 'starter', label: 'Starter' },
    { value: 'growth', label: 'Growth' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ];
  const countryOptions = [
    { value: 'United States', label: 'United States' },
    { value: 'Brazil', label: 'Brazil' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'France', label: 'France' },
    { value: 'Germany', label: 'Germany' },
    { value: 'South Africa', label: 'South Africa' },
    { value: 'United Arab Emirates', label: 'United Arab Emirates' },
    { value: 'India', label: 'India' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'Japan', label: 'Japan' },
    { value: 'China', label: 'China' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Other/Global (UTC)', label: 'Other/Global (UTC)' },
  ];
  const [form, setForm] = useState({});

  const currentPlanLabel = planOptions.find((option) => option.value === form.plan_id)?.label || 'Free';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const isPaidPlan = form.plan_id && form.plan_id !== 'free';

  // Business Info State
  const [businessInfo, setBusinessInfo] = useState({
    legal_business_name: '',
    dba_name: '',
    business_website: '',
    business_type: '',
    industry_vertical: '',
    business_registration_number: '',
    owner_name: '',
    owner_title: '',
    owner_email: '',
    owner_phone: '',
    business_contact_name: '',
    business_contact_email: '',
    business_contact_phone: '',
    country: 'US',
    business_address: '',
    business_city: '',
    business_state: '',
    business_zip: '',
    monthly_sms_volume_estimate: '',
    use_case_description: '',
    sms_opt_in_language: '',
    gdpr_compliant: false,
    tcpa_compliant: false
  });

  const businessInfoSteps = [
    { id: 'details', label: 'Business Details' },
    { id: 'contacts', label: 'Contact Information' },
    { id: 'sms-compliance', label: 'SMS & Compliance' },
    { id: 'review', label: 'Review & Submit' }
  ];

  const [businessInfoStep, setBusinessInfoStep] = useState(0);
  const [businessInfoError, setBusinessInfoError] = useState('');
  const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
  const [loadingBusinessInfo, setLoadingBusinessInfo] = useState(false);

  // 10DLC State
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [submitting10DLC, setSubmitting10DLC] = useState(false);
  const [show10DLCModal, setShow10DLCModal] = useState(false);
  const [showRegistrationHistory, setShowRegistrationHistory] = useState(false);

  // Section Navigation State
  const [activeSection, setActiveSection] = useState('basics');

  useEffect(() => {
    fetchProfile();
    if (hasRole('admin') || hasRole('owner')) {
      fetchBusinessInfo();
      fetch10DLCBrands();
    }
  }, []);

  const resolvePlanId = (incomingPlan) => {
    if (!incomingPlan) return planOptions[0].value;
    const normalized = `${incomingPlan}`.trim();
    const direct = planOptions.find((p) => p.value === normalized);
    if (direct) return direct.value;
    const labelMatch = planOptions.find((p) => p.label.toLowerCase() === normalized.toLowerCase());
    if (labelMatch) return labelMatch.value;
    const keywordMatch = planOptions.find((p) => normalized.toLowerCase().includes(p.value));
    if (keywordMatch) return keywordMatch.value;
    return planOptions[0].value;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/tenant/profile', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      const initialPlanId = resolvePlanId(
        data.tenant?.plan_id ?? data.tenant?.planId ?? data.tenant?.plan
      );
      setForm({
        ...(data.tenant || {}),
        plan_id: initialPlanId,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!error) return;
    const trimmedName = `${form.name || ''}`.trim();
    const hasName = Boolean(trimmedName);
    const hasPlan = Boolean(form.plan_id);
    const isPaid = hasPlan && form.plan_id !== 'free';
    const hasTimezone = !isPaid || Boolean(form.timezone);
    const requiredPaidFields = [
      'legal_name',
      'billing_email',
      'support_email',
      'address_line1',
      'city',
      'state',
      'postal_code',
      'country',
    ];
    const paidFieldsFilled = requiredPaidFields.every((key) => form[key] && `${form[key]}`.trim());
    if (error === 'Tenant name is required.' && hasName) {
      setError(null);
      return;
    }
    if (error === 'Plan is required.' && hasPlan) {
      setError(null);
      return;
    }
    if (error === 'Timezone is required for paid plans.' && hasTimezone) {
      setError(null);
      return;
    }
    if (error === 'Please fill in all required details for paid plans.' && hasPlan && hasTimezone && paidFieldsFilled) {
      setError(null);
    }
  }, [error, form]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !`${form.name}`.trim()) {
      setError('Tenant name is required.');
      setSuccess(null);
      return;
    }
    if (!form.plan_id) {
      setError('Plan is required.');
      setSuccess(null);
      return;
    }
    if (isPaidPlan && !form.timezone) {
      setError('Timezone is required for paid plans.');
      setSuccess(null);
      return;
    }
    if (isPaidPlan) {
      const requiredPaidFields = [
        'legal_name',
        'billing_email',
        'support_email',
        'address_line1',
        'city',
        'state',
        'postal_code',
        'country',
      ];
      const missing = requiredPaidFields.filter((field) => !form[field] || !`${form[field]}`.trim());
      if (missing.length) {
        setError('Please fill in all required details for paid plans.');
        setSuccess(null);
        return;
      }
    }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/tenant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      setForm((prev) => ({
        ...prev,
        ...(data.tenant || {}),
        plan_id: resolvePlanId(
          data.tenant?.plan_id ?? data.tenant?.planId ?? data.tenant?.plan ?? prev.plan_id
        ),
      }));
      toast({
        title: 'Tenant updated',
        description: 'Changes saved successfully.',
        variant: 'success'
      });
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Update failed',
        description: err.message || 'Could not update tenant.',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Business Info Functions
  const fetchBusinessInfo = async () => {
    try {
      setLoadingBusinessInfo(true);
      const res = await fetch('/api/business-info', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load business info');

      setBusinessInfo(prev => ({
        ...prev,
        ...data.data,
        gdpr_compliant: Boolean(data.data?.gdpr_compliant),
        tcpa_compliant: Boolean(data.data?.tcpa_compliant)
      }));
    } catch (err) {
      console.error('Load business info error:', err);
    } finally {
      setLoadingBusinessInfo(false);
    }
  };

  const fetch10DLCBrands = async () => {
    try {
      setLoadingBrands(true);
      const res = await fetch('/api/business-info/10dlc-status', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load 10DLC brands');
      setBrands(data.data || []);
    } catch (err) {
      console.error('Load 10DLC brands error:', err);
    } finally {
      setLoadingBrands(false);
    }
  };

  // Step Navigation
  const goToNextBusinessStep = () => {
    if (!validateBusinessInfoStep()) return;
    setBusinessInfoStep(prev => Math.min(prev + 1, businessInfoSteps.length - 1));
  };

  const goToPrevBusinessStep = () => {
    setBusinessInfoError('');
    setBusinessInfoStep(prev => Math.max(prev - 1, 0));
  };

  // Step Validation
  const validateBusinessInfoStep = () => {
    const step = businessInfoSteps[businessInfoStep];

    if (step.id === 'details') {
      if (!businessInfo.legal_business_name?.trim()) {
        setBusinessInfoError('Legal business name is required');
        return false;
      }
      if (!businessInfo.business_type) {
        setBusinessInfoError('Business type is required');
        return false;
      }
    }

    if (step.id === 'contacts') {
      if (!businessInfo.owner_name?.trim()) {
        setBusinessInfoError('Owner name is required');
        return false;
      }
      if (!businessInfo.owner_email?.trim()) {
        setBusinessInfoError('Owner email is required');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessInfo.owner_email)) {
        setBusinessInfoError('Valid email address required');
        return false;
      }
      if (!businessInfo.owner_phone?.trim()) {
        setBusinessInfoError('Owner phone is required');
        return false;
      }
    }

    if (step.id === 'sms-compliance') {
      const required = ['country', 'business_address', 'business_city', 'business_state', 'business_zip'];
      for (const field of required) {
        if (!businessInfo[field]?.trim()) {
          setBusinessInfoError(`${field.replace(/_/g, ' ')} is required`);
          return false;
        }
      }
    }

    setBusinessInfoError('');
    return true;
  };

  // Save and Submit Functions
  const saveBusinessInfo = async () => {
    if (!validateBusinessInfoStep()) return;

    try {
      setSavingBusinessInfo(true);
      setBusinessInfoError('');

      const res = await fetch('/api/business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(businessInfo)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save business info');

      toast({
        title: 'Business info saved',
        description: 'Changes saved successfully.',
        variant: 'success'
      });
    } catch (err) {
      setBusinessInfoError(err.message);
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setSavingBusinessInfo(false);
    }
  };

  const submit10DLC = async () => {
    try {
      setSubmitting10DLC(true);
      const res = await fetch('/api/business-info/submit-10dlc', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      toast({
        title: '10DLC Registration Submitted',
        description: data.data?.message || 'Registration submitted successfully',
        variant: 'success'
      });

      await fetch10DLCBrands();
    } catch (err) {
      toast({
        title: '10DLC Submission Failed',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setSubmitting10DLC(false);
    }
  };

  // Render Business Info Step
  const renderBusinessInfoStep = () => {
    const step = businessInfoSteps[businessInfoStep];

    switch (step.id) {
      case 'details':
        return (
          <div className="space-y-4">
            <TenantFormField
              id="legal-business-name"
              label="Legal Business Name"
              value={businessInfo.legal_business_name}
              onChange={(val) => setBusinessInfo(prev => ({ ...prev, legal_business_name: val }))}
              placeholder="Acme Corporation LLC"
              isRequired={true}
            />

            <TenantFormField
              id="dba-name"
              label="DBA Name (Doing Business As)"
              value={businessInfo.dba_name}
              onChange={(val) => setBusinessInfo(prev => ({ ...prev, dba_name: val }))}
              placeholder="Acme Widgets"
              helper="Optional: Trade name if different from legal name"
            />

            <TenantFormField
              id="business-website"
              label="Business Website"
              value={businessInfo.business_website}
              onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_website: val }))}
              placeholder="https://acme.com"
              helper="Your primary business website"
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)]">
                Business Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={businessInfo.business_type || ''}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_type: e.target.value }))}
                required
              >
                <option value="">Select business type</option>
                <option value="sole_proprietor">Sole Proprietor</option>
                <option value="partnership">Partnership</option>
                <option value="llc">LLC</option>
                <option value="corporation">Corporation</option>
                <option value="non_profit">Non-Profit</option>
                <option value="government">Government</option>
              </Select>
            </div>

            <TenantFormField
              id="industry-vertical"
              label="Industry Vertical"
              value={businessInfo.industry_vertical}
              onChange={(val) => setBusinessInfo(prev => ({ ...prev, industry_vertical: val }))}
              placeholder="e.g., Retail, Healthcare, Technology"
              helper="Your primary industry sector"
            />

            <TenantFormField
              id="business-registration-number"
              label="Business Registration Number (EIN)"
              value={businessInfo.business_registration_number}
              onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_registration_number: val }))}
              placeholder="12-3456789"
              helper="EIN (US) or equivalent tax ID"
            />
          </div>
        );

      case 'contacts':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">Owner/Principal Contact</h3>
              <TenantFormField
                id="owner-name"
                label="Owner Name"
                value={businessInfo.owner_name}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, owner_name: val }))}
                placeholder="John Doe"
                isRequired={true}
              />
              <TenantFormField
                id="owner-title"
                label="Owner Title"
                value={businessInfo.owner_title}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, owner_title: val }))}
                placeholder="CEO"
              />
              <TenantFormField
                id="owner-email"
                label="Owner Email"
                value={businessInfo.owner_email}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, owner_email: val }))}
                placeholder="john@acme.com"
                isRequired={true}
              />
              <TenantFormField
                id="owner-phone"
                label="Owner Phone"
                value={businessInfo.owner_phone}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, owner_phone: val }))}
                placeholder="+1234567890"
                isRequired={true}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">Business Contact (optional)</h3>
              <p className="text-sm text-[var(--text-muted)]">If different from owner</p>
              <TenantFormField
                id="business-contact-name"
                label="Contact Name"
                value={businessInfo.business_contact_name}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_contact_name: val }))}
                placeholder="Jane Smith"
              />
              <TenantFormField
                id="business-contact-email"
                label="Contact Email"
                value={businessInfo.business_contact_email}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_contact_email: val }))}
                placeholder="jane@acme.com"
              />
              <TenantFormField
                id="business-contact-phone"
                label="Contact Phone"
                value={businessInfo.business_contact_phone}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_contact_phone: val }))}
                placeholder="+1234567890"
              />
            </div>
          </div>
        );

      case 'sms-compliance':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">Business Address</h3>
              <TenantFormField
                id="business-country"
                label="Country"
                value={businessInfo.country}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, country: val }))}
                isRequired={true}
              >
                <option value="">Select country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="AU">Australia</option>
              </TenantFormField>

              <TenantFormField
                id="business-address"
                label="Street Address"
                value={businessInfo.business_address}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_address: val }))}
                placeholder="123 Main St"
                isRequired={true}
              />

              <div className="grid grid-cols-2 gap-4">
                <TenantFormField
                  id="business-city"
                  label="City"
                  value={businessInfo.business_city}
                  onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_city: val }))}
                  placeholder="San Francisco"
                  isRequired={true}
                />
                <TenantFormField
                  id="business-state"
                  label="State/Province"
                  value={businessInfo.business_state}
                  onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_state: val }))}
                  placeholder="CA"
                  isRequired={true}
                />
              </div>

              <TenantFormField
                id="business-zip"
                label="Postal Code"
                value={businessInfo.business_zip}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, business_zip: val }))}
                placeholder="94107"
                isRequired={true}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">SMS Details</h3>
              <TenantFormField
                id="monthly-sms-volume"
                label="Monthly SMS Volume Estimate"
                value={businessInfo.monthly_sms_volume_estimate}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, monthly_sms_volume_estimate: val }))}
                placeholder="10000"
                helper="Estimated messages per month"
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text)]">Use Case Description</label>
                <textarea
                  value={businessInfo.use_case_description || ''}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, use_case_description: e.target.value }))}
                  placeholder="Describe what types of messages you'll send (e.g., order confirmations, marketing offers)"
                  rows="3"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />
              </div>

              <TenantFormField
                id="sms-opt-in-language"
                label="SMS Opt-in Language"
                value={businessInfo.sms_opt_in_language}
                onChange={(val) => setBusinessInfo(prev => ({ ...prev, sms_opt_in_language: val }))}
                placeholder="Text STOP to unsubscribe"
                helper="Language shown to users for SMS consent"
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">Compliance</h3>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={businessInfo.gdpr_compliant}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, gdpr_compliant: e.target.checked }))}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm text-[var(--text)]">GDPR Compliant (for EU customers)</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={businessInfo.tcpa_compliant}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, tcpa_compliant: e.target.checked }))}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm text-[var(--text)]">TCPA Compliant (for US customers)</span>
              </label>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text)]">Review Your Information</h3>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Legal Business Name</p>
                <p className="text-[var(--text)] font-semibold">{businessInfo.legal_business_name || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-[var(--text-muted)]">Business Type</p>
                <p className="text-[var(--text)]">{businessInfo.business_type || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-[var(--text-muted)]">Owner</p>
                <p className="text-[var(--text)]">{businessInfo.owner_name || '-'}</p>
                <p className="text-sm text-[var(--text-muted)]">{businessInfo.owner_email || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-[var(--text-muted)]">Address</p>
                <p className="text-[var(--text)]">
                  {businessInfo.business_address || '-'}, {businessInfo.business_city || '-'}, {businessInfo.business_state || '-'} {businessInfo.business_zip || '-'}
                </p>
              </div>
            </div>

            <Alert type="info">
              Click "Save Business Info" to save your changes. After saving, you'll be able to submit a 10DLC registration.
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };


  if (!hasRole('admin') && !hasRole('owner')) {
    return embedded ? (
      <Alert type="error" title="Access denied">Only tenant admin/owner can edit tenant profile.</Alert>
    ) : (
      <AppShell hideTitleBlock title="Tenant Profile" subtitle="Access denied">
        <Alert type="error" title="Access denied">Only tenant admin/owner can edit tenant profile.</Alert>
      </AppShell>
    );
  }

  const Shell = ({ children }) => (
    embedded ? <>{children}</> : (
      <AppShell title="Tenant Profile" subtitle="Manage tenant info and contacts">
        {children}
      </AppShell>
    )
  );

  return (
    <Shell>
      <PageHeader
        icon={Building}
        title="Tenant profile"
        description="Manage the tenant, billing, and compliance info for your organization."
        helper={`Plan: ${currentPlanLabel}`}
      />
      {error && <Alert type="error" title="Error" className="mb-4">{error}</Alert>}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      ) : (
        (() => {
          const currentPlanMissing = form.plan_id && !planOptions.some((p) => p.value === form.plan_id);
          const sections = [
            { id: 'basics', label: 'Basics', icon: User },
            { id: 'address', label: 'Address', icon: MapPin },
            { id: 'timezone', label: 'Timezone', icon: Clock },
            { id: 'sms', label: 'SMS Setup', icon: MessageSquare }
          ];
        return (
          <>
          {/* Desktop: 75/25 Sidebar Layout */}
          <form onSubmit={handleSave} className="hidden lg:flex gap-8 min-h-[600px]">
            {/* Sidebar (25%) */}
            <div className="w-1/4 pr-8 border-r border-[var(--border)]">
              <nav className="space-y-1 sticky top-4">
                {sections.map(section => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition ${
                      activeSection === section.id
                        ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-black/20 hover:text-[var(--text)]'
                    }`}
                  >
                    <section.icon className="h-5 w-5 flex-shrink-0" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area (75%) */}
            <div className="w-3/4 pl-8 space-y-6 pb-8">
              {/* Basics Section */}
              {activeSection === 'basics' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--text)] mb-1">Basics</h2>
                    <p className="text-[var(--text-muted)]">Name and contact emails shown to your team and customers.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="tenant-name" className="text-sm font-medium text-[var(--text)]">Tenant name</label>
                        <span className="required-badge">Required</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">Appears in navigation, emails, and billing docs.</p>
                      <Input
                        id="tenant-name"
                        value={form.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="tenant-plan" className="text-sm font-medium text-[var(--text)]">Plan</label>
                        <span className="required-badge">Required</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">Choose the plan for this tenant.</p>
                      <Select
                        id="tenant-plan"
                        value={form.plan_id || ''}
                        onChange={(e) => handleChange('plan_id', e.target.value)}
                        required
                      >
                        <option value="" disabled>Select a plan</option>
                        {currentPlanMissing && (
                          <option value={form.plan_id}>{form.plan_id} (current)</option>
                        )}
                        {planOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </div>
                    <TenantFormField
                      id="tenant-legal-name"
                      label="Legal name"
                      value={form.legal_name}
                      onChange={(val) => handleChange('legal_name', val)}
                      placeholder="Acme Corporation LLC"
                      isPaidPlan={isPaidPlan}
                      helper="Used on invoices and compliance documents."
                    />
                    <TenantFormField
                      id="tenant-billing-email"
                      label="Billing email"
                      value={form.billing_email}
                      onChange={(val) => handleChange('billing_email', val)}
                      placeholder="billing@acme.com"
                      isPaidPlan={isPaidPlan}
                      helper="Where invoices and billing alerts are sent."
                    />
                    <TenantFormField
                      id="tenant-support-email"
                      label="Support email"
                      value={form.support_email}
                      onChange={(val) => handleChange('support_email', val)}
                      placeholder="support@acme.com"
                      isPaidPlan={isPaidPlan}
                      helper="Shown to customers when they need help."
                    />
                  </div>
                  <div className="pt-6">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </div>
              )}

              {/* Address Section */}
              {activeSection === 'address' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--text)] mb-1">Address</h2>
                    <p className="text-[var(--text-muted)]">Used for receipts and location-aware features.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <TenantFormField
                        id="tenant-address1"
                        label="Address line 1"
                        value={form.address_line1}
                        onChange={(val) => handleChange('address_line1', val)}
                        placeholder="123 Main St."
                        isPaidPlan={isPaidPlan}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tenant-address2" className="text-sm font-medium text-[var(--text)]">Address line 2</label>
                      <Input
                        id="tenant-address2"
                        value={form.address_line2 || ''}
                        onChange={(e) => handleChange('address_line2', e.target.value)}
                        placeholder="Suite 400"
                      />
                    </div>
                    <TenantFormField
                      id="tenant-city"
                      label="City"
                      value={form.city}
                      onChange={(val) => handleChange('city', val)}
                      placeholder="San Francisco"
                      isPaidPlan={isPaidPlan}
                    />
                    <TenantFormField
                      id="tenant-state"
                      label="State/Province"
                      value={form.state}
                      onChange={(val) => handleChange('state', val)}
                      placeholder="CA"
                      isPaidPlan={isPaidPlan}
                    />
                    <TenantFormField
                      id="tenant-postal"
                      label="Postal code"
                      value={form.postal_code}
                      onChange={(val) => handleChange('postal_code', val)}
                      placeholder="94107"
                      isPaidPlan={isPaidPlan}
                    />
                    <TenantFormField
                      id="tenant-country"
                      label="Country"
                      type="select"
                      value={form.country}
                      onChange={(val) => handleChange('country', val)}
                      isPaidPlan={isPaidPlan}
                    >
                      <option value="" disabled>Select a country</option>
                      {countryOptions.map((country) => (
                        <option key={country.value} value={country.value}>{country.label}</option>
                      ))}
                    </TenantFormField>
                  </div>
                  <div className="pt-6">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </div>
              )}

              {/* Timezone Section */}
              {activeSection === 'timezone' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--text)] mb-1">Timezone</h2>
                    <p className="text-[var(--text-muted)]">Choose your timezone for scheduling.</p>
                  </div>
                  <div className="max-w-md">
                    <TenantFormField
                      id="tenant-timezone"
                      label="Timezone"
                      type="select"
                      value={form.timezone}
                      onChange={(val) => handleChange('timezone', val)}
                      isPaidPlan={isPaidPlan}
                      helper="Choose an IANA timezone for scheduling."
                    >
                      <option value="" disabled>Select a timezone</option>
                      {timezoneOptions.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </TenantFormField>
                  </div>
                  <div className="pt-6">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </div>
              )}

              {/* SMS Setup Section */}
              {activeSection === 'sms' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--text)] mb-1">SMS Setup</h2>
                    <p className="text-[var(--text-muted)]">Register and manage 10DLC phone numbers for SMS messaging.</p>
                  </div>

                  {/* Registration Status Card */}
                  <Card className="bg-gradient-to-r from-primary-50 to-primary-50/50 dark:from-primary-950/20 dark:to-primary-950/10 border-primary-200 dark:border-primary-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">Registration Status</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                          {brands.length > 0
                            ? `${brands.length} registrations configured`
                            : 'No 10DLC registrations yet'}
                        </p>
                      </div>
                      {brands.length > 0 && (
                        <Badge variant="success">Active</Badge>
                      )}
                    </div>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setShow10DLCModal(true)}
                    >
                      Register 10DLC
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowRegistrationHistory(true)}
                    >
                      View Registration History
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm text-[var(--text-muted)]">
                    <p className="mb-2">
                      <strong className="text-[var(--text)]">What is 10DLC?</strong> 10 Digit Long Code is a carrier registration for SMS messaging that provides higher delivery rates and compliance.
                    </p>
                    <p>Complete your business information in the registration wizard to get started.</p>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Mobile/Tablet: Tab-based Layout */}
          <form onSubmit={handleSave} className="lg:hidden space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto">
              {sections.map(section => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    activeSection === section.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6 pb-6">
              {/* Basics Section */}
              {activeSection === 'basics' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text)] mb-1">Basics</h2>
                    <p className="text-sm text-[var(--text-muted)]">Name and contact emails shown to your team and customers.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="tenant-name" className="text-sm font-medium text-[var(--text)]">Tenant name</label>
                        <span className="required-badge">Required</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">Appears in navigation, emails, and billing docs.</p>
                      <Input
                        id="tenant-name"
                        value={form.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="tenant-plan" className="text-sm font-medium text-[var(--text)]">Plan</label>
                        <span className="required-badge">Required</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">Choose the plan for this tenant.</p>
                      <Select
                        id="tenant-plan"
                        value={form.plan_id || ''}
                        onChange={(e) => handleChange('plan_id', e.target.value)}
                        required
                      >
                        <option value="" disabled>Select a plan</option>
                        {currentPlanMissing && (
                          <option value={form.plan_id}>{form.plan_id} (current)</option>
                        )}
                        {planOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </div>
                    <TenantFormField
                      id="tenant-legal-name"
                      label="Legal name"
                      value={form.legal_name}
                      onChange={(val) => handleChange('legal_name', val)}
                      placeholder="Acme Corporation LLC"
                      isPaidPlan={isPaidPlan}
                      helper="Used on invoices and compliance documents."
                    />
                    <TenantFormField
                      id="tenant-billing-email"
                      label="Billing email"
                      value={form.billing_email}
                      onChange={(val) => handleChange('billing_email', val)}
                      placeholder="billing@acme.com"
                      isPaidPlan={isPaidPlan}
                      helper="Where invoices and billing alerts are sent."
                    />
                    <TenantFormField
                      id="tenant-support-email"
                      label="Support email"
                      value={form.support_email}
                      onChange={(val) => handleChange('support_email', val)}
                      placeholder="support@acme.com"
                      isPaidPlan={isPaidPlan}
                      helper="Shown to customers when they need help."
                    />
                  </div>
                  <div className="pt-3">
                    <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </div>
              )}

              {/* Address Section */}
              {activeSection === 'address' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text)] mb-1">Address</h2>
                    <p className="text-sm text-[var(--text-muted)]">Used for receipts and location-aware features.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <TenantFormField
                      id="tenant-address1"
                      label="Address line 1"
                      value={form.address_line1}
                      onChange={(val) => handleChange('address_line1', val)}
                      placeholder="123 Main St."
                      isPaidPlan={isPaidPlan}
                    />
                    <div className="space-y-1.5">
                      <label htmlFor="tenant-address2" className="text-sm font-medium text-[var(--text)]">Address line 2</label>
                      <Input
                        id="tenant-address2"
                        value={form.address_line2 || ''}
                        onChange={(e) => handleChange('address_line2', e.target.value)}
                        placeholder="Suite 400"
                      />
                    </div>
                    <TenantFormField
                      id="tenant-city"
                      label="City"
                      value={form.city}
                      onChange={(val) => handleChange('city', val)}
                      placeholder="San Francisco"
                      isPaidPlan={isPaidPlan}
                    />
                    <TenantFormField
                      id="tenant-state"
                      label="State/Province"
                      value={form.state}
                      onChange={(val) => handleChange('state', val)}
                      placeholder="CA"
                      isPaidPlan={isPaidPlan}
                    />
                    <TenantFormField
                      id="tenant-postal"
                      label="Postal code"
                      value={form.postal_code}
                      onChange={(val) => handleChange('postal_code', val)}
                      placeholder="94107"
                      isPaidPlan={isPaidPlan}
                    />
                    <TenantFormField
                      id="tenant-country"
                      label="Country"
                      type="select"
                      value={form.country}
                      onChange={(val) => handleChange('country', val)}
                      isPaidPlan={isPaidPlan}
                    >
                      <option value="" disabled>Select a country</option>
                      {countryOptions.map((country) => (
                        <option key={country.value} value={country.value}>{country.label}</option>
                      ))}
                    </TenantFormField>
                  </div>
                  <div className="pt-3">
                    <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </div>
              )}

              {/* Timezone Section */}
              {activeSection === 'timezone' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text)] mb-1">Timezone</h2>
                    <p className="text-sm text-[var(--text-muted)]">Choose your timezone for scheduling.</p>
                  </div>
                  <TenantFormField
                    id="tenant-timezone"
                    label="Timezone"
                    type="select"
                    value={form.timezone}
                    onChange={(val) => handleChange('timezone', val)}
                    isPaidPlan={isPaidPlan}
                    helper="Choose an IANA timezone for scheduling."
                  >
                    <option value="" disabled>Select a timezone</option>
                    {timezoneOptions.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </TenantFormField>
                  <div className="pt-3">
                    <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </div>
              )}

              {/* SMS Setup Section */}
              {activeSection === 'sms' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text)] mb-1">SMS Setup</h2>
                    <p className="text-sm text-[var(--text-muted)]">Register and manage 10DLC phone numbers for SMS messaging.</p>
                  </div>

                  {/* Registration Status Card */}
                  <Card className="bg-gradient-to-r from-primary-50 to-primary-50/50 dark:from-primary-950/20 dark:to-primary-950/10 border-primary-200 dark:border-primary-900">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-[var(--text)]">Registration Status</h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {brands.length > 0
                          ? `${brands.length} registrations configured`
                          : 'No 10DLC registrations yet'}
                      </p>
                      {brands.length > 0 && (
                        <Badge variant="success">Active</Badge>
                      )}
                    </div>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={() => setShow10DLCModal(true)}
                      className="w-full"
                    >
                      Register 10DLC
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowRegistrationHistory(true)}
                      className="w-full"
                    >
                      View Registration History
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm text-[var(--text-muted)]">
                    <p className="mb-2">
                      <strong className="text-[var(--text)]">What is 10DLC?</strong> 10 Digit Long Code is a carrier registration for SMS messaging that provides higher delivery rates and compliance.
                    </p>
                    <p>Complete your business information in the registration wizard to get started.</p>
                  </div>
                </div>
              )}
            </div>
          </form>

        {/* 10DLC Registration Modal */}
        <Tenant10DLCModal
          isOpen={show10DLCModal}
          onClose={() => setShow10DLCModal(false)}
          businessInfo={businessInfo}
          brands={brands}
          submitting10DLC={submitting10DLC}
          onSubmit10DLC={submit10DLC}
          loadingBrands={loadingBrands}
          isWizardMode={true}
          businessInfoStep={businessInfoStep}
          onNextStep={goToNextBusinessStep}
          onPrevStep={goToPrevBusinessStep}
          renderStep={renderBusinessInfoStep}
          businessInfoSteps={businessInfoSteps}
          businessInfoError={businessInfoError}
        />

        {/* Registration History Modal */}
        <TenantRegistrationHistoryModal
          isOpen={showRegistrationHistory}
          onClose={() => setShowRegistrationHistory(false)}
          brands={brands}
          loadingBrands={loadingBrands}
        />
        </>
          );
        })()
      )}
    </Shell>
  );
}
