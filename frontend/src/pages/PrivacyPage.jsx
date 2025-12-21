import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/layout/MarketingShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { ShieldCheck, Database, Lock, KeyRound } from 'lucide-react'

const dataHighlights = [
  { label: 'Identity', detail: 'Name, email, phone, workspace metadata', icon: ShieldCheck },
  { label: 'Engagement', detail: 'Message templates, timing rules, delivery signals', icon: Database },
  { label: 'Billing', detail: 'Plan status, invoices, usage analytics', icon: KeyRound }
]

const policies = [
  {
    title: 'Data we collect',
    copy: 'We capture the minimal personal info to deliver services, manage workspaces, and communicate updates. Consent metadata stays tied to every campaign.'
  },
  {
    title: 'Security & retention',
    copy: 'All data is encrypted in transit and at rest. Retention aligns with regulations, and deletion requests are honored within 30 days.'
  },
  {
    title: 'Control & transparency',
    copy: 'You control notifications, exports, integrations, and can download any record for audits.'
  }
]

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div className="space-y-8 py-6">
        <PageHeader
          icon={ShieldCheck}
          title="We respect your data."
          description="EngageNinja processes only what is needed to power WhatsApp, Email, and SMS campaigns while keeping you informed."
          helper="We do not sell your data or share it without consent."
          meta={
            <Badge variant="neutral" className="text-[var(--text)]">
              Processing limited to delivery, billing, and compliance
            </Badge>
          }
          actions={
            <>
              <PrimaryAction asChild>
                <Link to="/contact">Contact privacy team</Link>
              </PrimaryAction>
              <SecondaryAction asChild>
                <Link to="/pricing">Review plans</Link>
              </SecondaryAction>
            </>
          }
        />

        <section className="grid md:grid-cols-2 gap-6">
          {policies.slice(0, 2).map((policy) => (
            <Card key={policy.title} variant="glass">
              <CardHeader>
                <CardTitle>{policy.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[var(--text-muted)]">
                <p>{policy.copy}</p>
              </CardContent>
            </Card>
          ))}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Requests & access</CardTitle>
              <CardDescription>Export, correction, or deletion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>Send a request to <a href="mailto:privacy@engageninja.com" className="text-primary-600 font-semibold">privacy@engageninja.com</a>.</p>
              <p>We honor rights such as portability, correction, and erasure within 30 days.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {dataHighlights.map((highlight) => {
            const Icon = highlight.icon
            return (
              <Card key={highlight.label} variant="glass" className="space-y-3">
                <CardHeader className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary-500" />
                  <CardTitle className="text-lg">{highlight.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--text-muted)]">{highlight.detail}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Access controls</CardTitle>
              <CardDescription>Every workspace has tenant admins, 2FA, and audit logs.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
              <p>Revoke seats instantly, rotate API keys, and monitor every impersonation event.</p>
              <p>Data exports are logged and encrypted before delivery.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </MarketingShell>
  )
}
