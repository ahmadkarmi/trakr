import React, { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery } from '@tanstack/react-query'
import { LogEntry, Audit, AuditStatus, User, Branch, Organization } from '@trakr/shared'
import ResponsiveTable from '../components/ResponsiveTable'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useOrganization } from '../contexts/OrganizationContext'

const ActivityLogs: React.FC = () => {
  const { effectiveOrgId, isSuperAdmin } = useOrganization()

  const { data: logs = [], isLoading } = useQuery<LogEntry[]>({
    queryKey: ['activity', 'all', effectiveOrgId],
    queryFn: () => (api as any).getActivityLogs(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  // Always fetch users for display names (org-scoped)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  // Fetch organizations and branches for context
  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: QK.ORGANIZATIONS,
    queryFn: api.getOrganizations,
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches', effectiveOrgId],
    queryFn: () => api.getBranches(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  // Fetch audits to derive activity if logs are empty (org-scoped)
  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ['audits', 'all', effectiveOrgId],
    queryFn: () => api.getAudits({ orgId: effectiveOrgId }),
    enabled: (logs.length === 0) && (!!effectiveOrgId || isSuperAdmin),
  })

  // Derive activity from audits if no logs exist
  const derivedLogs = useMemo((): LogEntry[] => {
    if (logs.length > 0) return logs

    // Create activity logs from audit events
    const activityLogs: LogEntry[] = []
    
    audits.forEach(audit => {
      const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId)
        return user?.name || userId
      }

      const branch = branches.find(b => b.id === audit.branchId)
      const branchName = branch?.name || 'Unknown Branch'

      // Approved
      if (audit.status === AuditStatus.APPROVED && audit.approvedBy && audit.approvedAt) {
        activityLogs.push({
          id: `${audit.id}-approved`,
          userId: audit.approvedBy,
          action: 'audit_approved',
          details: `${getUserName(audit.approvedBy)} approved audit for ${branchName}${audit.approvalNote ? `: ${audit.approvalNote}` : ''}`,
          entityType: 'audit',
          entityId: audit.id,
          timestamp: new Date(audit.approvedAt),
        })
      }

      // Rejected
      if (audit.status === AuditStatus.REJECTED && audit.rejectedBy && audit.rejectedAt) {
        activityLogs.push({
          id: `${audit.id}-rejected`,
          userId: audit.rejectedBy,
          action: 'audit_rejected',
          details: `${getUserName(audit.rejectedBy)} rejected audit for ${branchName}${audit.rejectionNote ? `: ${audit.rejectionNote}` : ''}`,
          entityType: 'audit',
          entityId: audit.id,
          timestamp: new Date(audit.rejectedAt),
        })
      }

      // Submitted
      if (audit.submittedBy && audit.submittedAt) {
        activityLogs.push({
          id: `${audit.id}-submitted`,
          userId: audit.submittedBy,
          action: 'audit_submitted',
          details: `${getUserName(audit.submittedBy)} submitted ${branchName} audit for approval`,
          entityType: 'audit',
          entityId: audit.id,
          timestamp: new Date(audit.submittedAt),
        })
      }

      // Completed
      if (audit.status === AuditStatus.COMPLETED) {
        activityLogs.push({
          id: `${audit.id}-completed`,
          userId: audit.assignedTo,
          action: 'audit_completed',
          details: `${getUserName(audit.assignedTo)} completed ${branchName} audit`,
          entityType: 'audit',
          entityId: audit.id,
          timestamp: new Date(audit.updatedAt),
        })
      }

      // Created
      activityLogs.push({
        id: `${audit.id}-created`,
        userId: audit.assignedTo,
        action: 'audit_created',
        details: `${branchName} audit created and assigned to ${getUserName(audit.assignedTo)}`,
        entityType: 'audit',
        entityId: audit.id,
        timestamp: new Date(audit.createdAt),
      })
    })

    // Sort by timestamp descending
    return activityLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [logs, audits, users])

  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    if (!q.trim()) return derivedLogs
    const s = q.toLowerCase()
    return derivedLogs.filter(l =>
      l.action.toLowerCase().includes(s) ||
      l.details.toLowerCase().includes(s) ||
      l.userId.toLowerCase().includes(s) ||
      l.entityType.toLowerCase().includes(s) ||
      l.entityId.toLowerCase().includes(s)
    )
  }, [derivedLogs, q])

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
      <div className="mobile-container breathing-room">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-1">{filtered.length} log entr{filtered.length !== 1 ? 'ies' : 'y'}</p>
        </div>

        {/* Search & Export */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
              placeholder="Search logs (action, details, user, entity)" 
              value={q} 
              onChange={e => setQ(e.target.value)} 
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button 
                className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg transition-colors"
                onClick={exportCsv}
              >
                Export CSV
              </button>
              <button 
                className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                onClick={() => window.print()}
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading activity logs...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">📭</div>
              <p className="text-gray-500">No activity logs found</p>
            </div>
          ) : (
            <ResponsiveTable
              items={filtered}
              keyField={(l) => l.id}
              mobileItem={(l) => {
                const user = users.find(u => u.id === l.userId)
                const userName = user?.name || user?.email || 'Unknown User'
                const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const actionIcon = l.action.includes('approved') ? '✅' :
                                  l.action.includes('rejected') ? '❌' :
                                  l.action.includes('submitted') ? '📤' :
                                  l.action.includes('completed') ? '✔️' :
                                  l.action.includes('created') ? '📝' : '📋'
                
                return (
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {actionIcon} {l.action.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {(() => {
                            let details = l.details
                            users.forEach(user => {
                              if (details.includes(user.id)) {
                                details = details.replace(new RegExp(user.id, 'g'), user.name || user.email)
                              }
                            })
                            return details
                          })()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={userName} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                          {initials}
                        </div>
                      )}
                      <span className="text-xs text-gray-500 font-medium">{userName}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{l.entityType}</span>
                    </div>
                  </div>
                )
              }}
              columns={[
                {
                  key: 'action',
                  header: 'Action',
                  render: (l) => {
                    const actionIcon = l.action.includes('approved') ? '✅' :
                                      l.action.includes('rejected') ? '❌' :
                                      l.action.includes('submitted') ? '📤' :
                                      l.action.includes('completed') ? '✔️' :
                                      l.action.includes('created') ? '📝' : '📋'
                    return (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {actionIcon} {l.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )
                  },
                },
                {
                  key: 'details',
                  header: 'Details',
                  render: (l) => {
                    // Replace any user IDs in details with names
                    let details = l.details
                    users.forEach(user => {
                      if (details.includes(user.id)) {
                        details = details.replace(new RegExp(user.id, 'g'), user.name || user.email)
                      }
                    })
                    return (
                      <div className="text-sm text-gray-700 max-w-md truncate" title={details}>
                        {details}
                      </div>
                    )
                  },
                },
                {
                  key: 'user',
                  header: 'By',
                  render: (l) => {
                    const user = users.find(u => u.id === l.userId)
                    const userName = user?.name || user?.email || 'Unknown User'
                    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    
                    return (
                      <div className="flex items-center gap-2">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                            {initials}
                          </div>
                        )}
                        <span className="text-sm text-gray-600">{userName}</span>
                      </div>
                    )
                  },
                },
                {
                  key: 'entity',
                  header: 'Type',
                  render: (l) => (
                    <div className="text-xs text-gray-500 capitalize">{l.entityType}</div>
                  ),
                },
                {
                  key: 'when',
                  header: 'When',
                  render: (l) => (
                    <div className="text-xs text-gray-500">
                      {new Date(l.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ActivityLogs
