import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  ErrorState,
  EmptyState,
  DataTable,
  toast
} from '../components/ui'
import { PrimaryAction } from '../components/ui/ActionButtons'
import { Building2, ShieldCheck, Users, ArrowUpDown } from 'lucide-react'

const PLAN_COLORS = {
  Starter: 'bg-amber-100 text-amber-800 border-amber-200',
  Growth: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Pro: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  default: 'bg-slate-100 text-slate-800 border-slate-300'
}

const getPlanColor = (plan) => PLAN_COLORS[plan] || PLAN_COLORS.default

export const TenantsPage = () => {
  const navigate = useNavigate()
  const { tenants = [], activeTenant, switchTenant, isSwitchingTenant, switchingTenantId } = useAuth()
  const [loadingTenant, setLoadingTenant] = useState(null)
  const [error, setError] = useState('')

  const planBreakdown = useMemo(() => {
    return tenants.reduce((acc, tenant) => {
      const plan = tenant.plan || 'Starter'
      acc[plan] = (acc[plan] || 0) + 1
      return acc
    }, {})
  }, [tenants])

  const activeTenantMeta = tenants.find((t) => t.tenant_id === activeTenant)
  const isSwitching = Boolean(isSwitchingTenant || switchingTenantId || loadingTenant)

  const sortHeader = (label) => ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] hover:bg-transparent px-0"
    >
      {label}
      <ArrowUpDown className="ml-1 h-4 w-4 text-[var(--text-muted)]" />
    </Button>
  )

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: sortHeader('Tenant'),
      cell: ({ row }) => {
        const tenant = row.original
        const isActive = tenant.tenant_id === activeTenant
        return (
          <div className={`flex items-center gap-3 ${isActive ? 'font-bold text-primary' : ''}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-500/40 text-primary-700 font-bold">
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Workspace</p>
              <p className="text-base font-semibold text-[var(--text)]">{tenant.name}</p>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'plan',
      header: sortHeader('Plan'),
      cell: ({ row }) => {
        const plan = row.getValue('plan') || 'Starter'
        return <Badge className={`text-xs font-semibold ${getPlanColor(plan)}`}>{plan}</Badge>
      }
    },
    {
      accessorKey: 'tenant_id',
      header: sortHeader('ID'),
      cell: ({ row }) => (
        <p className="text-sm text-[var(--text-muted)]">{row.getValue('tenant_id')}</p>
      )
    },
    {
      id: 'actions',
      header: sortHeader('Action'),
      cell: ({ row }) => {
        const tenant = row.original
        const isActive = tenant.tenant_id === activeTenant
        const isSwitchingThis = loadingTenant === tenant.tenant_id || switchingTenantId === tenant.tenant_id
        return (
          <Button
            size="sm"
            variant={isActive ? 'secondary' : 'primary'}
            disabled={isActive || isSwitchingThis}
            onClick={() => handleSwitch(tenant.tenant_id)}
          >
            {isActive ? 'Active' : isSwitchingThis ? 'Switching…' : 'Switch'}
          </Button>
        )
      }
    }
  ], [activeTenant, loadingTenant, switchingTenantId])

  const handleSwitch = async (tenantId) => {
    if (!tenantId) return
    setError('')
    setLoadingTenant(tenantId)
    const result = await switchTenant(tenantId)
    if (!result?.success) {
      const errorMsg = result?.error || 'Failed to switch tenant'
      setError(errorMsg)
      toast({
        title: 'Failed to switch tenant',
        description: errorMsg,
        variant: 'error'
      })
    } else {
      const switchingTenant = tenants.find(t => t.tenant_id === tenantId)
      toast({
        title: 'Tenant switched',
        description: `Now viewing ${switchingTenant?.name || 'tenant'}`,
        variant: 'success'
      })
    }
    setLoadingTenant(null)
    if (result?.success) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-gradient)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={Building2}
          title="Workspace switcher"
          description="Jump between tenants without losing your context or permissions."
          helper="Your active tenant determines the campaigns and contacts you see."
          actions={
            <PrimaryAction asChild>
              <Button asChild variant="ghost">
                <Link to="/settings?tab=tenant">Tenant settings</Link>
              </Button>
            </PrimaryAction>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1.4fr,0.6fr] mt-6">
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary-500" />
              <CardTitle className="flex-1">Available tenants</CardTitle>
              <Badge className="text-xs font-semibold">{tenants.length} total</Badge>
              <Badge className="text-xs font-semibold bg-primary-100 text-primary-700">
                {activeTenantMeta ? 'Current' : 'Pick one'}
              </Badge>
            </div>
            <CardDescription>Only Admins can invite new tenants or assign scopes.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <ErrorState title="Switch failed" description={error} />}
            <DataTable
              columns={columns}
              data={tenants}
              emptyIcon={ShieldCheck}
              emptyTitle="No tenants yet"
              emptyDescription="You will see workspaces after you join or invite a team."
            />
          </CardContent>
        </Card>

        <Card variant="glass" className="space-y-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-500" />
              <CardTitle>Need a hand?</CardTitle>
            </div>
            <CardDescription>Admins can invite new tenants or request platform access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--text-muted)]">
            <p>Total tenants: <strong className="text-[var(--text)]">{tenants.length}</strong></p>
            {Object.entries(planBreakdown).map(([plan, count]) => (
              <p key={plan}>
                <span className="font-semibold">{plan}</span>: {count} workspace{count > 1 ? 's' : ''}
              </p>
            ))}
            <p>
              Need access to another workspace? Ask your platform admin to invite you or create a new tenant from the admin console.
            </p>
          </CardContent>
          <CardFooter>
            <PrimaryAction onClick={() => window.open('mailto:support@engageninja.com', '_blank')}>
              Contact support
            </PrimaryAction>
          </CardFooter>
        </Card>
      </div>

      {isSwitching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl p-6 w-full max-w-sm text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[var(--text)]">Switching tenants</p>
              <p className="text-sm text-[var(--text-muted)]">
                Hang tight while we move you into {tenants.find((t) => t.tenant_id === switchingTenantId)?.name || 'the selected tenant'}.
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">This may take a couple of seconds.</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default TenantsPage
