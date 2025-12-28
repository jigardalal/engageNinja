import React, { useEffect, useState, useCallback } from 'react'
import { Sparkles, Edit, X } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import AppShell from '../../components/layout/AppShell'
import { toast, Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert, LoadingState, PrimaryAction, Dialog, Badge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const adaptPlanRecord = (plan) => ({
  ...plan,
  ai_features_enabled: Boolean(plan.ai_features_enabled),
  api_enabled: Boolean(plan.api_enabled),
  default_price: plan.default_price !== null && plan.default_price !== undefined ? plan.default_price : ''
})

const sanitizeNumber = (value, { allowNull = false } = {}) => {
  if (value === '' || value === null || value === undefined) {
    return allowNull ? null : 0
  }
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return allowNull ? null : 0
  }
  return parsed
}

export function AdminPlansPage() {
  const { isPlatformAdmin } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingPlanId, setSavingPlanId] = useState(null)
  const [planMessages, setPlanMessages] = useState({})
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState(null)

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/plans', {
        credentials: 'include'
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load plans')
      }
      const loadedPlans = (payload?.plans || []).map(adaptPlanRecord)
      setPlans(loadedPlans)
      // Set first plan as selected by default
      if (loadedPlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(loadedPlans[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedPlanId])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const updateField = (planId, field, value, { allowDecimal = false } = {}) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan
        if (value === '') {
          return { ...plan, [field]: '' }
        }
        const parsed = allowDecimal ? Number(value) : parseInt(value, 10)
        if (Number.isNaN(parsed) || parsed < 0) {
          return plan
        }
        return { ...plan, [field]: parsed }
      })
    )
  }

  const toggleFlag = (planId, field, value) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.id !== planId ? plan : { ...plan, [field]: value }))
    )
  }

  const handleOpenEdit = (plan) => {
    setEditFormData(adaptPlanRecord(plan))
    setShowEditModal(true)
  }

  const handleCloseEdit = () => {
    setShowEditModal(false)
    setEditFormData(null)
  }

  const handleSavePlan = async () => {
    if (!editFormData) return
    const planId = editFormData.id

    const payload = {
      name: editFormData.name,
      whatsapp_messages_per_month: sanitizeNumber(editFormData.whatsapp_messages_per_month),
      email_messages_per_month: sanitizeNumber(editFormData.email_messages_per_month),
      max_users: sanitizeNumber(editFormData.max_users),
      contacts_limit: sanitizeNumber(editFormData.contacts_limit),
      sms_messages_per_month: sanitizeNumber(editFormData.sms_messages_per_month),
      api_tokens_per_month: sanitizeNumber(editFormData.api_tokens_per_month),
      ai_features_enabled: editFormData.ai_features_enabled,
      api_enabled: editFormData.api_enabled,
      default_price: editFormData.default_price === '' ? null : sanitizeNumber(editFormData.default_price, { allowNull: true })
    }

    try {
      setSavingPlanId(planId)
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update plan')
      }
      const updatedPlan = adaptPlanRecord(result.plan)
      setPlans((prev) => prev.map((item) => (item.id === planId ? updatedPlan : item)))
      toast({ title: 'Plan updated', description: `${updatedPlan.name} saved`, variant: 'success' })
      handleCloseEdit()
    } catch (err) {
      toast({ title: 'Failed to update plan', description: err.message, variant: 'error' })
    } finally {
      setSavingPlanId(null)
    }
  }

  const updateEditField = (field, value, { allowDecimal = false } = {}) => {
    if (!editFormData) return
    if (value === '') {
      setEditFormData({ ...editFormData, [field]: '' })
      return
    }
    const parsed = allowDecimal ? Number(value) : parseInt(value, 10)
    if (Number.isNaN(parsed) || parsed < 0) {
      return
    }
    setEditFormData({ ...editFormData, [field]: parsed })
  }

  const toggleEditFlag = (field, value) => {
    if (!editFormData) return
    setEditFormData({ ...editFormData, [field]: value })
  }

  if (!isPlatformAdmin()) {
    return (
      <AppShell title="Platform Plans" subtitle="Access denied">
        <Alert type="error" title="Access Denied">
          You need platform admin privileges to view this page.
        </Alert>
      </AppShell>
    )
  }

  return (
    <AdminPageLayout
      shellTitle="Platform Plans"
      shellSubtitle="Edit pricing tiers and quota limits"
      hero={{
        icon: Sparkles,
        description: 'Balance messaging caps, API access, and AI features for every tier.',
        helper: 'Update quotas in place and save to refresh the tenant experience.',
        actions: (
          <PrimaryAction onClick={fetchPlans} disabled={loading}>
            Refresh plans
          </PrimaryAction>
        )
      }}
    >
      <div className="space-y-4">
        {error && (
          <Alert type="error" title="Unable to load plans">
            {error}
          </Alert>
        )}

        {loading ? (
          <LoadingState message="Loading plans..." />
        ) : (
          <div className="space-y-6">
            {/* Plan Selector */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-[var(--text)]">Select Plan:</label>
                <select
                  value={selectedPlanId || ''}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name || plan.id}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="secondary" onClick={fetchPlans} disabled={loading} className="flex items-center gap-2">
                <span>Refresh</span>
              </Button>
            </div>

            {/* Plan Summary */}
            {selectedPlanId && plans.find((p) => p.id === selectedPlanId) && (() => {
              const plan = plans.find((p) => p.id === selectedPlanId)
              return (
                <Card variant="glass" className="space-y-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{plan.name || plan.id}</CardTitle>
                        <CardDescription className="text-sm text-[var(--text-muted)] mt-1">
                          {plan.id} • ${plan.default_price || 'Custom pricing'}
                        </CardDescription>
                      </div>
                      <Button onClick={() => handleOpenEdit(plan)} className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Messaging Limits */}
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Messaging Quotas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg border border-[var(--border)] p-4">
                          <p className="text-xs text-[var(--text-muted)] mb-1">WhatsApp / month</p>
                          <p className="text-xl font-bold text-[var(--text)]">{plan.whatsapp_messages_per_month.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--border)] p-4">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Email / month</p>
                          <p className="text-xl font-bold text-[var(--text)]">{plan.email_messages_per_month.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--border)] p-4">
                          <p className="text-xs text-[var(--text-muted)] mb-1">SMS / month</p>
                          <p className="text-xl font-bold text-[var(--text)]">{plan.sms_messages_per_month.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Capacity Limits */}
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Capacity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg border border-[var(--border)] p-4">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Contacts</p>
                          <p className="text-xl font-bold text-[var(--text)]">{plan.contacts_limit.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--border)] p-4">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Max Users</p>
                          <p className="text-xl font-bold text-[var(--text)]">{plan.max_users}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--border)] p-4">
                          <p className="text-xs text-[var(--text-muted)] mb-1">API Tokens / month</p>
                          <p className="text-xl font-bold text-[var(--text)]">{plan.api_tokens_per_month.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Features</h3>
                      <div className="flex flex-wrap gap-2">
                        {plan.ai_features_enabled && (
                          <Badge variant="secondary">AI Features Enabled</Badge>
                        )}
                        {plan.api_enabled && (
                          <Badge variant="secondary">API Access</Badge>
                        )}
                        {!plan.ai_features_enabled && !plan.api_enabled && (
                          <p className="text-sm text-[var(--text-muted)]">No premium features</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog
        open={showEditModal}
        onClose={handleCloseEdit}
        title={`Edit ${editFormData?.name || 'Plan'}`}
        description="Update plan details and save changes"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={savingPlanId === editFormData?.id}>
              {savingPlanId === editFormData?.id ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {editFormData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Plan Name</p>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Plan name"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Default Price ($)</p>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editFormData.default_price === '' ? '' : editFormData.default_price}
                  onChange={(e) => updateEditField('default_price', e.target.value, { allowDecimal: true })}
                  placeholder="Plan price"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">WhatsApp messages / month</p>
                <Input
                  type="number"
                  value={editFormData.whatsapp_messages_per_month}
                  onChange={(e) => updateEditField('whatsapp_messages_per_month', e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Email messages / month</p>
                <Input
                  type="number"
                  value={editFormData.email_messages_per_month}
                  onChange={(e) => updateEditField('email_messages_per_month', e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">SMS messages / month</p>
                <Input
                  type="number"
                  value={editFormData.sms_messages_per_month}
                  onChange={(e) => updateEditField('sms_messages_per_month', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Contacts limit</p>
                <Input
                  type="number"
                  value={editFormData.contacts_limit}
                  onChange={(e) => updateEditField('contacts_limit', e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Max users</p>
                <Input
                  type="number"
                  value={editFormData.max_users}
                  onChange={(e) => updateEditField('max_users', e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">API tokens / month</p>
                <Input
                  type="number"
                  value={editFormData.api_tokens_per_month}
                  onChange={(e) => updateEditField('api_tokens_per_month', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editFormData.ai_features_enabled}
                  onChange={(e) => toggleEditFlag('ai_features_enabled', e.target.checked)}
                  className="rounded"
                />
                <span>Enable AI features</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editFormData.api_enabled}
                  onChange={(e) => toggleEditFlag('api_enabled', e.target.checked)}
                  className="rounded"
                />
                <span>API access</span>
              </label>
            </div>
          </div>
        )}
      </Dialog>
    </AdminPageLayout>
  )
}

export default AdminPlansPage
