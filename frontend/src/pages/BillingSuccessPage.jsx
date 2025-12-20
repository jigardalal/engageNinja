import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Give a moment for webhook to process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse bg-green-200 rounded-full blur-lg" />
              <CheckCircle className="relative h-16 w-16 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl mt-4">Payment Successful!</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-[var(--text-muted)]">
              Your subscription has been activated and is now active.
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              You can now use all features included in your plan.
            </p>
          </div>

          {isLoading && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                Processing your subscription... please wait.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 pt-4">
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
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="text-center text-xs text-[var(--text-muted)] pt-2">
            <p>Check your email for a confirmation receipt</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
