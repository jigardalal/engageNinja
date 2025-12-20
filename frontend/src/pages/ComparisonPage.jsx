import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '../components/ui'

const comparisons = [
  {
    competitor: 'Brevo',
    summary: 'Brevo is email-first while SMS and WhatsApp become credits that can bloat as you scale.',
    competitorHighlights: [
      'Email-first pricing',
      'SMS & WhatsApp sold as credits',
      'Can become confusing at scale',
    ],
    ourHighlights: [
      'Clear per-channel limits',
      'SMS included + overage',
      'WhatsApp capped + opt-in',
      'Built for SaaS & agencies',
    ],
    winner: 'EngageNinja for predictable multi-channel usage',
  },
  {
    competitor: 'Klaviyo',
    summary: 'Klaviyo charges by contacts and leans heavily on ecommerce, while EngageNinja keeps flat pricing for growing lists.',
    competitorHighlights: [
      'Charges by contacts',
      'Excellent ecommerce features',
      'SMS credits burn quickly',
    ],
    ourHighlights: [
      'No per-contact tax',
      'Flat monthly pricing',
      'API-first, non-ecommerce friendly',
    ],
    winner: 'EngageNinja for growing lists and non-ecommerce use cases',
  },
  {
    competitor: 'Omnisend',
    summary: 'Omnisend is ecommerce focused with limited WhatsApp support, while EngageNinja plays nicely with agencies and platforms.',
    competitorHighlights: [
      'Ecommerce focused',
      'SMS credits included',
      'Limited WhatsApp support',
    ],
    ourHighlights: [
      'Multi-tenant & API driven',
      'WhatsApp via Meta Cloud API',
      'Better fit for agencies & SaaS',
    ],
    winner: 'EngageNinja for flexibility and platform use',
  },
]

const comparisonSummary = [
  { platform: 'EngageNinja', pricing: 'Low', multiChannel: '✅', whatsapp: '✅', perContact: '❌' },
  { platform: 'Brevo', pricing: 'Medium', multiChannel: '✅', whatsapp: 'Add-on', perContact: '❌' },
  { platform: 'Klaviyo', pricing: 'High', multiChannel: '✅', whatsapp: 'Paid', perContact: '✅' },
  { platform: 'Omnisend', pricing: 'Medium', multiChannel: '✅', whatsapp: 'Limited', perContact: '✅' },
]

export default function ComparisonPage() {
  return (
    <MarketingShell>
      <section className="py-6 space-y-4">
        <Badge variant="secondary">Comparison</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">How EngageNinja stacks up</h1>
        <p className="text-lg text-[var(--text-muted)] max-w-3xl">
          Make decisions fast by seeing where EngageNinja keeps things predictable while other platforms
          rely on credit pricing, contact tax, or ecommerce-first journeys. Pick the path that keeps
          your multi-channel messaging under control.
        </p>
      </section>

      <div className="grid gap-6 mt-8 md:grid-cols-3">
        {comparisons.map((comparison) => (
          <Card key={comparison.competitor} className="relative h-full overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-[var(--text)]">
                EngageNinja vs {comparison.competitor}
              </CardTitle>
              <CardDescription className="text-sm">{comparison.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Their take</p>
                <ul className="list-disc pl-4 text-sm text-[var(--text-muted)] space-y-1">
                  {comparison.competitorHighlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Our approach</p>
                <ul className="list-disc pl-4 text-sm text-[var(--text-muted)] space-y-1">
                  {comparison.ourHighlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-[var(--text)]">
                <span>Winner</span>
                <span className="text-sm text-primary-500">{comparison.winner}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-bold text-[var(--text)]">At a glance</h2>
        <div className="overflow-x-auto border border-[var(--border)] rounded-2xl bg-[var(--card)]">
          <table className="w-full text-sm text-[var(--text-muted)]">
            <thead className="bg-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Pricing complexity</th>
                <th className="px-4 py-3 text-left">Multi-channel</th>
                <th className="px-4 py-3 text-left">WhatsApp</th>
                <th className="px-4 py-3 text-left">Per-contact pricing</th>
              </tr>
            </thead>
            <tbody>
              {comparisonSummary.map((row) => (
                <tr key={row.platform} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-semibold text-[var(--text)]">{row.platform}</td>
                  <td className="px-4 py-3">{row.pricing}</td>
                  <td className="px-4 py-3">{row.multiChannel}</td>
                  <td className="px-4 py-3">{row.whatsapp}</td>
                  <td className="px-4 py-3">{row.perContact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          EngageNinja focuses on <strong>clarity</strong>, <strong>predictability</strong>, and <strong>control</strong>—so you can run multi-channel campaigns without playing credit roulette.
        </p>
      </section>
    </MarketingShell>
  )
}
