import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Contacts', to: '/contacts' },
  { label: 'Campaigns', to: '/campaigns' },
  { label: 'Settings', to: '/settings/channels' },
  { label: 'Marketing', to: '/marketing' }
]

export default function AppShell({ title, subtitle, actions, children }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">
                EN
              </div>
              <div>
                <div className="text-lg font-semibold text-white">EngageNinja</div>
                <div className="text-xs text-gray-400">WhatsApp-first engagement</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `hover:text-primary-200 ${isActive ? 'text-primary-200' : 'text-gray-300'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-white">{user?.email}</span>
              <span className="text-xs text-gray-400">Signed in</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'E'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {(title || subtitle || actions) && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              {title && <h1 className="text-3xl font-bold text-white">{title}</h1>}
              {subtitle && <p className="text-gray-300 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        )}
        {children}
      </main>

      <footer className="border-t border-white/10 bg-white/5 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>EngageNinja © 2025</span>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Frontend: 3173</span>
            <span className="text-gray-400">Backend: 5173</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
