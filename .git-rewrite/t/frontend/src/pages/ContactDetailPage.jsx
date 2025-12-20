import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EditContactModal } from '../components/EditContactModal';
import { DeleteContactDialog } from '../components/DeleteContactDialog';
import AppShell from '../components/layout/AppShell';

/**
 * Contact Detail Page
 * View detailed information for a single contact
 */
export const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchContactDetail();
  }, [id]);

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
      setContact(data.contact);

    } catch (err) {
      console.error('Fetch contact detail error:', err);
      setError(err.message || 'Failed to load contact');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <AppShell title="Contact" subtitle="Loading contact details">
        <div className="flex items-center justify-center py-16 text-gray-300">Loading contact...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Contact" subtitle="Contact details and consent status">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-200">
          {error}
        </div>
        <button onClick={() => navigate('/contacts')} className="btn-secondary">Back to Contacts</button>
      </AppShell>
    );
  }

  if (!contact) {
    return (
      <AppShell title="Contact" subtitle="Contact details and consent status">
        <div className="text-center py-12 text-gray-300">Contact not found</div>
        <button onClick={() => navigate('/contacts')} className="btn-secondary">Back to Contacts</button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={contact.name}
      subtitle={contact.phone || 'Contact details'}
      actions={
        <button onClick={() => setShowEditModal(true)} className="btn-secondary">
          Edit Contact
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Name</label>
              <p className="mt-1 text-white">{contact.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Phone</label>
              <p className="mt-1 text-white">{contact.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Email</label>
              <p className="mt-1 text-white">{contact.email || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Created</label>
              <p className="mt-1 text-gray-300 text-sm">{formatDate(contact.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Consent Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
              <div>
                <span className="text-sm text-gray-200">WhatsApp Consent</span>
                <p className="text-xs text-gray-400">Needed for WhatsApp campaigns</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${contact.consent_whatsapp ? 'bg-green-100 text-green-800' : 'bg-white/10 text-gray-200'}`}>
                {contact.consent_whatsapp ? 'Granted' : 'Not Granted'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
              <div>
                <span className="text-sm text-gray-200">Email Consent</span>
                <p className="text-xs text-gray-400">Needed for email campaigns</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${contact.consent_email ? 'bg-blue-100 text-blue-800' : 'bg-white/10 text-gray-200'}`}>
                {contact.consent_email ? 'Granted' : 'Not Granted'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {(contact.tags || []).length > 0 ? (
              contact.tags.map((tag, index) => (
                <span key={index} className="badge badge-primary">{tag}</span>
              ))
            ) : (
              <p className="text-sm text-gray-400">No tags assigned</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="space-y-3">
            <button
              className="btn-secondary w-full"
              onClick={() => setShowEditModal(true)}
            >
              Edit Contact
            </button>
            <button
              className="btn-danger w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Contact
            </button>
          </div>
        </div>
      </div>

      <EditContactModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        contact={contact}
        onUpdated={handleContactUpdated}
      />

      <DeleteContactDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteContact}
      />
    </AppShell>
  );
};

export default ContactDetailPage;
