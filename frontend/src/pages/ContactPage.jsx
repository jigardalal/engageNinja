import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/layout/MarketingShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Label,
  Input,
  Select
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { MessageSquare, Phone, CalendarCheck, Users } from 'lucide-react'

const quickTiles = [
  {
    title: 'Live support',
    copy: 'M-F 9a-5p PT · Slack + email',
    icon: Phone
  },
  {
    title: 'Demo booking',
    copy: '30-minute walkthrough + uplift plan',
    icon: CalendarCheck
  },
  {
    title: 'Partner success',
    copy: 'Dedicated success teams for agency workspaces',
    icon: Users
  }
]

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="space-y-8 py-6">
        <PageHeader
          icon={MessageSquare}
          title="Talk to us or book a demo."
          description="Share your use case and we’ll coordinate approvals, WhatsApp connections, and ROI proof."
          helper="Response within one business day"
          meta="Need a quick answer? Ping support@engageninja.com"
          actions={
            <>
              <PrimaryAction asChild>
                <Link to="/signup">Start free</Link>
              </PrimaryAction>
              <SecondaryAction asChild>
                <Link to="/pricing">See pricing</Link>
              </SecondaryAction>
            </>
          }
        />

        <section className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <CardTitle>Tell us about your team</CardTitle>
              <CardDescription>We’ll respond with a tailored walkthrough.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="Full name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="team@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input placeholder="Company" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select>
                      <option>Role</option>
                      <option>Agency</option>
                      <option>Operations</option>
                      <option>Growth</option>
                      <option>Other</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Use case</Label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    placeholder="Share workflows, channels, and goals"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">Book a Demo</Button>
                  <Button variant="secondary" type="button">
                    Request Pricing
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <CardTitle>Need an immediate answer?</CardTitle>
              <CardDescription>We support decision-makers across time zones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickTiles.map((tile) => {
                const Icon = tile.icon
                return (
                  <div key={tile.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/60 px-4 py-3 shadow-inner">
                    <Icon className="h-5 w-5 text-primary-500" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{tile.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{tile.copy}</p>
                    </div>
                  </div>
                )
              })}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/10 via-white/0 to-transparent p-4 text-sm text-[var(--text)]">
                <p className="font-semibold">Support@engageninja.com</p>
                <p className="text-xs text-[var(--text-muted)]">For billing or setup notes, send attachments or questions here.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MarketingShell>
  )
}
