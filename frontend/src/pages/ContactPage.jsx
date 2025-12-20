import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '../components/ui'

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className="py-6">
        <div className="inline-flex items-center px-3 py-1 rounded-full glass text-primary-500 text-sm font-semibold mb-4">Contact / Demo</div>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Talk to us or book a demo.</h1>
        <p className="mt-3 text-lg text-[var(--text-muted)] max-w-3xl">Tell us about your use case. We’ll help you connect WhatsApp, sync templates, and prove uplift.</p>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tell us about your use case</CardTitle>
          <CardDescription>We’ll reach out with a tailored walkthrough.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="Email" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input placeholder="Company" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                <option>Role</option>
                <option>Agency</option>
                <option>SMB</option>
                <option>Startup</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Use case</Label>
              <textarea
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                rows="4"
                placeholder="Share details about your workflows, channels, and goals"
              ></textarea>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit">Book a Demo</Button>
              <Button variant="secondary" type="button">Start Free</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MarketingShell>
  )
}
