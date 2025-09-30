import React, { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery } from '@tanstack/react-query'
import { LogEntry } from '@trakr/shared'
import ResponsiveTable from '../components/ResponsiveTable'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

const ActivityLogs: React.FC = () => {
  const { data: logs = [], isLoading } = useQuery<LogEntry[]>({
    queryKey: QK.ACTIVITY('all'),
    queryFn: () => api.getActivityLogs(),
  })

  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    if (!q.trim()) return logs
    const s = q.toLowerCase()
    return logs.filter(l =>
      l.action.toLowerCase().includes(s) ||
      l.details.toLowerCase().includes(s) ||
      l.userId.toLowerCase().includes(s) ||
      l.entityType.toLowerCase().includes(s) ||
      l.entityId.toLowerCase().includes(s)
    )
  }, [logs, q])

  const exportCsv = () => {
    const rows: string[] = []
    rows.push(['When','User','Action','Details','EntityType','EntityId'].join(','))
    filtered.forEach(l => {
      const cells = [new Date(l.timestamp).toISOString(), l.userId, l.action, l.details, l.entityType, l.entityId]
      rows.push(cells.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(','))
    })
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'activity_logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout title="Activity Logs">
      <div className="space-y-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">System Activity</h2>
            <div className="flex gap-2">
              <input className="input" placeholder="Search (action, details, user, entity)" value={q} onChange={e => setQ(e.target.value)} />
              <button className="btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
              <button className="btn-primary btn-sm" onClick={() => window.print()}>Export PDF</button>
            </div>
          </div>
        </div>

        <div className="card">
          {isLoading ? (
            <p className="text-gray-500 py-8">Loading logs…</p>
          ) : (
            <ResponsiveTable<LogEntry>
              items={filtered}
              keyField={(l) => l.id}
              empty={<p className="text-gray-500 py-8">No logs found.</p>}
              mobileItem={(l) => (
                <div className="card-compact card-interactive bg-white border border-gray-200">
                  <p className="text-sm text-gray-500">{new Date(l.timestamp).toLocaleString()}</p>
                  <p className="font-medium text-gray-900">{l.action}</p>
                  <p className="text-sm text-gray-700">{l.details}</p>
                  <p className="text-xs text-gray-500">{l.entityType} / {l.entityId} • by {l.userId}</p>
                </div>
              )}
              columns={[
                { key: 'when', header: 'When', render: (l) => new Date(l.timestamp).toLocaleString() },
                { key: 'action', header: 'Action', render: (l) => l.action },
                { key: 'details', header: 'Details', render: (l) => l.details },
                { key: 'entity', header: 'Entity', render: (l) => `${l.entityType} / ${l.entityId}` },
                { key: 'user', header: 'User', render: (l) => l.userId },
              ]}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ActivityLogs
