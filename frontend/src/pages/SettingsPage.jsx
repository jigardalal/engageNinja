import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  Badge,
  Input,
  Label,
  Dialog,
  LoadingState,
  ErrorState
} from '../components/ui';
import TemplatesPage from './TemplatesPage';
import TagsPage from './TagsPage';
import TeamPage from './TeamPage';
import TenantProfilePage from './TenantProfilePage';
import BillingPage from './BillingPage';
import InvoicesPage from './InvoicesPage';
import PageHeader from '../components/layout/PageHeader';
import { PrimaryAction } from '../components/ui/ActionButtons';
import { Settings, Wifi, Mail, Layers, Tag, Users, CreditCard, FileText, Phone } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('channels');
  const canManageTenant = userRole && ['admin', 'owner'].includes(userRole);
  const [channels, setChannels] = useState({
    whatsapp: {
      provider: null,
      is_connected: false,
      connected_at: null,
      phone_number_id: null,
      business_account_id: null,
      webhook_verify_token: null,
      webhook_secret_present: false
    },
    email: {
      provider: null,
      is_connected: false,
      connected_at: null,
      verified_sender_email: null
    },
    sms: {
      provider: null,
      is_connected: false,
      phone_number: null,
      webhook_url: null,
      updated_at: null
    }
  });
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesSyncing, setTemplatesSyncing] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [templatesSuccess, setTemplatesSuccess] = useState('');
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);
  const [useStoredEmail, setUseStoredEmail] = useState(false);
  const [emailHealthLoading, setEmailHealthLoading] = useState(false);
  const [emailHealthResult, setEmailHealthResult] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [whatsappHealth, setWhatsappHealth] = useState({ status: 'unknown', message: '' });
  const [emailHealth, setEmailHealth] = useState({ status: 'unknown', message: '' });
  const [smsPhone, setSmsPhone] = useState('');
  const [smsWebhook, setSmsWebhook] = useState('');
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsError, setSmsError] = useState('');
  const [smsSuccess, setSmsSuccess] = useState('');
  const openEmailModal = (stored = false) => {
    setEmailError('');
    setUseStoredEmail(stored);
    setEmailForm({
      provider: channels.email.provider || 'ses',
      accessKeyId: '',
      secretAccessKey: '',
      region: channels.email.provider === 'ses' ? (channels.email.region || 'us-east-1') : 'us-east-1',
      apiKey: '',
      verifiedSenderEmail: channels.email.verified_sender_email || ''
    });
    setShowEmailModal(true);
  };

  // WhatsApp form state
  const [whatsappForm, setWhatsappForm] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyToken: '',
    webhookSecret: ''
  });
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');

  // Email form state
  const [emailForm, setEmailForm] = useState({
    provider: 'ses',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    apiKey: '',
    verifiedSenderEmail: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Fetch channel settings
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/settings/channels', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch channel settings');
        }

        const data = await response.json();
        setChannels((prev) => ({
          whatsapp: data.whatsapp || prev.whatsapp,
          email: data.email || prev.email,
          sms: data.sms || prev.sms
        }));
        setError('');

        if (data?.whatsapp?.is_connected) {
          await fetchTemplatesList();
        }

        runHealthChecks(data);
      } catch (err) {
        console.error('Error fetching channels:', err);
        setError('Failed to load channel settings. Please try again.');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    fetchChannels();
  }, []);

  useEffect(() => {
    if (channels.sms) {
      setSmsPhone(channels.sms.phone_number || '');
      setSmsWebhook(channels.sms.webhook_url || '');
    }
  }, [channels.sms]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextTab = params.get('tab');
    const allowed = ['channels', 'templates', 'tags', 'team', 'tenant', 'billing', 'invoices'];
    if (nextTab && allowed.includes(nextTab)) {
      if ((nextTab === 'team' || nextTab === 'tenant' || nextTab === 'billing' || nextTab === 'invoices') && !canManageTenant) {
        setActiveTab('channels');
        return;
      }
      setActiveTab(nextTab);
    }
  }, [location.search, userRole, canManageTenant]);

  const setTab = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate({ pathname: '/settings', search: params.toString() }, { replace: true });
  };

  const fetchTemplatesList = async () => {
    try {
      const templatesResponse = await fetch('/api/templates', {
        credentials: 'include'
      });

      if (!templatesResponse.ok) {
        throw new Error('Failed to fetch templates');
      }

      const templatesData = await templatesResponse.json();
      const list = Array.isArray(templatesData.templates)
        ? templatesData.templates
        : Array.isArray(templatesData.data)
          ? templatesData.data
          : [];
      setTemplates(list);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setTemplatesError('Failed to load templates. Please sync again.');
    }
  };

  const handleSaveSmsSettings = async () => {
    if (!smsPhone.trim()) {
      setSmsError('Twilio phone number is required');
      return;
    }

    setSmsSaving(true);
    setSmsError('');
    setSmsSuccess('');

    try {
      const payload = {
        phoneNumber: smsPhone.trim(),
        webhookUrl: smsWebhook.trim() || null
      };

      const response = await fetch('/api/settings/channels/sms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save SMS settings');
      }

      const data = await response.json();
      setChannels((prev) => ({
        ...prev,
        sms: {
          ...prev.sms,
          provider: prev.sms.provider || 'twilio',
          is_connected: true,
          phone_number: data.phone_number,
          webhook_url: data.webhook_url === undefined ? prev.sms.webhook_url : data.webhook_url,
          updated_at: prev.sms.updated_at || new Date().toISOString()
        }
      }));

      setSmsSuccess('Saved SMS settings');
      setTimeout(() => setSmsSuccess(''), 3500);
    } catch (err) {
      setSmsError(err.message);
    } finally {
      setSmsSaving(false);
    }
  };

  const openWhatsAppModal = () => {
    setWhatsappError('');
    setWhatsappForm({
      accessToken: '',
      phoneNumberId: channels.whatsapp.phone_number_id || '',
      businessAccountId: channels.whatsapp.business_account_id || '',
      webhookVerifyToken: channels.whatsapp.webhook_verify_token || '',
      webhookSecret: ''
    });
    setShowWhatsAppModal(true);
  };

  const handleTestWebhook = async () => {
    setWebhookTestResult(null);
    try {
      setWebhookTestLoading(true);
      const response = await fetch('/api/settings/channels/whatsapp/test', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setWebhookTestResult({ variant: 'error', message: data.message || 'Webhook test failed' });
        return;
      }
      setWebhookTestResult({ variant: 'success', message: 'Webhook test succeeded' });
    } catch (err) {
      console.error('Error testing webhook:', err);
      setWebhookTestResult({ variant: 'error', message: 'Webhook test failed. Check console logs.' });
    } finally {
      setWebhookTestLoading(false);
      setTimeout(() => setWebhookTestResult(null), 4000);
    }
  };

  const handleValidateWhatsApp = async () => {
    setValidationResult(null);
    try {
      setValidationLoading(true);
      const payload = channels.whatsapp.is_connected
        ? { useStoredCredentials: true }
        : {
            accessToken: whatsappForm.accessToken,
            phoneNumberId: whatsappForm.phoneNumberId
          };

      const response = await fetch('/api/settings/channels/whatsapp/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setValidationResult({ variant: 'error', message: data.message || 'Validation failed' });
      } else {
        setValidationResult({ variant: 'success', message: data.message || 'Credentials valid' });
      }
    } catch (err) {
      console.error('WhatsApp validation error:', err);
      setValidationResult({ variant: 'error', message: 'Validation failed. Check console.' });
    } finally {
      setValidationLoading(false);
      setTimeout(() => setValidationResult(null), 4000);
    }
  };

  // Handle WhatsApp connection
  const handleWhatsAppConnect = async (e) => {
    e.preventDefault();
    setWhatsappError('');

    // Validation
    if (!whatsappForm.accessToken || !whatsappForm.phoneNumberId) {
      setWhatsappError('Access token and phone number ID are required');
      return;
    }

    try {
      setWhatsappLoading(true);
      const response = await fetch('/api/settings/channels/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: whatsappForm.accessToken,
          phoneNumberId: whatsappForm.phoneNumberId,
          businessAccountId: whatsappForm.businessAccountId,
          webhookVerifyToken: whatsappForm.webhookVerifyToken,
          webhookSecret: whatsappForm.webhookSecret
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setWhatsappError(data.message || 'Failed to connect WhatsApp');
        return;
      }

      // Update channels state
      setChannels(prev => ({
        ...prev,
        whatsapp: {
          provider: 'whatsapp_cloud',
          is_connected: true,
          connected_at: new Date().toISOString(),
          phone_number_id: whatsappForm.phoneNumberId || prev.whatsapp.phone_number_id,
          business_account_id: whatsappForm.businessAccountId || prev.whatsapp.business_account_id,
          webhook_verify_token: whatsappForm.webhookVerifyToken || prev.whatsapp.webhook_verify_token,
          webhook_secret_present: Boolean(whatsappForm.webhookSecret || prev.whatsapp.webhook_secret_present)
        }
      }));

      setSuccessMessage('WhatsApp connected successfully!');
      setShowWhatsAppModal(false);
      setWhatsappForm(prev => ({
        ...prev,
        accessToken: '',
        webhookSecret: ''
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error connecting WhatsApp:', err);
      setWhatsappError('Failed to connect WhatsApp. Please try again.');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Handle WhatsApp disconnect
  const handleWhatsAppDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/settings/channels/whatsapp', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect WhatsApp');
      }

      // Update channels state
      setChannels(prev => ({
        ...prev,
        whatsapp: {
          provider: null,
          is_connected: false,
          connected_at: null,
          phone_number_id: prev.whatsapp.phone_number_id,
          business_account_id: prev.whatsapp.business_account_id,
          webhook_verify_token: prev.whatsapp.webhook_verify_token,
          webhook_secret_present: prev.whatsapp.webhook_secret_present
        }
      }));

      setSuccessMessage('WhatsApp disconnected successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setError('Failed to disconnect WhatsApp. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email connection
  const handleEmailConnect = async (e) => {
    e.preventDefault?.();
    setEmailError('');

    // Validation
    if (!emailForm.verifiedSenderEmail) {
      setEmailError('Verified sender email is required');
      return;
    }

    if (!useStoredEmail) {
      if (emailForm.provider === 'ses' && (!emailForm.accessKeyId || !emailForm.secretAccessKey || !emailForm.region)) {
        setEmailError('AWS Access Key, Secret Key, and Region are required for SES');
        return;
      }

      if (emailForm.provider === 'brevo' && !emailForm.apiKey) {
        setEmailError('Brevo API key is required');
        return;
      }
    }

    try {
      setEmailLoading(true);
      const response = await fetch('/api/settings/channels/email', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        provider: emailForm.provider,
        accessKeyId: emailForm.accessKeyId,
        secretAccessKey: emailForm.secretAccessKey,
        region: emailForm.region,
        apiKey: emailForm.apiKey,
        verifiedSenderEmail: emailForm.verifiedSenderEmail,
        useStoredCredentials: useStoredEmail
      })
    });

      const data = await response.json();

      if (!response.ok) {
      setEmailError(data.message || 'Failed to connect email');
      return;
    }

    // Update channels state
    setChannels(prev => ({
      ...prev,
      email: {
        provider: emailForm.provider,
        is_connected: true,
        connected_at: new Date().toISOString(),
        verified_sender_email: emailForm.verifiedSenderEmail
      }
    }));

      setSuccessMessage('Email provider connected successfully!');
      setShowEmailModal(false);
      setEmailForm({
        provider: 'ses',
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-1',
        apiKey: '',
        verifiedSenderEmail: ''
      });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error connecting email:', err);
      setEmailError('Failed to connect email provider. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Email disconnect
  const handleEmailDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect email?')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/settings/channels/email', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect email');
      }

      // Update channels state
      setChannels(prev => ({
        ...prev,
        email: {
          provider: null,
          is_connected: false,
          connected_at: null,
          verified_sender_email: null
        }
      }));

      setSuccessMessage('Email provider disconnected successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error disconnecting email:', err);
      setError('Failed to disconnect email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runHealthChecks = async (channelsData) => {
    const ch = channelsData || channels;
    // WhatsApp health via validate (stored creds)
    if (ch?.whatsapp?.is_connected) {
      try {
        const res = await fetch('/api/settings/channels/whatsapp/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ useStoredCredentials: true })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setWhatsappHealth({ status: 'ok', message: data.message || 'Credentials valid' });
        } else {
          setWhatsappHealth({ status: 'error', message: data.message || 'Validation failed' });
        }
      } catch (e) {
        setWhatsappHealth({ status: 'error', message: 'Validation failed' });
      }
    } else {
      setWhatsappHealth({ status: 'neutral', message: 'Not connected' });
    }

    // Email health
    try {
      const res = await fetch('/api/settings/channels/email/health', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setEmailHealth({ status: 'neutral', message: 'Not connected' });
      } else if (res.ok) {
        const missing = Array.isArray(data.data?.missing_fields) ? data.data.missing_fields : [];
        if (missing.length === 0) {
          setEmailHealth({ status: 'ok', message: 'Credentials verified' });
        } else {
          setEmailHealth({ status: 'warning', message: `Missing: ${missing.join(', ')}` });
        }
      } else {
        setEmailHealth({ status: 'error', message: data.message || 'Health check failed' });
      }
    } catch (e) {
      setEmailHealth({ status: 'error', message: 'Health check failed' });
    }
  };

  const handleEmailHealth = async () => {
    setEmailHealthResult(null);
    try {
      setEmailHealthLoading(true);
      const response = await fetch('/api/settings/channels/email/health', {
        credentials: 'include'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setEmailHealthResult({ variant: 'error', message: data.message || 'Health check failed' });
      } else {
        const missing = Array.isArray(data.data?.missing_fields) ? data.data.missing_fields : [];
        const summary = missing.length === 0
          ? 'Credentials look good and a verified sender is set.'
          : `Missing: ${missing.join(', ')}`;
        setEmailHealthResult({ variant: missing.length === 0 ? 'success' : 'warning', message: summary });
      }
    } catch (err) {
      console.error('Email health check error:', err);
      setEmailHealthResult({ variant: 'error', message: 'Health check failed. Check console.' });
    } finally {
      setEmailHealthLoading(false);
      setTimeout(() => setEmailHealthResult(null), 4000);
    }
  };

  // Handle template sync
  const handleSyncTemplates = async () => {
    try {
      setTemplatesSyncing(true);
      setTemplatesError('');
      setTemplatesSuccess('');

      const response = await fetch('/api/templates/sync', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        setTemplatesError(data.message || 'Failed to sync templates');
        return;
      }

      await fetchTemplatesList();

      const syncedCount = typeof data.synced_count === 'number'
        ? data.synced_count
        : Array.isArray(data.templates)
          ? data.templates.length
          : 0;
      setTemplatesSuccess(`Successfully synced ${syncedCount} templates from Meta!`);
      setTimeout(() => setTemplatesSuccess(''), 3000);
    } catch (err) {
      console.error('Error syncing templates:', err);
      setTemplatesError('Failed to sync templates. Please try again.');
    } finally {
      setTemplatesSyncing(false);
    }
  };

  return (
    <>
      <AppShell hideTitleBlock title="Settings" subtitle="Configure your channels and integrations">
        <PageHeader
          icon={Settings}
          title="Workspace configuration"
          description="Connect channels, manage templates, and review tenant settings."
          helper="Customize channel connections and account settings in one place"
          actions={
            <PrimaryAction onClick={() => setTab('channels')}>
              <Settings className="h-4 w-4" />
              Refresh channels
            </PrimaryAction>
          }
        />
        {!initialized ? (
          <LoadingState message="Loading channel settings..." />
        ) : (
          <>
            {successMessage && (
              <Alert variant="success" className="mb-4">
                {successMessage}
              </Alert>
            )}

            {error && (
              <ErrorState
                title="Unable to load channel settings"
                description={error}
                onRetry={() => window.location.reload()}
                retryLabel="Reload"
                className="mb-4"
              />
            )}

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-[var(--border)]">
              <div className="flex gap-4">
                {canManageTenant && (
                  <button
                    onClick={() => setTab('tenant')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                      activeTab === 'tenant'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 opacity-80" />
                      Tenant Profile
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setTab('channels')}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                    activeTab === 'channels'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                      <Wifi className="h-4 w-4 opacity-80" />
                      Channels
                  </span>
                </button>
                <button
                  onClick={() => setTab('templates')}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                    activeTab === 'templates'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                      <Layers className="h-4 w-4 opacity-80" />
                      Templates
                  </span>
                </button>
                <button
                  onClick={() => setTab('tags')}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                    activeTab === 'tags'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                      <Tag className="h-4 w-4 opacity-80" />
                      Tags
                  </span>
                </button>
                {canManageTenant && (
                  <button
                    onClick={() => setTab('team')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                      activeTab === 'team'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 opacity-80" />
                      Team
                    </span>
                  </button>
                )}
                {canManageTenant && (
                  <button
                    onClick={() => setTab('billing')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                      activeTab === 'billing'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <CreditCard className="h-4 w-4 opacity-80" />
                      Billing
                    </span>
                  </button>
                )}
                {canManageTenant && (
                  <button
                    onClick={() => setTab('invoices')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                      activeTab === 'invoices'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4 opacity-80" />
                      Invoices
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <div className="space-y-6">
                {/* WhatsApp Channel Card */}
                <Card>
                  <CardHeader className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wifi className="h-5 w-5 text-primary-500" />
                        <CardTitle>WhatsApp</CardTitle>
                      </div>
                      <CardDescription>Send messages via Meta WhatsApp Cloud API</CardDescription>
                    </div>
                    <Badge variant={channels.whatsapp.is_connected ? 'success' : 'neutral'}>
                      {channels.whatsapp.is_connected ? 'Connected' : 'Not Connected'}
                    </Badge>
                    {whatsappHealth.status !== 'unknown' && (
                      <Badge
                        variant={
                          whatsappHealth.status === 'ok'
                            ? 'success'
                            : whatsappHealth.status === 'warning'
                              ? 'secondary'
                              : whatsappHealth.status === 'neutral'
                                ? 'neutral'
                                : 'danger'
                        }
                      >
                        {whatsappHealth.message || 'Health unknown'}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {webhookTestResult && (
                      <Alert variant={webhookTestResult.variant} className="mb-2">
                        {webhookTestResult.message}
                      </Alert>
                    )}
                    {validationResult && (
                      <Alert variant={validationResult.variant} className="mb-2">
                        {validationResult.message}
                      </Alert>
                    )}
                    {(channels.whatsapp.is_connected || channels.whatsapp.phone_number_id || channels.whatsapp.webhook_verify_token || channels.whatsapp.webhook_secret_present) && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2">
                        {channels.whatsapp.is_connected && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Connected at:</span>{' '}
                            {new Date(channels.whatsapp.connected_at).toLocaleString()}
                          </p>
                        )}
                        {channels.whatsapp.phone_number_id && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Phone Number ID:</span>{' '}
                            {channels.whatsapp.phone_number_id}
                          </p>
                        )}
                        {channels.whatsapp.business_account_id && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Business Account ID:</span>{' '}
                            {channels.whatsapp.business_account_id}
                          </p>
                        )}
                        {channels.whatsapp.webhook_verify_token && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Webhook Verify Token:</span>{' '}
                            {channels.whatsapp.webhook_verify_token}
                          </p>
                        )}
                        {channels.whatsapp.webhook_secret_present && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Webhook Secret:</span> Stored
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {!channels.whatsapp.is_connected ? (
                        <Button onClick={openWhatsAppModal}>Connect WhatsApp</Button>
                      ) : (
                        <>
                          <Button
                            onClick={handleSyncTemplates}
                            disabled={templatesSyncing || loading}
                          >
                            {templatesSyncing ? 'Syncing...' : 'Sync Templates'}
                          </Button>
                          <Button variant="secondary" onClick={openWhatsAppModal}>
                            Reconnect
                          </Button>
                          <Button
                            variant="danger"
                            onClick={handleWhatsAppDisconnect}
                            disabled={loading}
                          >
                            Disconnect
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleTestWebhook}
                            disabled={webhookTestLoading}
                          >
                            {webhookTestLoading ? 'Testing...' : 'Test Webhook'}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleValidateWhatsApp}
                            disabled={validationLoading}
                          >
                            {validationLoading ? 'Validating...' : 'Validate credentials'}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Templates Section */}
                    {channels.whatsapp.is_connected && (
                      <div className="pt-4 border-t border-[var(--border)] space-y-3">
                        <h3 className="text-lg font-semibold text-[var(--text)]">WhatsApp Templates</h3>

                        {templatesError && (
                          <Alert variant="error">{templatesError}</Alert>
                        )}

                        {templatesSuccess && (
                          <Alert variant="success">{templatesSuccess}</Alert>
                        )}

                        {templates.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            <p className="text-sm text-[var(--text-muted)]">
                              {templates.length} template(s) synced from Meta:
                            </p>
                            {templates.map((template) => (
                              <div
                                key={template.id}
                                className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                              >
                                <p className="font-medium text-[var(--text)]">{template.name}</p>
                                {template.variables && template.variables.length > 0 && (
                                  <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Variables: {template.variables.join(', ')}
                                  </p>
                                )}
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                  Status: <span className="capitalize">{template.status || 'active'}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">
                            No templates synced yet. Click "Sync Templates" to fetch your templates from Meta.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Email Channel Card */}
                <Card>
                  <CardHeader className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary-500" />
                        <CardTitle>Email</CardTitle>
                      </div>
                      <CardDescription>Send emails via AWS SES or Brevo</CardDescription>
                    </div>
                    <Badge variant={channels.email.is_connected ? 'success' : 'neutral'}>
                      {channels.email.is_connected ? 'Connected' : 'Not Connected'}
                    </Badge>
                    {emailHealth.status !== 'unknown' && (
                      <Badge
                        variant={
                          emailHealth.status === 'ok'
                            ? 'success'
                            : emailHealth.status === 'warning'
                              ? 'secondary'
                              : emailHealth.status === 'neutral'
                                ? 'neutral'
                                : 'danger'
                        }
                      >
                        {emailHealth.message || 'Health unknown'}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(channels.email.is_connected || channels.email.provider || channels.email.verified_sender_email) && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2">
                        {channels.email.provider && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Provider:</span> {channels.email.provider}
                          </p>
                        )}
                        {channels.email.region && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Region:</span> {channels.email.region}
                          </p>
                        )}
                        {channels.email.verified_sender_email && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Verified Sender:</span> {channels.email.verified_sender_email}
                          </p>
                        )}
                        {channels.email.is_connected && channels.email.connected_at && (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Connected at:</span> {new Date(channels.email.connected_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {!channels.email.is_connected ? (
                        <Button onClick={() => openEmailModal(false)}>Connect Email</Button>
                      ) : (
                        <>
                          <Button variant="secondary" onClick={() => openEmailModal(true)}>
                            Connect (use stored)
                          </Button>
                          <Button
                            variant="danger"
                            onClick={handleEmailDisconnect}
                            disabled={loading}
                          >
                            Disconnect
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleEmailHealth}
                            disabled={emailHealthLoading}
                          >
                            {emailHealthLoading ? 'Checking...' : 'Check health'}
                          </Button>
                        </>
                      )}
                    </div>

                    {emailHealthResult && (
                      <Alert variant={emailHealthResult.variant} className="mt-3">
                        {emailHealthResult.message}
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* SMS Channel Card */}
                <Card variant="glass">
                  <CardHeader className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-primary-500" />
                        <CardTitle>SMS (Twilio)</CardTitle>
                      </div>
                      <CardDescription>Send SMS via Twilio using per-tenant sender numbers.</CardDescription>
                    </div>
                    <Badge variant={channels.sms.is_connected ? 'success' : 'neutral'}>
                      {channels.sms.is_connected ? 'Configured' : 'Not configured'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {smsError && (
                      <Alert variant="error">{smsError}</Alert>
                    )}
                    {smsSuccess && (
                      <Alert variant="success">{smsSuccess}</Alert>
                    )}
                    <form className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <Label>Twilio sender number *</Label>
                        <Input
                          value={smsPhone}
                          onChange={(e) => setSmsPhone(e.target.value)}
                          placeholder="+15551234567"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Use E.164 format (plus sign + country code).
                        </p>
                      </div>
                      <div>
                        <Label>Webhook URL</Label>
                        <Input
                          value={smsWebhook}
                          onChange={(e) => setSmsWebhook(e.target.value)}
                          placeholder="https://your-app.com/webhooks/twilio"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Register this URL with Twilio status callbacks. Current value: {channels.sms.webhook_url || `${window.location.origin}/webhooks/twilio`}
                        </p>
                      </div>
                    </form>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[var(--text-muted)]">
                        Phone number: {channels.sms.phone_number || 'Not configured'} • Webhook updated: {channels.sms.updated_at ? new Date(channels.sms.updated_at).toLocaleString() : 'Never'}
                      </p>
                      <Button onClick={handleSaveSmsSettings} disabled={smsSaving}>
                        {smsSaving ? 'Saving...' : 'Save SMS settings'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <TemplatesPage embedded />
              </div>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <div className="space-y-6">
                <TagsPage embedded />
              </div>
            )}

            {/* Tenant Profile Tab */}
            {activeTab === 'tenant' && (
              <div className="space-y-6">
                <TenantProfilePage embedded />
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <BillingPage embedded />
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="space-y-6">
                <InvoicesPage embedded />
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <TeamPage embedded />
              </div>
            )}
          </>
        )}
      </AppShell>
 
      {/* WhatsApp Modal */}
      <Dialog
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Connect WhatsApp"
        description="Enter your Meta WhatsApp Cloud API credentials."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowWhatsAppModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleWhatsAppConnect} disabled={whatsappLoading}>
              {whatsappLoading ? 'Connecting...' : 'Connect'}
            </Button>
          </>
        }
      >
        {whatsappError && (
          <Alert variant="error" className="mb-4">
            {whatsappError}
          </Alert>
        )}

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--text-muted)]">
            Phone number ID: WhatsApp Manager → Phone numbers → copy “Phone Number ID”.<br />
            Webhook secret & verify token: Meta App Dashboard → WhatsApp → Configuration.
          </div>
          <div className="space-y-2">
            <Label>Access Token *</Label>
            <Input
              type="password"
              value={whatsappForm.accessToken}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
              placeholder="Your Meta API access token"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Number ID *</Label>
            <Input
              type="text"
              value={whatsappForm.phoneNumberId}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
              placeholder="Your WhatsApp phone number ID"
            />
          </div>

          <div className="space-y-2">
            <Label>Business Account ID (Optional)</Label>
            <Input
              type="text"
              value={whatsappForm.businessAccountId}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, businessAccountId: e.target.value })}
              placeholder="Your Meta Business Account ID"
            />
          </div>

          <div className="space-y-2">
            <Label>Webhook Verify Token (Optional)</Label>
            <Input
              type="text"
              value={whatsappForm.webhookVerifyToken}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, webhookVerifyToken: e.target.value })}
              placeholder="Used by Meta to validate your webhook"
            />
          </div>

          <div className="space-y-2">
            <Label>Webhook Secret (Optional)</Label>
            <Input
              type="password"
              value={whatsappForm.webhookSecret}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, webhookSecret: e.target.value })}
              placeholder="For signature verification (leave blank to keep existing)"
            />
          </div>
        </div>
      </Dialog>

      {/* Email Modal */}
      <Dialog
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Connect Email"
        description="Configure your email provider (AWS SES or Brevo) for sending campaigns."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailConnect} disabled={emailLoading}>
              {emailLoading ? 'Connecting...' : (useStoredEmail ? 'Connect (stored)' : 'Connect')}
            </Button>
          </>
        }
      >
        {emailError && (
          <Alert variant="error" className="mb-4">
            {emailError}
          </Alert>
        )}

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--text-muted)]">
            SES: Verify your sender email/domain in SES Console → Verified identities, then paste that email here.<br />
            Brevo: Add a sender in Brevo (Senders & IPs → Senders) and use that verified email.
          </div>
          <div className="flex items-center gap-2">
            <input
              id="useStoredEmail"
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border)] text-primary-600 focus:ring-primary-500"
              checked={useStoredEmail}
              onChange={(e) => setUseStoredEmail(e.target.checked)}
            />
            <Label htmlFor="useStoredEmail">Use stored credentials (do not resend keys)</Label>
          </div>

          <div className="space-y-2">
            <Label>Provider *</Label>
            <select
              value={emailForm.provider}
              onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              disabled={useStoredEmail}
            >
              <option value="ses">AWS SES</option>
              <option value="brevo">Brevo</option>
            </select>
          </div>

          {emailForm.provider === 'ses' && (
            <>
              {!useStoredEmail && (
                <>
                  <div className="space-y-2">
                    <Label>AWS Access Key ID *</Label>
                    <Input
                      type="password"
                      value={emailForm.accessKeyId}
                      onChange={(e) => setEmailForm({ ...emailForm, accessKeyId: e.target.value })}
                      placeholder="Your AWS access key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>AWS Secret Access Key *</Label>
                    <Input
                      type="password"
                      value={emailForm.secretAccessKey}
                      onChange={(e) => setEmailForm({ ...emailForm, secretAccessKey: e.target.value })}
                      placeholder="Your AWS secret key"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>AWS Region *</Label>
                <select
                  value={emailForm.region}
                  onChange={(e) => setEmailForm({ ...emailForm, region: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="eu-central-1">eu-central-1</option>
                  <option value="us-east-2">us-east-2</option>
                </select>
              </div>
            </>
          )}

          {emailForm.provider === 'brevo' && (
            !useStoredEmail && (
              <div className="space-y-2">
                <Label>Brevo API Key *</Label>
                <Input
                  type="password"
                  value={emailForm.apiKey}
                  onChange={(e) => setEmailForm({ ...emailForm, apiKey: e.target.value })}
                  placeholder="Your Brevo API key"
                />
              </div>
            )
          )}

          <div className="space-y-2">
            <Label>Verified Sender Email *</Label>
            <Input
              type="email"
              value={emailForm.verifiedSenderEmail}
              onChange={(e) => setEmailForm({ ...emailForm, verifiedSenderEmail: e.target.value })}
              placeholder="Your verified email address"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
