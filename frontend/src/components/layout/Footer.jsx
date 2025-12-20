import React from 'react'
import { Link } from 'react-router-dom'

const sections = {
  Product: [
    { to: '/platform', label: 'Platform' },
    { to: '/solutions', label: 'Solutions' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/comparison', label: 'Comparison' },
  ],
  Company: [
    { to: '/about', label: 'About' },
    { to: '/security', label: 'Security' },
    { to: '/contact', label: 'Contact' },
  ],
  Resources: [
    { to: '/resources', label: 'Resources' },
    { to: '/pricing#faq', label: 'FAQ' },
  ],
  Legal: [
    { to: '/privacy', label: 'Privacy' },
    { to: '/terms', label: 'Terms' },
  ]
}

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] backdrop-blur mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-6 gap-6 text-sm text-[var(--text-muted)]">
        <div className="col-span-2 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">EN</div>
            <div>
              <div className="text-lg font-semibold text-[var(--text)]">EngageNinja</div>
              <div className="text-xs text-[var(--text-muted)]">WhatsApp-first engagement</div>
            </div>
          </div>
          <p>Send with certainty. Resend with intelligence. Prove uplift.</p>
        </div>
        {Object.entries(sections).map(([title, links]) => (
          <div key={title} className="md:col-span-1">
            <div className="text-[var(--text)] font-semibold mb-2">{title}</div>
            <div className="space-y-1">
              {links.map((l) => (
                <Link key={l.label} to={l.to} className="block text-[var(--text-muted)] hover:text-primary-500">{l.label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 text-xs text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span>EngageNinja © 2025</span>
        <div className="flex items-center gap-3 text-[var(--text)]">
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:text-primary-500 hover:border-primary-200/70" aria-label="LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.24 8h4.52v13.99H.24zM8.97 8h4.33v1.92h.06c.6-1.13 2.06-2.32 4.25-2.32 4.55 0 5.39 2.98 5.39 6.85v7.54h-4.52v-6.69c0-1.6-.03-3.66-2.23-3.66-2.23 0-2.57 1.74-2.57 3.54v6.81H8.97z"/></svg>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:text-primary-500 hover:border-primary-200/70" aria-label="X">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26L22.5 21.75h-6.531l-5.12-6.701-5.853 6.701H1.69l7.73-8.858L1.5 2.25h6.656l4.62 6.056 5.468-6.056zm-1.162 17.52h1.833L7.084 4.126H5.117l11.965 15.644z"/></svg>
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:text-primary-500 hover:border-primary-200/70" aria-label="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm11 1a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z"/></svg>
          </a>
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:text-primary-500 hover:border-primary-200/70" aria-label="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10h2.5l.5-3H13V5.5c0-.867.176-1.5 1.5-1.5H16V1.14C15.464 1.097 14.42 1 13.21 1 10.642 1 9 2.657 9 5.3V7H6v3h3v9h4v-9z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
