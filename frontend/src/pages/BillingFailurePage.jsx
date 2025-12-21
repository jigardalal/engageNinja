import React from 'react'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Alert, Button } from '../components/ui'
import { AlertDescription } from '../components/ui/Alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function BillingFailurePage() {
  const navigate = useNavigate()

  return (
    <AppShell title="Billing" subtitle="Payment failed">
      <PageHeader
        icon={AlertCircle}
        title="Payment failed"
        description="We could not process your payment. Please retry or contact support."
        helper="Keep your account active by resolving billing issues quickly"
      />

      <div className="flex items-center justify-center">
        <Card className="w-full max-w-lg space-y-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <AlertCircle className="h-16 w-16 text-red-600" />
            </div>
            <CardTitle className="text-3xl">Payment Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Your payment could not be processed. Please try again or reach out to support for help.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-center text-[var(--text-muted)]">
              <p>Common reasons for payment failures:</p>
              <ul className="text-sm space-y-1 text-left list-disc list-inside">
                <li>Card expired or invalid</li>
                <li>Insufficient funds</li>
                <li>Card issuer declined the charge</li>
                <li>Address verification failed</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-900">
                <strong>Grace Period:</strong> You have 48 hours to resolve this before access is restricted.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/dashboard/billing')}
                className="w-full"
              >
                <span className="flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Try again
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'mailto:support@engageninja.com'}
                className="w-full"
              >
                Contact support
              </Button>
            </div>

            <p className="text-center text-xs text-[var(--text-muted)]">
              Need help? Email support@engageninja.com
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
