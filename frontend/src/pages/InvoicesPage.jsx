import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { AlertCircle, Download } from 'lucide-react';

export default function InvoicesPage({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const summaryRes = await fetch('/api/billing/summary', { credentials: 'include' });

      if (!summaryRes.ok) {
        throw new Error('Failed to fetch invoice data');
      }

      const summaryData = await summaryRes.json();
      setBillingData(summaryData);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoice data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Download your billing history</CardDescription>
        </CardHeader>
        <CardContent>
          {billingData?.invoices && billingData.invoices.length > 0 ? (
            <div className="space-y-2">
              {billingData.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{invoice.id}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(invoice.created_at).toLocaleDateString()} • {invoice.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {(invoice.amount / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: invoice.currency.toUpperCase()
                      })}
                    </span>
                    <a
                      href={`/api/billing/invoices/${invoice.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline"
                      title="Download invoice"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">No invoices yet</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Invoices will appear here once you have billing activity
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Questions about billing? Contact our support team at support@engageninja.com
        </AlertDescription>
      </Alert>
    </div>
  );
}
