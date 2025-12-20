import React from 'react'
import { Link } from 'react-router-dom'

export default function MarketingPage() {
  const pricing = [
    { name: 'Starter', price: '$49/mo', features: ['2,000 WhatsApp msgs', 'Email included', 'Basic templates', '1 workspace'] },
    { name: 'Growth', price: '$129/mo', features: ['10,000 WhatsApp msgs', 'AI copy assist', 'Template sync', '2 workspaces'] },
    { name: 'Scale', price: '$299/mo', features: ['50,000 WhatsApp msgs', 'Priority support', 'Advanced webhooks', 'Multi-tenant'] },
  ]

  const faqs = [
    { q: 'How do I connect WhatsApp?', a: 'Use Settings → Channels to add your Meta credentials; we validate and sync templates.' },
    { q: 'Do you support email?', a: 'Yes—connect SES or Brevo in Settings and send mixed-channel campaigns.' },
    { q: 'Is AI required?', a: 'No—AI is optional. You can write your own copy or use templates.' },
  ]

  return (
    <div className="min-h-screen text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">EN</div>
            <div>
              <div className="text-lg font-semibold text-white">EngageNinja</div>
              <div className="text-xs text-gray-400">WhatsApp-first engagement</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/marketing" className="text-gray-300 hover:text-white">Product</Link>
            <a href="#pricing" className="text-gray-300 hover:text-white">Pricing</a>
            <a href="#faq" className="text-gray-300 hover:text-white">FAQ</a>
            <Link to="/login" className="text-gray-300 hover:text-white">Sign in</Link>
            <Link to="/signup" className="btn-primary">Get started</Link>
          </nav>
        </header>

        <section className="grid md:grid-cols-2 gap-6 mb-12" id="pricing">
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-3">Pricing built for growth</h2>
            <p className="text-gray-300">Choose a plan that scales with your WhatsApp volume and team size.</p>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {pricing.map((tier) => (
                <div key={tier.name} className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <p className="text-sm text-gray-300">{tier.name}</p>
                  <p className="text-2xl font-bold text-white mt-1">{tier.price}</p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-300">
                    {tier.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-3">What’s included</h2>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>• WhatsApp and Email channels with template support</li>
              <li>• AI-assisted copy generation (Claude) — optional</li>
              <li>• One-click resend to non-readers</li>
              <li>• CSV import/export, tagging, consent management</li>
              <li>• Webhooks and SSE for real-time metrics</li>
              <li>• Multi-tenant workspaces and roles</li>
            </ul>
            <div className="mt-4 flex gap-3">
              <Link to="/signup" className="btn-primary">Start free</Link>
              <Link to="/login" className="btn-secondary">Talk to us</Link>
            </div>
          </div>
        </section>

        <section className="card mb-12" id="faq">
          <h2 className="text-2xl font-bold text-white mb-4">FAQ</h2>
          <div className="space-y-4">
            {faqs.map((item) => (
              <div key={item.q}>
                <p className="text-white font-semibold">{item.q}</p>
                <p className="text-gray-300 text-sm mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Ready to engage smarter?</h3>
          <p className="text-gray-300 mb-4">Sign up in minutes. Connect WhatsApp. Launch your first campaign today.</p>
          <div className="flex justify-center gap-3">
            <Link to="/signup" className="btn-primary px-6 py-3">Start now</Link>
            <Link to="/login" className="btn-secondary px-6 py-3">View dashboard</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
