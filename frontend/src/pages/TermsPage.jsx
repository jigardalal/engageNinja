import React from 'react';
import MarketingShell from '../components/layout/MarketingShell';
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui';

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="py-6 space-y-3">
        <Badge variant="primary">Terms</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Terms of service</h1>
        <p className="text-lg text-[var(--text-muted)] max-w-4xl">
          These terms explain how you may use EngageNinja and describe our mutual responsibilities.
        </p>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Scope</CardTitle>
          <CardDescription>
            You may use EngageNinja to send WhatsApp, SMS, and email campaigns on behalf of your
            organization while staying within the plan limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-[var(--text-muted)]">
          <p>Keep your contact lists compliant with local regulations and only message people who have opted in.</p>
          <p>You are responsible for the content of the messages you send, including legal disclosures.</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Limitations & Governing Law</CardTitle>
          <CardDescription>
            Service availability, uptime commitments, and acceptable use are outlined here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-[var(--text-muted)]">
          <p>We are not liable for indirect damages, and you agree to resolve disputes by arbitration.</p>
          <p>We may suspend accounts for repeated abuse or non-payment.</p>
        </CardContent>
      </Card>
    </MarketingShell>
  );
}
