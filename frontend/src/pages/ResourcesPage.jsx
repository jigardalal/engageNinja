import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '../components/ui'

const posts = [
  { title: 'WhatsApp Marketing 101', tag: 'Guide' },
  { title: 'Resend Uplift Playbook', tag: 'Playbook' },
  { title: 'API Quickstart', tag: 'Developers' },
]

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <section className="py-6">
        <Badge variant="primary" className="mb-4">Resources</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Guides, webinars, and docs.</h1>
        <p className="mt-3 text-lg text-[var(--text-muted)] max-w-3xl">Learn how to launch WhatsApp + Email campaigns, build uplift playbooks, and integrate with APIs.</p>
      </section>

      <section className="grid md:grid-cols-3 gap-4 mt-6">
        {posts.map((p) => (
          <Card key={p.title}>
            <CardContent>
              <span className="text-xs text-primary-500 uppercase">{p.tag}</span>
              <h3 className="text-[var(--text)] font-semibold mt-2">{p.title}</h3>
              <p className="text-sm text-[var(--text-muted)] mt-2">Coming soon</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Webinars & Case Studies</CardTitle>
          <CardDescription>Register for upcoming sessions and see how teams prove uplift.</CardDescription>
        </CardHeader>
      </Card>
    </MarketingShell>
  )
}
