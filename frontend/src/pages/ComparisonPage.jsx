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
import { ShieldCheck, BarChart3, Sparkles } from 'lucide-react'

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
      <section className="space-y-4 py-6">
        <Badge variant="secondary" className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Comparison
        </Badge>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">How EngageNinja stacks up</h1>
          <p className="text-lg text-[var(--text-muted)] max-w-3xl">
            EngageNinja keeps multi-channel usage predictable while others hide costs in credits, contact taxes, or ecommerce-only playbooks.
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {comparisons.map((comparison) => (
          <Card key={comparison.competitor} variant="glass" className="h-full border-[var(--border)] shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg font-semibold text-[var(--text)]">EngageNinja vs {comparison.competitor}</CardTitle>
              <CardDescription>{comparison.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Their story</p>
                <ul className="list-disc pl-4 text-sm text-[var(--text-muted)] space-y-1">
                  {comparison.competitorHighlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Our approach</p>
                <ul className="list-disc pl-4 text-sm text-[var(--text-muted)] space-y-1">
                  {comparison.ourHighlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text)]">Winner</span>
                <span className="text-sm text-primary-500 uppercase tracking-[0.2em]">{comparison.winner}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-10 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary-500" />
          <h2 className="text-2xl font-bold text-[var(--text)]">At a glance</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-inner">
          <table className="min-w-full text-sm text-[var(--text-muted)]">
            <thead className="bg-white/40 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Pricing</th>
                <th className="px-4 py-3 text-left">Multi-channel</th>
                <th className="px-4 py-3 text-left">WhatsApp</th>
                <th className="px-4 py-3 text-left">Contact tax</th>
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
        <Card variant="glass" className="p-5 text-sm text-[var(--text-muted)]">
          EngageNinja prioritizes clarity, predictability, and control—so multi-channel teams avoid credit roulette and keep costs steady.
        </Card>
      </section>
    </MarketingShell>
  )
}
