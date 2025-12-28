import React from 'react';
import { Dialog, Button, Badge, Alert } from '../ui';

export default function TenantRegistrationHistoryModal({
  isOpen,
  onClose,
  brands,
  loadingBrands
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Registration History"
      description="View your 10DLC registration attempts and their approval status"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6 py-4">
        {loadingBrands ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-[var(--text-muted)]">Loading registration history...</p>
          </div>
        ) : brands.length === 0 ? (
          <Alert type="info" title="No Registrations Yet">
            You haven't submitted any 10DLC registrations yet. Click "Register 10DLC" to get started.
          </Alert>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Below are all 10DLC registration attempts for this workspace.
            </p>
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
                    <tr key={brand.id} className="border-b border-[var(--border)] last:border-0 hover:bg-black/5 transition-colors">
                      <td className="px-4 py-3 text-[var(--text)] font-medium">{brand.legal_business_name}</td>
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

        {/* Status Guide */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-2 text-sm text-[var(--text-muted)]">
          <p className="font-medium text-[var(--text)]">Status Guide</p>
          <div className="space-y-1">
            <p><Badge variant="warning">PENDING</Badge> - Awaiting carrier approval (typically 2-3 business days)</p>
            <p><Badge variant="success">APPROVED</Badge> - Registration approved and active</p>
            <p><Badge variant="danger">REJECTED</Badge> - Registration rejected by carrier (contact support)</p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
