import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, CardDescription, CardTitle, Button, Badge } from '../components/ui'

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
        <section className="grid lg:grid-cols-2 gap-10 items-center py-6">
          <div>
            <Badge variant="primary" className="mb-4">WhatsApp-first customer engagement</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text)] leading-tight">
              Operate like Tomorrow with <span className="text-primary-200">AI-powered</span> WhatsApp campaigns.
            </h1>
            <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl">
              Connect WhatsApp, import contacts, send campaigns, and resend to non-readers—all in one streamlined workspace. Real-time metrics keep your team aligned.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/signup" className="px-6 py-3">Start free</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/login" className="px-6 py-3">View dashboard</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent>
                    <div className="text-2xl font-semibold text-[var(--text)]">{stat.value}</div>
                    <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -right-6 h-40 w-40 bg-primary-500/30 rounded-full blur-3xl" aria-hidden></div>
            <Card className="backdrop-blur rounded-2xl shadow-lg border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Demo tenant</p>
                  <p className="text-xl font-semibold text-[var(--text)]">Campaigns overview</p>
                </div>
                <Badge variant="primary">Live</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Active campaigns" value="4" />
                <StatCard label="Read rate" value="62%" />
                <StatCard label="Responses" value="318" />
                <StatCard label="Resends queued" value="89" />
              </div>
            </Card>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4 mt-10">
          {features.map((feat) => (
            <Card key={feat.text}>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-sm text-primary-500 shrink-0">
                    <span className="leading-none">{feat.icon}</span>
                  </div>
                  <p className="text-[var(--text)] font-semibold leading-snug m-0">{feat.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
    </MarketingShell>
  )
}

function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
        <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
      </CardContent>
    </Card>
  )
}
