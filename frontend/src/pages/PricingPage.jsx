import React, { useState } from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Alert,
  AlertDescription
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { CreditCard, Sparkles, Lock, Activity, RefreshCw, Check } from 'lucide-react'

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
      <section className="space-y-4 pt-6">
        <Badge variant="primary" className="inline-flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Pricing
        </Badge>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Plans that scale with your audience.</h1>
          <p className="text-lg text-[var(--text-muted)] max-w-3xl">
            Start with the free tier, then pick the package that pairs WhatsApp, Email, and SMS limits with the people and automation you need.
          </p>
        </div>
      </section>

      <section className="flex items-center gap-3 mt-4">
        <span className={`text-sm ${billing === 'monthly' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>Monthly</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={billing === 'yearly'}
            onChange={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
          />
          <span className="w-12 h-6 bg-white/20 border border-[var(--border)] rounded-full peer-focus:outline-none peer-checked:bg-primary-500 transition" />
          <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${billing === 'yearly' ? 'translate-x-6' : ''}`}></span>
        </label>
        <span className={`text-sm ${billing === 'yearly' ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>Yearly (save 2 months)</span>
      </section>

      <section className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.name} variant={tier.popular ? 'glass' : 'solid'} className="relative h-full border-[var(--border)]">
            {tier.popular && (
              <Badge variant="primary" className="absolute -top-3 right-4 text-xs uppercase tracking-[0.3em]">
                Most popular
              </Badge>
            )}
            <CardContent className="pt-6 flex flex-col h-full gap-4">
              <div>
                <p className="text-sm tracking-[0.3em] uppercase text-[var(--text-muted)]">{tier.name}</p>
                <p className="text-3xl font-bold text-[var(--text)] mt-2">{priceFor(tier)}</p>
              </div>
              <ul className="space-y-2 text-sm text-[var(--text-muted)] flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 text-primary-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <PrimaryAction asChild>
                <Link to="/signup" className="w-full text-center px-4 py-3">Choose plan</Link>
              </PrimaryAction>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <Card variant="glass">
          <CardHeader className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <CardTitle>FAQ & clarity</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm text-[var(--text-muted)]">
            {[
              { question: 'Start free?', answer: 'Yes. Free tier covers WhatsApp basics and dashboards.' },
              { question: 'WhatsApp approval included?', answer: 'We guide approvals; Meta reviewer/fees remain.' },
              { question: 'Agency-ready?', answer: 'Pro and Enterprise support multi-tenant agents.' },
              { question: 'Can I switch plans?', answer: 'Upgrade or downgrade any time as volume changes.' }
            ].map((faq) => (
              <div key={faq.question} className="space-y-1">
                <p className="text-[var(--text)] font-semibold">{faq.question}</p>
                <p>{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Alert>
          <AlertDescription>
            Need help selecting a plan? Book a demo and we’ll show the uplift math for your teams.
          </AlertDescription>
        </Alert>
      </section>
    </MarketingShell>
  )
}
