import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EditContactModal } from '../components/EditContactModal';
import { DeleteContactDialog } from '../components/DeleteContactDialog';
import AppShell from '../components/layout/AppShell';
import PageHeader from '../components/layout/PageHeader';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  LoadingState,
  ErrorState
} from '../components/ui';
import { PrimaryAction, DestructiveAction } from '../components/ui/ActionButtons';
import { User, ShieldCheck, Tag, MessageCircle } from 'lucide-react';

/**
 * Contact Detail Page
 * View detailed information for a single contact
 */
export const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeTenant, user } = useAuth();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    if (!activeTenant) {
      return;
    }
    fetchContactDetail();
    fetchTags();
  }, [activeTenant, id]);

  const fetchContactDetail = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/contacts/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contact not found');
        }
        throw new Error('Failed to fetch contact details');
      }

      const data = await response.json();
      // API shape varies; prefer contact, fallback to data/data.
      setContact(data.contact || data.data || null);

    } catch (err) {
      console.error('Fetch contact detail error:', err);
      setError(err.message || 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/contacts/tags/list', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      setAvailableTags(data.data || []);
    } catch (err) {
      console.error('Tags load error:', err);
    }
  };

  const handleContactUpdated = () => {
    fetchContactDetail();
  };

  const handleDeleteContact = async () => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete contact');
      }

      navigate('/contacts');
    } catch (err) {
      console.error('Delete contact error:', err);
      throw err;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      // common cases: { id, name } or arrays
      if (Array.isArray(value)) return value.join(', ');
      if (value.name) return value.name;
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (loading) {
    return (
      <AppShell hideTitleBlock title="Contact" subtitle="Loading contact details">
        <LoadingState message="Loading contact..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Contact" subtitle="Contact details and consent status">
        <ErrorState
          title="Unable to load contact"
          description={error}
          onRetry={() => window.location.reload()}
          retryLabel="Reload"
          className="mb-4"
        />
        <Button variant="secondary" onClick={() => navigate('/contacts')}>Back to Contacts</Button>
      </AppShell>
    );
  }

  if (!contact) {
    return (
      <AppShell title="Contact" subtitle="Contact details and consent status">
        <div className="text-center py-12 text-[var(--text-muted)]">Contact not found</div>
        <Button variant="secondary" onClick={() => navigate('/contacts')}>Back to Contacts</Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Contact"
      subtitle="Contact details and consent status"
    >
      <PageHeader
        icon={User}
        title={contact.name}
        description={contact.email || contact.phone || 'Customer identity'}
        helper={`Contact ID: ${contact?.id || '—'}`}
        meta={contact.phone ? `Phone · ${contact.phone}` : undefined}
        actions={
          <>
            <PrimaryAction onClick={() => setShowEditModal(true)}>Edit contact</PrimaryAction>
            <DestructiveAction onClick={() => setShowDeleteDialog(true)}>Delete contact</DestructiveAction>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr] mt-6">
        <section className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary-500" />
                <CardTitle className="text-lg">Contact overview</CardTitle>
              </div>
              <CardDescription>Profile, metadata, and engagement history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Detail label="Name" value={displayValue(contact.name)} />
              <Detail label="Phone" value={displayValue(contact.phone)} />
              <Detail label="Email" value={displayValue(contact.email) || 'Not provided'} />
              <Detail label="Timezone" value={displayValue(contact.timezone)} />
              <Detail label="Created" value={formatDate(contact.created_at)} muted />
              <Detail label="Last updated" value={formatDate(contact.updated_at)} muted />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-primary-500" />
                <CardTitle className="text-lg">Tags & segments</CardTitle>
              </div>
              <CardDescription>Labels shared across campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(contact.tags || []).length > 0 ? (
                  contact.tags.map((tag, index) => (
                    <Badge key={index} variant="primary">
                      {tag.name || tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No tags assigned yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary-500" />
                <CardTitle className="text-lg">Consent status</CardTitle>
              </div>
              <CardDescription>WhatsApp, Email, and SMS permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConsentRow label="WhatsApp consent" description="Needed for WhatsApp campaigns" granted={contact.consent_whatsapp} />
              <ConsentRow label="Email consent" description="Needed for email campaigns" granted={contact.consent_email} />
              <ConsentRow label="SMS consent" description="Needed for SMS campaigns" granted={contact.consent_sms} />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-primary-500" />
                <CardTitle className="text-lg">Recent engagement</CardTitle>
              </div>
              <CardDescription>Most recent touchpoints we captured.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--text-muted)]">
              <Detail label="Last message" value={formatDate(contact.last_message_at)} muted />
              <Detail label="Last campaign" value={contact.last_campaign || '—'} muted />
              <Detail label="Preferred platform" value={contact.platform || 'WhatsApp'} muted />
            </CardContent>
          </Card>
        </section>
      </div>

      <EditContactModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        contact={contact}
        onUpdated={handleContactUpdated}
        availableTags={availableTags}
      />

      <DeleteContactDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteContact}
      />
    </AppShell>
  );
};

function Detail({ label, value, muted }) {
  return (
    <div>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 ${muted ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>{value}</p>
    </div>
  );
}

function ConsentRow({ label, description, granted }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div>
        <p className="text-sm text-[var(--text)] font-medium">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <Badge variant={granted ? 'success' : 'neutral'}>
        {granted ? 'Granted' : 'Not Granted'}
      </Badge>
    </div>
  );
}

export default ContactDetailPage;
