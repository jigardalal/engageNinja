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
import {
  ShieldCheck,
  Lock,
  ClipboardCheck,
  KeyRound,
  Shield,
  Database
} from 'lucide-react'

const focusAreas = [
  {
    title: 'Encryption & backups',
    detail: 'TLS 1.3 in transit, AES-256 at rest, and daily geo-redundant backups.',
    Icon: Lock
  },
  {
    title: 'Consent & approvals',
    detail: 'Capture opt-in metadata, template approvals, and automatic audit trails.',
    Icon: ClipboardCheck
  },
  {
    title: 'Role-based controls',
    detail: 'Tenant admins define seats, guardrails, and impersonation policies.',
    Icon: ShieldCheck
  },
  {
    title: 'Key rotation & secrets',
    detail: 'Short-lived API keys, scoped webhooks, and HSM-backed signing.',
    Icon: KeyRound
  },
]

const insights = [
  { label: 'Uptime', value: '99.99%', icon: Shield },
  { label: 'Audit readiness', value: 'SOC 2 + GDPR', icon: ShieldCheck },
  { label: 'Encrypted states', value: 'Kept for 60 days', icon: Database }
]

const pillars = [
  { title: 'Delivery controls', body: 'Resend only to contacts that haven’t read yet with approval checks and rate limiting.' },
  { title: 'Monitoring & alerts', body: 'Live delivery dashboards, anomaly detection, and webhook retries with exponential backoff.' },
  { title: 'Data governance', body: 'Retention policies, deletion requests, and tenant-scoped exports for compliance teams.' }
]

export default function SecurityPage() {
  return (
    <MarketingShell>
      <div className="space-y-8 py-6">
        <PageHeader
          icon={ShieldCheck}
          title="Security that scales across WhatsApp, Email, and SMS."
          description="Data protection, consent handling, and governance are woven into every surface of EngageNinja."
          helper="SOC 2 in progress · GDPR-ready posture"
          meta="Enterprise telemetry, per-tenant controls, and a hardened API surface."
          actions={
            <>
              <PrimaryAction asChild>
                <Link to="/contact">Book a security review</Link>
              </PrimaryAction>
              <SecondaryAction asChild>
                <Link to="/pricing">Compare plans</Link>
              </SecondaryAction>
            </>
          }
        />

        <section className="grid lg:grid-cols-[1.2fr,0.8fr] gap-6">
          <Card variant="glass" className="space-y-3">
            <CardHeader className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary-500" />
              <CardTitle className="text-xl">Operational controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-[var(--text-muted)]">
                Multi-tenant monitoring, live log streaming, and automated guardrails keep WhatsApp engagements compliant even when your teams move fast.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {focusAreas.map((area) => {
                  const Icon = area.Icon
                  return (
                    <Card key={area.title} variant="glass" className="border-white/20 bg-white/50 dark:bg-slate-900/60 shadow-inner">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-primary-500">
                          <Icon className="h-4 w-4" />
                          <h3 className="text-sm font-semibold text-[var(--text)]">{area.title}</h3>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{area.detail}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <CardTitle className="text-lg">Live posture</CardTitle>
              <CardDescription>Signals that keep your team confident.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/60 px-4 py-3">
                  <insight.icon className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{insight.label}</p>
                    <p className="text-lg font-semibold text-[var(--text)]">{insight.value}</p>
                  </div>
                </div>
              ))}
              <Badge variant="neutral" className="bg-white/80 text-[var(--text)]">
                Endpoint monitoring · SIEM hooks · Shadow ban alerts
              </Badge>
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {pillars.map((pillar) => (
            <Card key={pillar.title} variant="glass">
              <CardContent className="space-y-2">
                <p className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Focus</p>
                <CardTitle className="text-lg">{pillar.title}</CardTitle>
                <p className="text-sm text-[var(--text-muted)]">{pillar.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </MarketingShell>
  )
}
