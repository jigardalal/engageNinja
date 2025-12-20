import React, { useState } from 'react';
import { Dialog, Button, Alert } from './ui';

/**
 * Delete Contact Dialog
 * Confirmation dialog for deleting a contact
 */
export const DeleteContactDialog = ({ isOpen, onClose, onConfirm, contactName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete confirmation error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Delete Contact"
      description="This action cannot be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <p className="text-sm text-[var(--text)]">
        Are you sure you want to delete <strong>{contactName}</strong>? All associated data (messages, tags) will be removed.
      </p>
    </Dialog>
  );
};
