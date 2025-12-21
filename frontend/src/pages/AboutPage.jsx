import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/layout/MarketingShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { Sparkles, Flag, Trophy, Users, Compass } from 'lucide-react'

const values = [
  {
    title: 'Trust first',
    detail: 'We obsess over uptime, compliance, and transparent data handling so your teams never doubt the platform.',
    icon: Compass
  },
  {
    title: 'Velocity everywhere',
    detail: 'Product decisions move fast with short feedback loops, design reviews, and cross-functional ownership.',
    icon: Sparkles
  },
  {
    title: 'Measurable uplift',
    detail: 'Every release tracks KPIs—delivery, read rates, and ROI—so we can prove impact.',
    icon: Trophy
  },
]

const initiatives = [
  {
    title: 'Team',
    copy: 'Product, design, and platform engineers spread across EMEA + Americas to keep the ship moving.'
  },
  {
    title: 'Values',
    copy: 'We ship clarity, move with urgency, and prioritize measurable outcomes for every partner.'
  },
  {
    title: 'Careers',
    copy: 'Open roles coming soon—drop us a note via the demo form to explore collaboration.'
  }
]

export default function AboutPage() {
  return (
    <MarketingShell>
      <div className="space-y-8 py-6">
        <PageHeader
          icon={Users}
          title="Our mission: send with certainty, prove uplift."
          description="We build the WhatsApp-first engagement platform that delivery teams trust for approvals, resend automation, and ROI clarity."
          helper="Remote-first · Product obsessed"
          meta="Trusted by cross-channel agencies and scale-ups"
          actions={
            <>
              <PrimaryAction asChild>
                <Link to="/contact">Book a demo</Link>
              </PrimaryAction>
              <SecondaryAction asChild>
                <Link to="/pricing">See plans</Link>
              </SecondaryAction>
            </>
          }
        />

        <section className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
          <Card variant="glass" className="space-y-4">
            <CardHeader className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-primary-500" />
              <CardTitle className="text-xl">Why EngageNinja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                We believe revenue teams deserve a single pane for approvals, automation, metrics, and compliance.
                Our roadmap is driven by customers and the need for better WhatsApp + Email + SMS orchestration.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1 rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/60 p-4 shadow-inner">
                  <Badge variant="neutral">Story</Badge>
                  <p className="text-sm font-semibold text-[var(--text)]">Started with empathic campaigns and resilient notifications.</p>
                </div>
                <div className="space-y-1 rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/60 p-4 shadow-inner">
                  <Badge variant="neutral">Positioning</Badge>
                  <p className="text-sm font-semibold text-[var(--text)]">We’re the operational glue between sales, marketing, and growth.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <CardTitle className="text-lg">Values</CardTitle>
              <CardDescription>The pillars that guide every release.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {values.map((value) => {
                const Icon = value.icon
                return (
                  <div key={value.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
                    <Icon className="h-5 w-5 text-primary-500" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{value.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{value.detail}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {initiatives.map((section) => (
            <Card key={section.title} variant="glass" className="space-y-2 border-white/20 bg-white/60 dark:bg-slate-900/60">
              <CardContent className="space-y-2">
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <p className="text-sm text-[var(--text-muted)]">{section.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </MarketingShell>
  )
}
