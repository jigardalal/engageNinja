import React from 'react';
import { Dialog, Button, Alert, Badge, toast } from '../ui';
import { X } from 'lucide-react';

export default function Tenant10DLCModal({
  isOpen,
  onClose,
  businessInfo,
  brands,
  submitting10DLC,
  onSubmit10DLC,
  loadingBrands
}) {
  const isComplete = Boolean(
    businessInfo.legal_business_name &&
    businessInfo.business_type &&
    businessInfo.owner_name &&
    businessInfo.owner_email &&
    businessInfo.owner_phone &&
    businessInfo.country &&
    businessInfo.business_address
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="10DLC Registration"
      description="Register your business for 10 Digit Long Code (10DLC) SMS messaging"
      footer={
        <div className="flex justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {isComplete && (
            <Button onClick={onSubmit10DLC} disabled={submitting10DLC}>
              {submitting10DLC ? 'Submitting...' : 'Submit Registration'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 py-4">
        {/* Business Info Summary */}
        {isComplete && (
          <div className="bg-black/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">Business Information Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Business Name</p>
                <p className="text-[var(--text)] font-medium">{businessInfo.legal_business_name}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Type</p>
                <p className="text-[var(--text)] font-medium capitalize">{businessInfo.business_type?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Owner</p>
                <p className="text-[var(--text)] font-medium">{businessInfo.owner_name}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Location</p>
                <p className="text-[var(--text)] font-medium">{businessInfo.country}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {!isComplete ? (
          <Alert type="warning" title="Incomplete Setup">
            Complete and save your business information in the Advanced Setup section before submitting a 10DLC registration.
          </Alert>
        ) : (
          <Alert type="info" title="Ready to Submit">
            Your business information is complete. Click "Submit Registration" to proceed with 10DLC registration.
          </Alert>
        )}

        {/* Submitted Registrations */}
        {brands.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">Registration History</h3>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-black/5 border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Business Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Provider</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text)]">Approval Date</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map(brand => (
                    <tr key={brand.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 text-[var(--text)]">{brand.legal_business_name}</td>
                      <td className="px-4 py-3 text-[var(--text)]">{brand.provider}</td>
                      <td className="px-4 py-3">
                        <Badge variant={
                          brand.provider_status === 'APPROVED' || brand.provider_status === 'approved' ? 'success' :
                          brand.provider_status === 'PENDING' || brand.provider_status === 'pending' ? 'warning' :
                          'danger'
                        }>
                          {brand.provider_status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {brand.provider_approved_at
                          ? new Date(brand.provider_approved_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm text-[var(--text-muted)]">
          <p className="mb-2">
            <strong>What is 10DLC?</strong> 10 Digit Long Code is a carrier registration for SMS messaging that provides higher delivery rates and compliance.
          </p>
          <p>You must complete and save your business information before submitting a registration.</p>
        </div>
      </div>
    </Dialog>
  );
}
