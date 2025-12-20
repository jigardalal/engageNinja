import React, { useState } from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from '../components/ui'

const tiers = [
  {
    id: 'free',
    name: 'Free Plan',
    popular: false,
    price: 0,
    features: [
      '50 WhatsApp messages/mo',
      '500 Email messages/mo',
      '1 seat, 50 contacts',
      '25 SMS credits/mo',
      'Community support & basic dashboards',
    ],
  },
  {
    id: 'starter',
    name: 'Starter Plan',
    popular: false,
    price: 49,
    features: [
      '250 WhatsApp + 10,000 Email messages/mo',
      'Up to 3 seats & 500 contacts',
      '500 SMS credits/mo',
      'Simple resend workflows',
      'Email support & onboarding guidance',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    popular: true,
    price: 129,
    features: [
      '1,000 WhatsApp + 50,000 Email messages/mo',
      '10 seats & 5,000 contacts',
      '2,000 SMS credits/mo',
      'AI-assisted campaign generation',
      'API & webhook access with uplift analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    popular: false,
    price: 299,
    features: [
      '5,000 WhatsApp + 200,000 Email messages/mo',
      '25 seats & 10,000 contacts',
      '10,000 SMS credits/mo',
      'Multi-tenant agency ops + impersonation',
      'API & AI-powered workflows with priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    popular: false,
    price: 999,
    features: [
      '20,000+ WhatsApp & 500,000+ Email messages/mo',
      '50+ seats, 25,000+ contacts, 25,000+ SMS',
      'Dedicated CSM, SSO, SLAs, data residency',
      'Full API access & advanced AI copilots',
      'Custom onboarding & analytics',
    ],
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly')

  const priceFor = (tier) => {
    if (tier.price === null) return 'Custom'
    if (tier.price === 0) return 'Free'
    const val = billing === 'monthly' ? tier.price : Math.round(tier.price * 10)
    return `$${val}/${billing === 'monthly' ? 'mo' : 'yr'}`
  }

  return (
    <MarketingShell>
      <section className="py-6">
        <Badge variant="primary" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Plans for every team.</h1>
        <p className="mt-3 text-lg text-[var(--text-muted)] max-w-3xl">Start free, then pick the tier that matches your volume and support needs.</p>
      </section>

      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm ${billing === 'monthly' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>Monthly</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={billing === 'yearly'} onChange={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')} />
          <div className="w-12 h-6 glass rounded-full peer-focus:outline-none peer peer-checked:bg-primary-500 transition"></div>
          <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${billing === 'yearly' ? 'translate-x-6' : ''}`}></div>
        </label>
        <span className={`text-sm ${billing === 'yearly' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>Yearly</span>
      </div>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" id="pricing">
        {tiers.map((tier) => (
          <Card key={tier.name} className={`h-full relative ${tier.popular ? 'border-primary-400/50 shadow-xl' : ''}`}>
            {tier.popular && <span className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-primary-500 text-[var(--text)] text-xs font-semibold">Most popular</span>}
            <CardContent className="pt-6 space-y-0 flex flex-col gap-3 h-full">
              <div>
                <div className="text-sm text-[var(--text-muted)]">{tier.name}</div>
                <div className="text-3xl font-bold text-[var(--text)] mt-1">{priceFor(tier)}</div>
              </div>
              <ul className="space-y-1 text-sm text-[var(--text-muted)] flex-1">
                {tier.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link to="/signup">Choose plan</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-[var(--text-muted)]">
            <div>
              <p className="text-[var(--text)] font-semibold">Can I start for free?</p>
              <p className="text-[var(--text-muted)] mt-1">Yes. Use the Free tier to test WhatsApp with basic dashboards.</p>
            </div>
            <div>
              <p className="text-[var(--text)] font-semibold">Is WhatsApp approval included?</p>
              <p className="text-[var(--text-muted)] mt-1">We guide template approval; Meta fees/approval still apply.</p>
            </div>
            <div>
              <p className="text-[var(--text)] font-semibold">Do you support agencies?</p>
              <p className="text-[var(--text-muted)] mt-1">Yes—Agency/Pro includes multi-tenant and impersonation.</p>
            </div>
            <div>
              <p className="text-[var(--text)] font-semibold">Can I upgrade/downgrade anytime?</p>
              <p className="text-[var(--text-muted)] mt-1">Yes. Switch plans as your volume changes.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MarketingShell>
  )
}
