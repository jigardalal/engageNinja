import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '../components/ui'

export default function PlatformPage() {
  const sections = [
    { title: 'WhatsApp campaigns', desc: 'Template approval, delivery/read states, resend-only to non-readers.' },
    { title: 'Email broadcasts', desc: 'Simple email sends with verified sender support.' },
    { title: 'AI campaign generator', desc: 'Prompts → variations → approvals with Claude-backed copy.' },
    { title: 'Resend engine', desc: 'Rules, guardrails, and timing to only target non-readers.' },
    { title: 'Dashboards & reporting', desc: 'Uplift cards, tenant-level KPIs, and live SSE metrics.' },
    { title: 'API & webhooks', desc: 'Developer-first: tenant keys, rate limits, webhook retries.' },
    { title: 'Multi-tenant & impersonation', desc: 'Agency view, impersonation banner, audit events.' },
    { title: 'Quotas & plans', desc: 'Per-tier caps surfaced clearly in UI.' },
  ]

  return (
    <MarketingShell>
      <section className="grid lg:grid-cols-2 gap-10 items-start py-6">
        <div>
          <Badge variant="primary" className="mb-4">Platform overview</Badge>
          <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">One platform for WhatsApp, Email, AI, and Resend.</h1>
          <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl">
            Build, send, and track campaigns with guardrails, real-time delivery, resend intelligence, and API/webhooks for developers.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Delivery & Uplift</CardTitle>
            <CardDescription>Live status across channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm text-[var(--text-muted)]">
              <Metric label="Sent" value="12,394" />
              <Metric label="Delivered" value="97%" />
              <Metric label="Read" value="74%" />
              <Metric label="Uplift" value="+18%" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardContent>
              <h3 className="text-[var(--text)] font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </MarketingShell>
  )
}

function Metric({ label, value }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
        <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
      </CardContent>
    </Card>
  )
}
