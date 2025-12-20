import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const stats = [
    { label: 'Delivery rate', value: '98.2%' },
    { label: 'Read uplift', value: '+34%' },
    { label: 'Teams onboarded', value: '120+' }
  ]

  const features = [
    'WhatsApp-first UX with template support',
    'AI-assisted copy for faster campaigns',
    'One-click resend to non-readers',
    'Real-time metrics & SSE updates',
    'Multi-tenant roles and permissions',
    'CSV import/export with tagging'
  ]

  return (
    <div className="min-h-screen text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">EN</div>
            <div>
              <div className="text-lg font-semibold text-white">EngageNinja</div>
              <div className="text-xs text-gray-400">WhatsApp-first engagement</div>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/marketing" className="text-gray-300 hover:text-white">Product</Link>
            <Link to="/marketing#pricing" className="text-gray-300 hover:text-white">Pricing</Link>
            <Link to="/marketing#faq" className="text-gray-300 hover:text-white">FAQ</Link>
            <Link to="/login" className="text-gray-300 hover:text-white">Sign in</Link>
            <Link to="/signup" className="btn-primary">Get started</Link>
          </nav>
        </header>

        <section className="grid lg:grid-cols-2 gap-10 items-center py-6">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-primary-100 text-sm font-semibold mb-4">WhatsApp-first customer engagement</div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Operate like Tomorrow with <span className="text-primary-200">AI-powered</span> WhatsApp campaigns.
            </h1>
            <p className="mt-4 text-lg text-gray-300 max-w-2xl">
              Connect WhatsApp, import contacts, send campaigns, and resend to non-readers—all in one streamlined workspace. Real-time metrics keep your team aligned.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary px-6 py-3">Start free</Link>
              <Link to="/login" className="btn-secondary px-6 py-3">View dashboard</Link>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="card">
                  <div className="text-2xl font-semibold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -right-6 h-40 w-40 bg-primary-500/30 rounded-full blur-3xl" aria-hidden></div>
            <div className="bg-white/10 backdrop-blur rounded-2xl shadow-lg border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-300">Demo tenant</p>
                  <p className="text-xl font-semibold text-white">Campaigns overview</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 text-primary-100 text-xs font-semibold">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card">
                  <p className="text-sm text-gray-400">Active campaigns</p>
                  <p className="text-2xl font-bold text-white">4</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-400">Read rate</p>
                  <p className="text-2xl font-bold text-white">62%</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-400">Responses</p>
                  <p className="text-2xl font-bold text-white">318</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-400">Resends queued</p>
                  <p className="text-2xl font-bold text-white">89</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mt-10">
          {features.map((feat) => (
            <div key={feat} className="card flex items-start gap-3">
              <span className="text-primary-200 text-xl">✓</span>
              <p className="text-gray-100 font-medium">{feat}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
