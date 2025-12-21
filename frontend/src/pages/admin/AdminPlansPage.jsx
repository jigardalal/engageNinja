import React, { useEffect, useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import AppShell from '../../components/layout/AppShell'
import { toast, Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert, LoadingState, PrimaryAction } from '../../components/ui'
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
      setPlans((payload?.plans || []).map(adaptPlanRecord))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const handleSavePlan = async (planId) => {
    const plan = plans.find((item) => item.id === planId)
    if (!plan) return

    const payload = {
      name: plan.name,
      whatsapp_messages_per_month: sanitizeNumber(plan.whatsapp_messages_per_month),
      email_messages_per_month: sanitizeNumber(plan.email_messages_per_month),
      max_users: sanitizeNumber(plan.max_users),
      contacts_limit: sanitizeNumber(plan.contacts_limit),
      sms_messages_per_month: sanitizeNumber(plan.sms_messages_per_month),
      api_tokens_per_month: sanitizeNumber(plan.api_tokens_per_month),
      ai_features_enabled: plan.ai_features_enabled,
      api_enabled: plan.api_enabled,
      default_price: plan.default_price === '' ? null : sanitizeNumber(plan.default_price, { allowNull: true })
    }

    try {
      setSavingPlanId(planId)
      setPlanMessages((prev) => ({ ...prev, [planId]: null }))
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
      setPlanMessages((prev) => ({ ...prev, [planId]: { type: 'success', text: 'Plan updated successfully' } }))
      toast({ title: 'Plan updated', description: `${updatedPlan.name} saved`, variant: 'success' })
    } catch (err) {
      setPlanMessages((prev) => ({ ...prev, [planId]: { type: 'error', text: err.message } }))
    } finally {
      setSavingPlanId(null)
    }
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
            {plans.map((plan) => (
              <Card key={plan.id} variant="glass">
                <CardHeader>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>{plan.name || plan.id}</CardTitle>
                      <CardDescription className="text-sm text-[var(--text-muted)]">
                        {plan.id}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" onClick={() => handleSavePlan(plan.id)} disabled={savingPlanId === plan.id}>
                        {savingPlanId === plan.id ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                  {planMessages[plan.id]?.text && (
                    <p className={`mt-2 text-sm ${planMessages[plan.id].type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {planMessages[plan.id].text}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">Plan Name</p>
                      <Input
                        value={plan.name}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((item) => (item.id === plan.id ? { ...item, name: e.target.value } : item))
                          )
                        }
                        placeholder="Plan name"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">Default Price ($)</p>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={plan.default_price === '' ? '' : plan.default_price}
                        onChange={(e) => updateField(plan.id, 'default_price', e.target.value, { allowDecimal: true })}
                        placeholder="Plan price"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">WhatsApp messages / month</p>
                      <Input
                        type="number"
                        value={plan.whatsapp_messages_per_month}
                        onChange={(e) => updateField(plan.id, 'whatsapp_messages_per_month', e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">Email messages / month</p>
                      <Input
                        type="number"
                        value={plan.email_messages_per_month}
                        onChange={(e) => updateField(plan.id, 'email_messages_per_month', e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">SMS messages / month</p>
                      <Input
                        type="number"
                        value={plan.sms_messages_per_month}
                        onChange={(e) => updateField(plan.id, 'sms_messages_per_month', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">Contacts limit</p>
                      <Input
                        type="number"
                        value={plan.contacts_limit}
                        onChange={(e) => updateField(plan.id, 'contacts_limit', e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">Max users</p>
                      <Input
                        type="number"
                        value={plan.max_users}
                        onChange={(e) => updateField(plan.id, 'max_users', e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)]">API tokens / month</p>
                      <Input
                        type="number"
                        value={plan.api_tokens_per_month}
                        onChange={(e) => updateField(plan.id, 'api_tokens_per_month', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={plan.ai_features_enabled}
                          onChange={(e) => toggleFlag(plan.id, 'ai_features_enabled', e.target.checked)}
                        />
                        Enable AI features
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={plan.api_enabled}
                          onChange={(e) => toggleFlag(plan.id, 'api_enabled', e.target.checked)}
                        />
                        API access
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminPageLayout>
  )
}

export default AdminPlansPage
