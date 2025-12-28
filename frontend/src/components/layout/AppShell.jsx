import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NavPills } from '../ui'
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  HomeIcon,
  IdentificationIcon,
  MegaphoneIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  TagIcon,
  UserGroupIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

const getTenantNavItems = (userRole) => {
  const items = [
    { label: 'Dashboard', to: '/dashboard', icon: HomeIcon },
    { label: 'Contacts', to: '/contacts', icon: UsersIcon },
    { label: 'Campaigns', to: '/campaigns', icon: MegaphoneIcon }
  ]

  // Add admin-only items
  if (userRole && ['admin', 'owner'].includes(userRole)) {
    items.push({ label: 'Usage', to: '/usage', icon: ArrowTrendingUpIcon })
  }

  // Team/Tags/Templates are treated as Settings (accessible via Settings dropdown).

  return items
}

const getAdminNavItems = () => [
  { label: 'Platform Admin', to: '/admin', icon: ShieldCheckIcon, activeWhen: (path) => path === '/admin' },
  { label: 'Tenants', to: '/admin/tenants', icon: BuildingOffice2Icon, activeWhen: (path) => path.startsWith('/admin/tenants') },
  { label: 'Plans', to: '/admin/plans', icon: CreditCardIcon, activeWhen: (path) => path.startsWith('/admin/plans') },
  { label: 'Users', to: '/admin/users', icon: UserGroupIcon, activeWhen: (path) => path.startsWith('/admin/users') },
  { label: 'Audit Logs', to: '/admin/audit-logs', icon: ClipboardDocumentListIcon, activeWhen: (path) => path.startsWith('/admin/audit-logs') },
  { label: 'Tags', to: '/admin/tags', icon: TagIcon, activeWhen: (path) => path.startsWith('/admin/tags') }
]

export default function AppShell({
  title,
  subtitle,
  actions,
  children,
  hideTitleBlock = false,
  hideFooter = false
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, tenants = [], activeTenant, logout, userRole, isPlatformAdmin, hasPlatformRole } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const accountMenuRef = useRef(null)
  const adminMenuRef = useRef(null)
  const tenantMenuRef = useRef(null)
  const settingsMenuRef = useRef(null)
  const activeTenantInfo = tenants.find(t => t.tenant_id === activeTenant)
  const inAdminMode = location.pathname.startsWith('/admin')
  const navItems = inAdminMode ? getAdminNavItems() : getTenantNavItems(userRole)
  const adminShortcuts = [
    { label: 'Admin Console', to: '/admin', icon: ShieldCheckIcon },
    { label: 'Tenants', to: '/admin', icon: BuildingOffice2Icon },
    { label: 'Plans', to: '/admin/plans', icon: CreditCardIcon },
    { label: 'Users', to: '/admin/users', icon: UserGroupIcon },
    { label: 'Audit Logs', to: '/admin/audit-logs', icon: ClipboardDocumentListIcon },
    { label: 'Global Tags', to: '/admin/tags', icon: TagIcon }
  ];
  const tenantShortcuts = [
    { label: 'Tenant Dashboard', to: '/dashboard', icon: HomeIcon },
    { label: 'Contacts', to: '/contacts', icon: UsersIcon },
    { label: 'Campaigns', to: '/campaigns', icon: MegaphoneIcon },
    ...(userRole && ['admin', 'owner'].includes(userRole) ? [{ label: 'Usage', to: '/usage', icon: ArrowTrendingUpIcon }] : []),
    { label: 'Templates', to: '/templates', icon: RectangleStackIcon },
    { label: 'Settings', to: '/settings', icon: Cog6ToothIcon }
  ]
  const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
      <path d="M4 20c0-3.314 3.134-6 7-6h2c3.866 0 7 2.686 7 6v1H4v-1z" />
    </svg>
  )

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    navigate('/login')
  }

  const canSeeAdminMenu = !inAdminMode && ((isPlatformAdmin && isPlatformAdmin()) || (hasPlatformRole && hasPlatformRole()));
  const canSeeTenantMenu = inAdminMode;
  const canSeeSettingsMenu = !inAdminMode;
  const canSeeTeamSettings = userRole && ['admin', 'owner'].includes(userRole);

  useEffect(() => {
    const onPointerDown = (event) => {
      const target = event.target;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(target)) {
        setAdminMenuOpen(false);
      }
      if (tenantMenuRef.current && !tenantMenuRef.current.contains(target)) {
        setTenantMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(target)) {
        setSettingsMenuOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setAdminMenuOpen(false);
        setTenantMenuOpen(false);
        setSettingsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex items-center justify-center font-bold shadow-lg">
                EN
              </div>
              <div>
                <div className="text-lg font-semibold text-[var(--text)]">EngageNinja</div>
                <div className="text-xs text-[var(--text-muted)]">WhatsApp-first engagement</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center overflow-x-visible">
              <NavPills items={navItems} />
              {canSeeSettingsMenu && (
                <div className="relative ml-3" ref={settingsMenuRef}>
                  <button
                    data-testid="settings-dropdown-trigger"
                    className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text)] hover:border-primary-200"
                    onClick={() => {
                      setSettingsMenuOpen(prev => !prev)
                      setAdminMenuOpen(false)
                      setTenantMenuOpen(false)
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Cog6ToothIcon className="h-4 w-4 opacity-80" />
                      Settings ▾
                    </span>
                  </button>
                  {settingsMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-sm p-2 z-40">
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setSettingsMenuOpen(false)
                          navigate('/settings?tab=channels')
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Cog6ToothIcon className="h-4 w-4 opacity-80" />
                          Channel Settings
                        </span>
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setSettingsMenuOpen(false)
                          navigate('/settings?tab=tenant')
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <IdentificationIcon className="h-4 w-4 opacity-80" />
                          Tenant Profile
                        </span>
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setSettingsMenuOpen(false)
                          navigate('/settings?tab=tags')
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <TagIcon className="h-4 w-4 opacity-80" />
                          Tags
                        </span>
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setSettingsMenuOpen(false)
                          navigate('/settings?tab=templates')
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <RectangleStackIcon className="h-4 w-4 opacity-80" />
                          Templates
                        </span>
                      </button>
                      {canSeeTeamSettings && (
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setSettingsMenuOpen(false)
                            navigate('/settings?tab=team')
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            <UserGroupIcon className="h-4 w-4 opacity-80" />
                            Team
                          </span>
                        </button>
                      )}
                      {canSeeTeamSettings && (
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setSettingsMenuOpen(false)
                            navigate('/settings?tab=billing')
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            <CreditCardIcon className="h-4 w-4 opacity-80" />
                            Billing
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {canSeeAdminMenu && (
                <div className="relative ml-3" ref={adminMenuRef}>
                  <button
                    data-testid="admin-dropdown-trigger"
                    className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text)] hover:border-primary-200"
                    onClick={() => {
                      setAdminMenuOpen(prev => !prev)
                      setTenantMenuOpen(false)
                      setSettingsMenuOpen(false)
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheckIcon className="h-4 w-4 opacity-80" />
                      Admin ▾
                    </span>
                  </button>
                  {adminMenuOpen && (
                    <div className="absolute left-0 mt-2 w-52 rounded-2xl border border-[var(--border)] bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-sm p-2 z-40">
                      {adminShortcuts.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={`${item.to}-${item.label}`}
                            className="dropdown-item"
                            onClick={() => {
                              setAdminMenuOpen(false)
                              navigate(item.to)
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4 opacity-80" />}
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {canSeeTenantMenu && (
                <div className="relative ml-3" ref={tenantMenuRef}>
                  <button
                    data-testid="tenant-dropdown-trigger"
                    className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text)] hover:border-primary-200"
                    onClick={() => {
                      setTenantMenuOpen(prev => !prev)
                      setAdminMenuOpen(false)
                      setSettingsMenuOpen(false)
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowPathIcon className="h-4 w-4 opacity-80" />
                      Tenant App ▾
                    </span>
                  </button>
                  {tenantMenuOpen && (
                    <div className="absolute left-0 mt-2 w-60 rounded-2xl border border-[var(--border)] bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-sm p-2 z-40">
                      {tenantShortcuts.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.to}
                            className="dropdown-item"
                            onClick={() => {
                              setTenantMenuOpen(false)
                              navigate(item.to)
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4 opacity-80" />}
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                      {tenants.length > 1 && (
                        <div className="mt-2 border-t border-[var(--border)] pt-2">
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setTenantMenuOpen(false)
                              navigate('/tenants')
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <ArrowPathIcon className="h-4 w-4 opacity-80" />
                              Switch tenant
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={accountMenuRef}>
              <button
                className="h-10 w-10 rounded-full border border-[var(--border)] bg-gradient-to-br from-primary-500/90 to-primary-300/90 text-white flex items-center justify-center shadow-md"
                aria-label="Open account menu"
                onClick={() => setMenuOpen(prev => !prev)}
              >
                <UserIcon />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-sm p-2 z-40">
                  <div className="px-2 py-2 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text)]">{user?.name || user?.email || 'Signed in'}</p>
                    {activeTenantInfo && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">Tenant: {activeTenantInfo.name}</p>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setMenuOpen(false)
                        navigate('/tenants')
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4 opacity-80" />
                        Switch tenant
                      </span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setMenuOpen(false)
                        navigate('/profile')
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <IdentificationIcon className="h-4 w-4 opacity-80" />
                        Profile
                      </span>
                    </button>
                    {isPlatformAdmin() && !inAdminMode && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setMenuOpen(false)
                          navigate('/admin')
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheckIcon className="h-4 w-4 opacity-80" />
                          Admin Console
                        </span>
                      </button>
                    )}
                    {inAdminMode && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setMenuOpen(false)
                          navigate('/dashboard')
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <ArrowPathIcon className="h-4 w-4 opacity-80" />
                          Back to Tenant App
                        </span>
                      </button>
                    )}
                    <button
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <span className="inline-flex items-center gap-2">
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        Log out
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              className="md:hidden p-2 rounded-lg border border-[var(--border)] text-[var(--text)]"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              ☰
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)] backdrop-blur">
            <div className="px-4 py-4 space-y-3">
                <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/10 text-[var(--text)] flex items-center justify-center text-sm font-semibold">
                  <UserIcon />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{user?.name || user?.email || 'Signed in'}</div>
                  <div className="text-xs text-[var(--text-muted)]">Navigation</div>
                </div>
              </div>
              <div className="grid gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-primary-200/70 hover:text-primary-600"
                    onClick={() => { setMobileOpen(false); setMenuOpen(false); }}
                  >
                    {item.label}
                  </Link>
                ))}
                {!inAdminMode && hasPlatformRole && hasPlatformRole() && (
                  <Link
                    to="/admin"
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-primary-200/70 hover:text-primary-600"
                    onClick={() => { setMobileOpen(false); setMenuOpen(false); }}
                  >
                    Admin Console
                  </Link>
                )}
                {inAdminMode && (
                  <Link
                    to="/dashboard"
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-primary-200/70 hover:text-primary-600"
                    onClick={() => { setMobileOpen(false); setMenuOpen(false); }}
                  >
                    Back to Tenant App
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {!inAdminMode && hasPlatformRole && hasPlatformRole() && activeTenant && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4" data-testid="admin-tenant-banner">
            <div className="text-sm text-amber-900">
              Admin viewing tenant: <span className="font-semibold">{activeTenantInfo?.name || activeTenant}</span>
            </div>
            <div className="flex gap-3">
              <button
                className="text-sm text-amber-900 underline"
                onClick={() => navigate('/admin')}
              >
                Back to Admin Console
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!hideTitleBlock && (title || subtitle || actions) && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              {title && <h1 className="text-3xl font-bold text-[var(--text)]">{title}</h1>}
              {subtitle && <p className="text-[var(--text-muted)] mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        )}
        {children}
      </main>

      {!hideFooter && (
        <footer className="border-t border-[var(--border)] bg-[var(--card)] backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>EngageNinja © 2025</span>
            <div className="flex items-center gap-4">
              <span className="text-[var(--text-muted)]">Frontend: 3173</span>
              <span className="text-[var(--text-muted)]">Backend: 5173</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
