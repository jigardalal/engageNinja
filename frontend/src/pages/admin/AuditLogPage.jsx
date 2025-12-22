import React, { useState, useEffect, useMemo } from 'react'
import { ClipboardList, ArrowUpDown } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import {
  Card,
  CardContent,
  Button,
  Badge,
  ErrorState,
  DataTable
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const DEFAULT_LIMIT = 100

const getActionBadgeColor = (action) => {
  if (!action) return 'bg-gray-100 text-gray-800'
  if (action.includes('create')) return 'bg-green-100 text-green-800'
  if (action.includes('delete')) return 'bg-red-100 text-red-800'
  if (action.includes('update')) return 'bg-blue-100 text-blue-800'
  if (action.includes('login')) return 'bg-purple-100 text-purple-800'
  return 'bg-gray-100 text-gray-800'
}

export const AuditLogPage = () => {
  const { isPlatformAdmin } = useAuth()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchStats()
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: DEFAULT_LIMIT })

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      const data = await response.json()
      setLogs(data.logs || [])
      setTotalCount(data.pagination?.total ?? (data.logs?.length || 0))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs/stats', { credentials: 'include' })
      if (!response.ok) return
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch audit stats:', err)
    }
  }

  const columns = useMemo(() => {
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

    return [
      {
        accessorKey: 'action',
        header: sortHeader('Action'),
        cell: ({ row }) => (
          <Badge className={getActionBadgeColor(row.original.action)}>
            {row.original.action || '—'}
          </Badge>
        )
      },
      {
        id: 'actor',
        header: sortHeader('Actor'),
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">
              {row.original.actor_name || 'System'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {row.original.actor_email || row.original.actor_user_id || '—'}
            </p>
          </div>
        )
      },
      {
        id: 'tenant',
        header: sortHeader('Tenant'),
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">
              {row.original.tenant_name || '—'}
            </p>
          </div>
        )
      },
      {
        id: 'target',
        header: sortHeader('Target'),
        cell: ({ row }) => (
          <div>
            <p className="text-sm text-[var(--text-muted)]">{row.original.target_type || '—'}</p>
          </div>
        )
      },
      {
        accessorKey: 'created_at',
        header: sortHeader('Occurred'),
        cell: ({ row }) => {
          const createdAt = row.original.created_at
            ? new Date(row.original.created_at)
            : null
          return (
            <div>
              <p className="text-sm text-[var(--text-muted)]">
                {createdAt ? createdAt.toLocaleDateString() : '—'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {createdAt ? createdAt.toLocaleTimeString() : '—'}
              </p>
            </div>
          )
        }
      }
    ]
  }, [])

  if (!isPlatformAdmin()) return null

  return (
    <AdminPageLayout
      shellTitle="Audit Logs"
      shellSubtitle="System activity and compliance events"
      hero={{
        icon: ClipboardList,
        description: 'Review everyone who touched the platform, filter by tenant, and export evidence.',
        helper: `${totalCount} events recorded`,
        actions: (
          <Button size="sm" onClick={fetchLogs} variant="secondary">
            Refresh events
          </Button>
        )
      }}
    >
      <div className="space-y-6">
        {stats && (
          <div className="grid gap-4 md:grid-cols-3">
            {[{
              label: 'Total Events',
              value: stats.summary?.total_logs || 0
            }, {
              label: 'Platform Events',
              value: stats.summary?.platform_actions || 0
            }, {
              label: 'Tenant Events',
              value: stats.summary?.tenant_actions || 0
            }].map((card) => (
              <Card key={card.label}>
                <CardContent>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">{card.label}</p>
                  <p className="text-2xl font-semibold text-[var(--text)]">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && <ErrorState title="Unable to load logs" description={error} />}
        <DataTable
          title="Audit trail"
          description={loading ? 'Fetching events...' : `${logs.length} events recorded`}
          columns={columns}
          data={logs}
          loading={loading}
          loadingMessage="Loading audit logs..."
          emptyIcon={ClipboardList}
          emptyTitle="No events"
          emptyDescription="Try adjusting the search terms."
          searchPlaceholder="Search events..."
          enableSelection={false}
        />
      </div>
    </AdminPageLayout>
  )
}

export default AuditLogPage
