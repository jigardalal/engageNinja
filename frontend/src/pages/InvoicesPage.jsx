import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  Badge,
  Button
} from '../components/ui'
import { AlertDescription } from '../components/ui/Alert'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { AlertCircle, Download, FileText } from 'lucide-react'

export default function InvoicesPage({ embedded = false }) {
  const { activeTenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeTenant) {
      return
    }
    fetchData()
  }, [activeTenant])

  const fetchData = async () => {
    try {
      setLoading(true)
      const summaryRes = await fetch('/api/billing/summary', { credentials: 'include' })

      if (!summaryRes.ok) {
        throw new Error('Failed to fetch invoice data')
      }

      const summaryData = await summaryRes.json()
      setBillingData(summaryData)
      setError(null)
    } catch (err) {
      console.error('Error fetching invoice data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const Shell = ({ children }) => (
    embedded ? <div className="space-y-6">{children}</div> : (
      <AppShell hideTitleBlock title="Invoices" subtitle="Download your billing receipts">
        {children}
      </AppShell>
    )
  )

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <p className="text-[var(--text-muted)]">Loading invoices...</p>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <PageHeader
        icon={FileText}
        title="Billing history"
        description="Download invoices for your payments and export records as needed."
        helper={`${billingData?.invoices?.length || 0} invoice${(billingData?.invoices?.length || 0) !== 1 ? 's' : ''}`}
        actions={(
          <SecondaryAction onClick={fetchData}>
            Refresh
          </SecondaryAction>
        )}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Download receipts for your billing periods.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {billingData?.invoices && billingData.invoices.length > 0 ? (
            billingData.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Invoice {invoice.id}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(invoice.created_at).toLocaleDateString()} • Status: <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'} className="ml-1 capitalize">{invoice.status}</Badge>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text)]">
                  <span className="font-semibold">
                    {(invoice.amount / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: invoice.currency.toUpperCase()
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/api/billing/invoices/${invoice.id}/download`, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-[var(--text-muted)]">
              <p>No invoices yet.</p>
              <p className="mt-1">Invoices populate here once your billing activity starts.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Questions about billing? Contact support at support@engageninja.com
        </AlertDescription>
      </Alert>
    </Shell>
  )
}
