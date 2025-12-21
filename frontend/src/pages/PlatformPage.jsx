import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge
} from '../components/ui'
import { Sparkles, Layers, ShieldCheck, BarChart3 } from 'lucide-react'

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
      <section className="grid lg:grid-cols-[1.2fr,0.8fr] gap-10 items-start py-6">
        <div className="space-y-5">
          <Badge variant="primary" className="inline-flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Platform overview
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">
              Unified WhatsApp, email, AI, and resend automation for everyone from agencies to scale-ups.
            </h1>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl">
              Approvals, templates, API/webhook plumbing, and SSE dashboards live together so your teams can build, send, and monitor multi-channel experiences without context switching.
            </p>
          </div>
          <div className="space-y-3">
            <Card variant="glass">
              <CardHeader className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-lg">Delivery & uplift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm text-[var(--text-muted)]">
                  <Metric label="Sent" value="12,394" />
                  <Metric label="Delivered" value="97%" />
                  <Metric label="Read" value="74%" />
                  <Metric label="Uplift" value="+18%" />
                </div>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardHeader className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-lg">Governance & APIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[var(--text-muted)]">
                <p>Per-tenant API keys, webhooks with retries, and audit trails keep developers in control.</p>
                <p>Visual guardrails for resends and compliance-ready templates with approval tracking.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card variant="glass" className="space-y-3">
            <CardHeader>
              <CardTitle className="text-xl">Signals across channels</CardTitle>
              <CardDescription>Live operations status</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Metric label="WhatsApp" value="96% delivery" />
              <Metric label="Email" value="89% open" />
              <Metric label="API uptime" value="99.99%" />
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent>
              <h3 className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Core strengths</h3>
              <div className="space-y-3 mt-3">
                {sections.map((section) => (
                  <div key={section.title} className="rounded-2xl border border-white/10 bg-white/70 dark:bg-slate-900/70 p-3 space-y-1 shadow-inner">
                    <p className="text-[var(--text)] font-semibold">{section.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{section.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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
