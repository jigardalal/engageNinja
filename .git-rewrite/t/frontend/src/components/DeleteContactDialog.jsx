import React, { useState } from 'react';

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
    } catch (err) {
      console.error('Delete confirmation error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-red-900">Delete Contact</h2>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 text-2xl leading-none"
            aria-label="Close"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <p className="text-gray-700 mb-4">
            Are you sure you want to delete <strong>{contactName}</strong>? This action cannot be undone.
          </p>

          <p className="text-sm text-gray-500 mb-6">
            All associated data (messages, tags) will be removed from the database.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Contact'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
