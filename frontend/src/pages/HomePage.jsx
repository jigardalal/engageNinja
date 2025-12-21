import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/layout/MarketingShell'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Button
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { Sparkles, Zap, Users, MessageSquare, Star } from 'lucide-react'

export default function HomePage() {
  const stats = [
    { label: 'Delivery rate', value: '98.2%' },
    { label: 'Read uplift', value: '+34%' },
    { label: 'Teams onboarded', value: '120+' }
  ]

  const features = [
    { icon: '📱', text: 'WhatsApp-first UX with template support' },
    { icon: '🤖', text: 'AI-assisted copy for faster campaigns' },
    { icon: '🔁', text: 'One-click resend to non-readers' },
    { icon: '📊', text: 'Real-time metrics & SSE updates' },
    { icon: '👥', text: 'Multi-tenant roles and permissions' },
    { icon: '📂', text: 'CSV import/export with tagging' }
  ]

  return (
    <MarketingShell>
      <section className="grid xl:grid-cols-[1.2fr,0.8fr] gap-10 items-center py-6">
        <div className="space-y-6">
          <Badge variant="primary" className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            WhatsApp-first engagement
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text)] leading-tight">
              Operate like tomorrow with a <span className="text-primary-200">connected AI</span> workspace for WhatsApp, email, and resends.
            </h1>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl">
              Connect WhatsApp, email, and automation flows into a unified workspace. Send campaigns, resend to non-readers, and track live metrics through SSE-powered insight panels.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PrimaryAction asChild>
              <Link to="/signup" className="px-6 py-3">Start free</Link>
            </PrimaryAction>
            <SecondaryAction asChild>
              <Link to="/login" className="px-6 py-3">View workspace</Link>
            </SecondaryAction>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} variant="glass">
                <CardContent className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">{stat.label}</p>
                  <p className="text-2xl font-bold text-[var(--text)]">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card variant="glass" className="backdrop-blur border-white/10 shadow-xl">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Live Demo</p>
                <p className="text-xl font-semibold text-[var(--text)]">Campaign Control Room</p>
              </div>
              <Badge variant="primary" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Live
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Active campaigns" value="4" icon={<Users className="h-4 w-4 text-primary-500" />} />
              <StatCard label="Read rate" value="62%" icon={<MessageSquare className="h-4 w-4 text-primary-500" />} />
              <StatCard label="Responses" value="318" icon={<Sparkles className="h-4 w-4 text-primary-500" />} />
              <StatCard label="Resends queued" value="89" icon={<Zap className="h-4 w-4 text-primary-500" />} />
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              Real-time SSE metrics keep your team aligned with delivery, reads, and resends.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[var(--text)]">What teams love</h2>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.4em]">{features.length} pillars</Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feat) => (
            <Card key={feat.text} variant="glass">
              <CardContent className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center text-lg">
                  {feat.icon}
                </div>
                <div>
                  <p className="text-[var(--text)] font-semibold">{feat.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <Card variant="glass">
      <CardContent className="space-y-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
      </CardContent>
    </Card>
  )
}
