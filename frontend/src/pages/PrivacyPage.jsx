import React from 'react';
import MarketingShell from '../components/layout/MarketingShell';
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui';

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="py-6 space-y-3">
        <Badge variant="primary">Privacy</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">We respect your data</h1>
        <p className="text-lg text-[var(--text-muted)] max-w-4xl">
          EngageNinja only processes personal information to deliver services, send invoices, and keep
          you informed about your workspace. We do not sell your data or share it without your consent.
        </p>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Data We Collect</CardTitle>
          <CardDescription>
            Email, name, phone, and workspace information are collected to create your account and
            configure your tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-[var(--text-muted)]">
          <p>We capture the minimum amount of information needed to keep your conversations flowing.</p>
          <p>Control your notifications, integrations, and exports from within your workspace settings.</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Security & Retention</CardTitle>
          <CardDescription>
            Data is encrypted in transit and at rest, and we retain only what is necessary to meet our
            obligations unless you request deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-[var(--text-muted)]">
          <p>Session data is rotated frequently, and passwords are hashed with bcrypt.</p>
          <p>Send us a request at <a href="mailto:support@engageninja.com" className="text-primary-600 font-semibold">support@engageninja.com</a> to export or delete your data.</p>
        </CardContent>
      </Card>
    </MarketingShell>
  );
}
