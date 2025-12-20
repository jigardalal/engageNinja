import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import { Card, CardContent, Badge } from '../components/ui'

export default function SecurityPage() {
  const items = [
    'Encryption and backups',
    'Consent management',
    'Audit logs and impersonation safety',
    'Role-based access',
    'Data retention and deletion policies',
    'GDPR-ready posture (SOC-2 in progress messaging)'
  ]

  return (
    <MarketingShell>
      <section className="py-6">
        <Badge variant="primary" className="mb-4">Security</Badge>
        <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Built with compliance and trust in mind.</h1>
        <p className="mt-3 text-lg text-[var(--text-muted)] max-w-3xl">Data protection, consent handling, auditability, and role-based controls for WhatsApp-first engagement.</p>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {items.map((i) => (
          <Card key={i}>
            <CardContent>
              <h3 className="text-[var(--text)] font-semibold">{i}</h3>
              <p className="text-sm text-[var(--text-muted)] mt-2">Details coming soon.</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </MarketingShell>
  )
}
