import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, Badge } from '../components/ui'

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
      <section className="py-6">
        <Badge variant="primary" className="mb-4">Solutions by industry</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Designed for agencies, SMBs, and specialized teams.</h1>
        <p className="mt-3 text-lg text-[var(--text-muted)] max-w-3xl">Pick your segment, see the before/after, and run WhatsApp + Email flows with resend intelligence.</p>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {segments.map((seg) => (
          <Card key={seg.name} className="h-full">
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-sm text-primary-500">✓</div>
                <h3 className="text-[var(--text)] font-semibold">{seg.name}</h3>
              </div>
              <p className="text-[var(--text-muted)] text-sm mb-3">Use case: {seg.use}</p>
              <div className="text-sm text-[var(--text-muted)] space-y-1">
                <p><span className="text-[var(--text-muted)]">Before:</span> {seg.before}</p>
                <p><span className="text-[var(--text-muted)]">After:</span> {seg.after}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </MarketingShell>
  )
}
