import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BillingFailurePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse bg-red-200 rounded-full blur-lg" />
              <AlertCircle className="relative h-16 w-16 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-3xl mt-4">Payment Failed</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your payment could not be processed. Please try again.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-center">
            <p className="text-[var(--text-muted)]">
              Common reasons for payment failure:
            </p>
            <ul className="text-sm text-[var(--text-muted)] space-y-1 text-left">
              <li>• Card expired or invalid</li>
              <li>• Insufficient funds</li>
              <li>• Card issuer declined the transaction</li>
              <li>• Address verification failed</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-900">
              <span className="font-semibold">⏰ Grace Period:</span> You have 48 hours to resolve this and complete your subscription. After that, your access may be restricted.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => navigate('/dashboard/billing')}
              className="w-full"
            >
              <span className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Try Again
              </span>
            </Button>

            <Button
              onClick={() => window.location.href = 'mailto:support@engageninja.com'}
              variant="outline"
              className="w-full"
            >
              Contact Support
            </Button>
          </div>

          <div className="text-center text-xs text-[var(--text-muted)] pt-2 space-y-1">
            <p>Need help? Our support team is here to assist.</p>
            <p className="font-mono text-xs">support@engageninja.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
