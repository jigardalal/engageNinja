import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Alert, Button } from '../components/ui'
import { AlertDescription } from '../components/ui/Alert'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
export default function BillingSuccessPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AppShell title="Billing" subtitle="Payment successful">
      <PageHeader
        icon={CheckCircle}
        title="Payment confirmed"
        description="Thank you! Your subscription is now active."
        helper="You will receive a receipt via email shortly"
      />

      <div className="flex items-center justify-center">
        <Card className="w-full max-w-lg space-y-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <CheckCircle className="h-16 w-16 text-emerald-500" />
            </div>
            <CardTitle className="text-3xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-center text-[var(--text-muted)]">
              <p>Your subscription has been activated and is now active.</p>
              <p>You can use all the paid features available in your plan.</p>
            </div>

            {isLoading && (
              <Alert>
                <AlertDescription>Processing your subscription... please wait.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/dashboard/billing')}
                className="w-full"
                disabled={isLoading}
              >
                <span className="flex items-center justify-center gap-2">
                  Back to Billing
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full"
                disabled={isLoading}
              >
                Go to Dashboard
              </Button>
            </div>

            <p className="text-center text-xs text-[var(--text-muted)]">
              Check your email for a confirmation receipt.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
