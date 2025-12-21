import React, { useState, useEffect } from 'react'
import { ClipboardList } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingState,
  EmptyState,
  ErrorState
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const limitOptions = [25, 50, 100]

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
  const [filterAction, setFilterAction] = useState('')
  const [filterActor, setFilterActor] = useState('')
  const [filterTenant, setFilterTenant] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [limit, setLimit] = useState(limitOptions[1])
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, filterAction, filterActor, filterTenant, startDate, endDate])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit, offset })
      if (filterAction) params.append('action', filterAction)
      if (filterActor) params.append('userId', filterActor)
      if (filterTenant) params.append('tenantId', filterTenant)
      if (startDate) params.append('startDate', new Date(startDate).toISOString())
      if (endDate) params.append('endDate', new Date(endDate).toISOString())

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      const data = await response.json()
      setLogs(data.logs || [])
      setTotalCount(data.pagination?.total || 0)
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

  const totalPages = Math.ceil(totalCount / limit)
  const currentPage = Math.floor(offset / limit) + 1

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

        <Card variant="glass">
          <CardHeader>
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription className="text-[var(--text-muted)]">
                Narrow logs by actor, tenant, or date range.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Action</label>
                <Input
                  placeholder="e.g., tenant.create"
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value)
                    setOffset(0)
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Actor (User ID)</label>
                <Input
                  placeholder="actor ID or email"
                  value={filterActor}
                  onChange={(e) => {
                    setFilterActor(e.target.value)
                    setOffset(0)
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Tenant ID</label>
                <Input
                  placeholder="tenant ID"
                  value={filterTenant}
                  onChange={(e) => {
                    setFilterTenant(e.target.value)
                    setOffset(0)
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setOffset(0)
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setOffset(0)
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">Items per page</label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setOffset(0)
                  }}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  {limitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterAction('')
                  setFilterActor('')
                  setFilterTenant('')
                  setStartDate('')
                  setEndDate('')
                  setOffset(0)
                }}
              >
                Clear filters
              </Button>
              <Button size="sm" onClick={() => fetchLogs()}>
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <div>
              <CardTitle>Audit trail</CardTitle>
              <CardDescription className="text-[var(--text-muted)]">
                {loading ? 'Fetching events...' : `${logs.length} events`} 
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <ErrorState title="Unable to load logs" description={error} />}
            {loading ? (
              <LoadingState message="Loading audit logs..." />
            ) : logs.length === 0 ? (
              <EmptyState
                title="No events"
                description="Try expanding the date range or clearing filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Occurred</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className={getActionBadgeColor(log.action)}>{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold text-[var(--text)]">
                            {log.actor_name || 'System'}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {log.actor_email || log.actor_user_id || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-[var(--text-muted)]">{log.tenant_name || '-'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-[var(--text-muted)]">{log.target_type || '-'}</p>
                          <p className="text-xs text-[var(--text-muted)]">{log.target_id || '-'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-[var(--text-muted)]">
                            {new Date(log.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                <div>
                  Page {currentPage} of {totalPages} (Total: {totalCount})
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                  >
                    ← Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={currentPage >= totalPages}
                    onClick={() => setOffset(offset + limit)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  )
}

export default AuditLogPage
