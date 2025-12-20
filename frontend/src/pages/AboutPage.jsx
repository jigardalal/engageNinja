import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '../components/ui'

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="py-6">
        <Badge variant="primary" className="mb-4">About</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Our mission: send with certainty, prove uplift.</h1>
        <p className="mt-3 text-lg text-[var(--text-muted)] max-w-3xl">We’re building the WhatsApp-first engagement platform for teams that need delivery, resend, and ROI visibility in one place.</p>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>Team cards coming soon.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Values</CardTitle>
          <CardDescription>Trust, velocity, and measurable outcomes for every campaign.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Careers</CardTitle>
          <CardDescription>Join us—open roles coming soon. Contact us via the demo form.</CardDescription>
        </CardHeader>
      </Card>
    </MarketingShell>
  )
}
