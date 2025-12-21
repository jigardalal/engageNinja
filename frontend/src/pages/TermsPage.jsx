import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/layout/MarketingShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { Scale, ShieldCheck, FileWarning, Handshake } from 'lucide-react'

const termsSections = [
  {
    title: 'Scope of use',
    icon: ShieldCheck,
    copy: 'Use EngageNinja for your organization’s WhatsApp, SMS, and email campaigns while respecting plan limits and contact opt-in status.'
  },
  {
    title: 'Content responsibility',
    icon: FileWarning,
    copy: 'You are responsible for disclosures, consent language, and compliance with messaging laws in each region you operate.'
  },
  {
    title: 'Limitations',
    icon: Handshake,
    copy: 'We are not liable for indirect damages—disputes follow the arbitration clause and localized governing law.'
  },
]

export default function TermsPage() {
  return (
    <MarketingShell>
      <div className="space-y-8 py-6">
        <PageHeader
          icon={Scale}
          title="Terms of service."
          description="These terms explain how you may use EngageNinja and describe mutual responsibilities for platform and tenant users."
          helper="Platform vs Tenant scope remains unchanged"
          meta="Service availability, uptime, and acceptable use are summarized below."
          actions={
            <>
              <PrimaryAction asChild>
                <Link to="/contact">Talk to sales</Link>
              </PrimaryAction>
              <SecondaryAction asChild>
                <Link to="/privacy">Review our privacy promises</Link>
              </SecondaryAction>
            </>
          }
        />

        <section className="grid md:grid-cols-3 gap-4">
          {termsSections.map((section) => {
            const Icon = section.icon
            return (
              <Card variant="glass" key={section.title} className="space-y-3">
                <CardHeader className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary-500" />
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[var(--text-muted)]">
                  <p>{section.copy}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Service expectations</CardTitle>
              <CardDescription>Availability & billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--text-muted)]">
              <p>Uptime commitments, incident response, and plan limits are honored within the defined SLA.</p>
              <p>Billing disputes are resolved through our support channels, with refunds considered per plan.</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Policy updates</CardTitle>
              <CardDescription>How we share changes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--text-muted)]">
              <p>We notify admins via email and in-product banners when the terms change.</p>
              <p>Changes take effect 30 days after notice unless legal requirements demand immediate action.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </MarketingShell>
  )
}
