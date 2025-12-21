import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '../components/ui'
import { Sparkles, Puzzle, Globe, ShieldCheck, Star } from 'lucide-react'

const segments = [
  { name: 'Agencies', use: 'Client broadcast + uplift reporting', before: 'Manual sends, no uplift view', after: 'Template reuse, tenant switching, uplift cards' },
  { name: 'E-commerce', use: 'Restock drops, abandon cart nudges', before: 'One-off blasts', after: 'Resend to non-readers, AI copy per segment' },
  { name: 'Education', use: 'Admissions reminders, parent updates', before: 'Email-only and delayed', after: 'Instant WhatsApp reach, read tracking' },
  { name: 'Real Estate', use: 'New listings, viewing reminders', before: 'Spreadsheet blasts', after: 'Tags, resend-only, uplift proof' },
  { name: 'Healthcare', use: 'Appointment reminders, follow-ups', before: 'Phone calls, missed comms', after: 'WhatsApp reminders, delivery/read visibility' },
  { name: 'SaaS/Startups', use: 'Product updates, onboarding', before: 'Low engagement emails', after: 'Mixed channel, resend automation' },
]

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <section className="space-y-3 pb-6">
        <Badge variant="primary" className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Solutions by industry
        </Badge>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">
            Designed for agencies, SMBs, and specialized teams that need more than one channel.
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-3xl">
            Select your segment to preview the before and after: faster approvals, resend intelligence, AI-assisted copy, and verified delivery metrics on every surface.
          </p>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.3fr,0.7fr] gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          {segments.map((seg) => (
            <Card variant="glass" key={seg.name} className="h-full">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" className="text-xs">{seg.name}</Badge>
                  </div>
                  <Badge variant="primary">Use case</Badge>
                </div>
                <p className="text-sm text-[var(--text-muted)]">Use: {seg.use}</p>
                <div className="space-y-1 text-sm text-[var(--text-muted)]">
                  <p><span className="font-semibold text-[var(--text)]">Before:</span> {seg.before}</p>
                  <p><span className="font-semibold text-[var(--text)]">After:</span> {seg.after}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card variant="glass" className="space-y-4">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Puzzle className="h-5 w-5 text-primary-500" />
              <CardTitle className="text-xl">Execution pillars</CardTitle>
            </div>
            <CardDescription className="text-[var(--text-muted)]">
              Templates, workflows, and telemetry tuned for every segment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-primary-500" />
              <p className="text-sm text-[var(--text-muted)]">Global send limits, localized templates, and compliance-ready approvals.</p>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary-500" />
              <p className="text-sm text-[var(--text-muted)]">Template governance, webhook reliability, and multi-tenant roles that separate platform and tenant scopes.</p>
            </div>
            <div className="flex items-center gap-3">
              <Star className="h-4 w-4 text-primary-500" />
              <p className="text-sm text-[var(--text-muted)]">AI-assisted copy & resend rules that keep engagement high while protecting guardrails.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  )
}
