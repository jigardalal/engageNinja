import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui'

const links = [
  { to: '/platform', label: 'Platform' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/comparison', label: 'Comparison' },
  { to: '/resources', label: 'Resources' },
  { to: '/security', label: 'Security' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const { isAuthenticated, loading, logout, user, tenants = [], activeTenant, switchTenant } = useAuth()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
      <path d="M4 20c0-3.314 3.134-6 7-6h2c3.866 0 7 2.686 7 6v1H4v-1z" />
    </svg>
  )
  const hasMultipleTenants = tenants.length > 1
  const activeTenantInfo = tenants.find(t => t.tenant_id === activeTenant)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)] backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">EN</div>
            <div>
              <div className="text-lg font-semibold text-[var(--text)]">EngageNinja</div>
              <div className="text-xs text-[var(--text-muted)]">WhatsApp-first engagement</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium overflow-x-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `hover:text-primary-500 ${isActive ? 'text-primary-500' : 'text-[var(--text-muted)]'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:text-primary-500"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <div className="hidden sm:flex items-center gap-3 text-sm font-medium">
            {loading ? (
              <span className="text-[var(--text-muted)]">Checking session...</span>
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  className="h-10 w-10 rounded-full border border-[var(--border)] bg-gradient-to-br from-primary-500/90 to-primary-300/90 text-white flex items-center justify-center shadow-md"
                  aria-label="Open account menu"
                  onClick={() => setMenuOpen(prev => !prev)}
                >
                  <UserIcon />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl backdrop-blur p-2 z-40">
                    <div className="px-2 py-2 border-b border-[var(--border)]">
                      <p className="text-sm font-semibold text-[var(--text)]">{user?.name || user?.email || 'Signed in'}</p>
                      {activeTenantInfo && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">Tenant: {activeTenantInfo.name}</p>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 text-sm text-[var(--text)]"
                        onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
                      >
                        Dashboard
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 text-sm text-[var(--text)]"
                        onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                      >
                        Profile
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 text-sm text-[var(--text)]"
                        onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                      >
                        Tenant Settings
                      </button>
                      {hasMultipleTenants && (
                        <div className="mt-1">
                          <p className="px-3 pb-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">Switch tenant</p>
                          <div className="grid gap-1">
                            {tenants.map((tenant) => (
                              <button
                                key={tenant.tenant_id}
                                className={`w-full text-left px-3 py-2 rounded-lg border ${
                                  tenant.tenant_id === activeTenant
                                    ? 'border-primary-200/70 text-primary-600'
                                    : 'border-[var(--border)] text-[var(--text)] hover:border-primary-200/70 hover:text-primary-600'
                                }`}
                                onClick={() => { switchTenant(tenant.tenant_id); setMenuOpen(false); }}
                              >
                                {tenant.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                        onClick={() => { setMenuOpen(false); handleLogout(); }}
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-[var(--text-muted)] hover:text-primary-500">Log in</Link>
                <Link to="/signup" className="btn-primary">Start Free</Link>
              </>
            )}
          </div>
          <button
            className="md:hidden p-2 rounded-lg border border-[var(--border)] text-[var(--text)]"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)] backdrop-blur">
          <div className="px-4 py-3 space-y-3 text-sm font-medium text-[var(--text)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">EN</div>
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">EngageNinja</div>
                <div className="text-xs text-[var(--text-muted)]">WhatsApp-first engagement</div>
              </div>
            </div>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block px-2 py-2 rounded ${isActive ? 'bg-white/10 text-primary-500' : 'text-[var(--text)] hover:bg-white/10'}`
                }
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            {loading ? (
              <span className="text-[var(--text-muted)]">Checking session...</span>
            ) : isAuthenticated ? (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/10 text-[var(--text)] flex items-center justify-center text-sm font-semibold">
                    <UserIcon />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)]">{user?.name || user?.email || 'Signed in'}</div>
                    {activeTenantInfo && <div className="text-xs text-[var(--text-muted)]">Tenant: {activeTenantInfo.name}</div>}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Link to="/dashboard" className="btn-primary w-full text-center" onClick={() => setOpen(false)}>Dashboard</Link>
                  <Link to="/profile" className="btn-secondary w-full text-center" onClick={() => setOpen(false)}>Profile</Link>
                  <Link to="/settings" className="btn-secondary w-full text-center" onClick={() => setOpen(false)}>Tenant Settings</Link>
                  {hasMultipleTenants && tenants.map((tenant) => (
                    <button
                      key={tenant.tenant_id}
                      className={`w-full text-left px-3 py-2 rounded-lg border ${
                        tenant.tenant_id === activeTenant
                          ? 'border-primary-200/70 text-primary-600'
                          : 'border-[var(--border)] text-[var(--text)] hover:border-primary-200/70 hover:text-primary-600'
                      }`}
                      onClick={() => { switchTenant(tenant.tenant_id); setOpen(false); }}
                    >
                      Switch to {tenant.name}
                    </button>
                  ))}
                  <button className="btn-secondary w-full text-center" onClick={() => { setOpen(false); handleLogout(); }}>Log out</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link to="/login" className="btn-secondary w-full text-center" onClick={() => setOpen(false)}>Log in</Link>
                <Link to="/signup" className="btn-primary w-full text-center" onClick={() => setOpen(false)}>Start Free</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
