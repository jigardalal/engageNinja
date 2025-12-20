import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('channels');
  const [channels, setChannels] = useState({
    whatsapp: { provider: null, is_connected: false, connected_at: null },
    email: { provider: null, is_connected: false, connected_at: null, verified_sender_email: null }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesSyncing, setTemplatesSyncing] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [templatesSuccess, setTemplatesSuccess] = useState('');

  // WhatsApp form state
  const [whatsappForm, setWhatsappForm] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: ''
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
        setChannels(data);
        setError('');
      } catch (err) {
        console.error('Error fetching channels:', err);
        setError('Failed to load channel settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

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
          businessAccountId: whatsappForm.businessAccountId
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
          connected_at: new Date().toISOString()
        }
      }));

      setSuccessMessage('WhatsApp connected successfully!');
      setShowWhatsAppModal(false);
      setWhatsappForm({ accessToken: '', phoneNumberId: '', businessAccountId: '' });

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
          connected_at: null
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
    e.preventDefault();
    setEmailError('');

    // Validation
    if (!emailForm.verifiedSenderEmail) {
      setEmailError('Verified sender email is required');
      return;
    }

    if (emailForm.provider === 'ses' && (!emailForm.accessKeyId || !emailForm.secretAccessKey || !emailForm.region)) {
      setEmailError('AWS Access Key, Secret Key, and Region are required for SES');
      return;
    }

    if (emailForm.provider === 'brevo' && !emailForm.apiKey) {
      setEmailError('Brevo API key is required');
      return;
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
          verifiedSenderEmail: emailForm.verifiedSenderEmail
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

      // Fetch templates list
      const templatesResponse = await fetch('/api/templates', {
        credentials: 'include'
      });

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.templates || []);
      }

      setTemplatesSuccess(`Successfully synced ${data.synced_count || 0} templates from Meta!`);
      setTimeout(() => setTemplatesSuccess(''), 3000);
    } catch (err) {
      console.error('Error syncing templates:', err);
      setTemplatesError('Failed to sync templates. Please try again.');
    } finally {
      setTemplatesSyncing(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Configure your channels and integrations</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
              <p className="text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('channels')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'channels'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Channels
              </button>
            </div>
          </div>

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              {/* WhatsApp Channel Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Send messages via Meta WhatsApp Cloud API
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {channels.whatsapp.is_connected ? (
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Not Connected</span>
                      </div>
                    )}
                  </div>
                </div>

                {channels.whatsapp.is_connected && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Connected at:</span> {new Date(channels.whatsapp.connected_at).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex space-x-3">
                  {!channels.whatsapp.is_connected ? (
                    <button
                      onClick={() => setShowWhatsAppModal(true)}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      Connect WhatsApp
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSyncTemplates}
                        disabled={templatesSyncing || loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {templatesSyncing ? 'Syncing...' : 'Sync Templates'}
                      </button>
                      <button
                        onClick={() => setShowWhatsAppModal(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Reconnect
                      </button>
                      <button
                        onClick={handleWhatsAppDisconnect}
                        disabled={loading}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>

                {/* Templates Section */}
                {channels.whatsapp.is_connected && (
                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">WhatsApp Templates</h3>

                    {templatesError && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                        <p className="text-red-800 dark:text-red-200 text-sm">{templatesError}</p>
                      </div>
                    )}

                    {templatesSuccess && (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                        <p className="text-green-800 dark:text-green-200 text-sm">{templatesSuccess}</p>
                      </div>
                    )}

                    {templates.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {templates.length} template(s) synced from Meta:
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {templates.map((template) => (
                            <div
                              key={template.id}
                              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                              <p className="font-medium text-gray-900 dark:text-white">
                                {template.name}
                              </p>
                              {template.variables && template.variables.length > 0 && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  Variables: {template.variables.join(', ')}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Status: <span className="capitalize">{template.status || 'active'}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No templates synced yet. Click "Sync Templates" to fetch your templates from Meta.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Email Channel Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Send emails via AWS SES or Brevo
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {channels.email.is_connected ? (
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Not Connected</span>
                      </div>
                    )}
                  </div>
                </div>

                {channels.email.is_connected && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Provider:</span> {channels.email.provider}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Verified Sender:</span> {channels.email.verified_sender_email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Connected at:</span> {new Date(channels.email.connected_at).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex space-x-3">
                  {!channels.email.is_connected ? (
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      Connect Email
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Reconnect
                      </button>
                      <button
                        onClick={handleEmailDisconnect}
                        disabled={loading}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect WhatsApp</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Enter your Meta WhatsApp Cloud API credentials. Get these from your Meta Business Suite.
            </p>

            {whatsappError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-800 dark:text-red-200 text-sm">{whatsappError}</p>
              </div>
            )}

            <form onSubmit={handleWhatsAppConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Access Token *
                </label>
                <input
                  type="password"
                  value={whatsappForm.accessToken}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
                  placeholder="Your Meta API access token"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  value={whatsappForm.phoneNumberId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
                  placeholder="Your WhatsApp phone number ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Business Account ID (Optional)
                </label>
                <input
                  type="text"
                  value={whatsappForm.businessAccountId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, businessAccountId: e.target.value })}
                  placeholder="Your Meta Business Account ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={whatsappLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {whatsappLoading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 my-8 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Email</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Configure your email provider (AWS SES or Brevo) for sending campaigns.
            </p>

            {emailError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-800 dark:text-red-200 text-sm">{emailError}</p>
              </div>
            )}

            <form onSubmit={handleEmailConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Provider *
                </label>
                <select
                  value={emailForm.provider}
                  onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="ses">AWS SES</option>
                  <option value="brevo">Brevo</option>
                </select>
              </div>

              {emailForm.provider === 'ses' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                      AWS Access Key ID *
                    </label>
                    <input
                      type="password"
                      value={emailForm.accessKeyId}
                      onChange={(e) => setEmailForm({ ...emailForm, accessKeyId: e.target.value })}
                      placeholder="Your AWS access key"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                      AWS Secret Access Key *
                    </label>
                    <input
                      type="password"
                      value={emailForm.secretAccessKey}
                      onChange={(e) => setEmailForm({ ...emailForm, secretAccessKey: e.target.value })}
                      placeholder="Your AWS secret key"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                      AWS Region *
                    </label>
                    <select
                      value={emailForm.region}
                      onChange={(e) => setEmailForm({ ...emailForm, region: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="us-east-1">us-east-1</option>
                      <option value="us-west-2">us-west-2</option>
                      <option value="eu-west-1">eu-west-1</option>
                      <option value="eu-central-1">eu-central-1</option>
                    </select>
                  </div>
                </>
              )}

              {emailForm.provider === 'brevo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Brevo API Key *
                  </label>
                  <input
                    type="password"
                    value={emailForm.apiKey}
                    onChange={(e) => setEmailForm({ ...emailForm, apiKey: e.target.value })}
                    placeholder="Your Brevo API key"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Verified Sender Email *
                </label>
                <input
                  type="email"
                  value={emailForm.verifiedSenderEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, verifiedSenderEmail: e.target.value })}
                  placeholder="Your verified email address"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {emailLoading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
