import React from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { useOrganization } from '../contexts/OrganizationContext'
import { Audit, User, UserRole } from '@trakr/shared'
import { QK } from '../utils/queryKeys'

const UnassignedSurveys: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const queryClient = useQueryClient()

  // Data (org-scoped)
  // Instances via RPC (fallback in api if RPC missing)
  const [q, setQ] = React.useState('')
  const [frequency, setFrequency] = React.useState<'all' | 'weekly' | 'monthly' | 'quarterly'>('all')
  const { data: instances = [], isLoading: loadingInstances } = useQuery<Array<{ surveyId: string; surveyTitle: string; frequency?: string; branchId: string; branchName: string }>>({
    queryKey: ['unassigned-instances', effectiveOrgId, frequency, q],
    queryFn: () => (api as any).getUnassignedSurveyInstances({ orgId: effectiveOrgId, frequency, search: q }),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['auditor-assignments', effectiveOrgId],
    queryFn: () => (api as any).getAuditorAssignments(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  // Action: Start Audit as Admin (user-origin draft)
  const createDraft = useMutation({
    mutationFn: async (payload: { surveyId: string; branchId: string }) => {
      const user = (api as any).getCurrentUser?.()
      // Fall back to organizations endpoint if not available
      const me = user || (await (api as any).getMe?.())
      if (!me?.id || !me?.orgId) throw new Error('Missing user/org context')
      const created: Audit = await api.createAudit({ orgId: me.orgId, branchId: payload.branchId, surveyId: payload.surveyId, assignedTo: me.id })
      return created
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      if (created?.id) navigate(`/audit/${created.id}/wizard`)
    }
  })

  const loading = loadingInstances
  const auditors = React.useMemo(() => users.filter(u => u.role === UserRole.AUDITOR), [users])
  const [selected, setSelected] = React.useState<Record<string, string>>({}) // key: branchId -> auditorId
  const [startSurvey, setStartSurvey] = React.useState<Record<string, string>>({}) // key: branchId -> surveyId

  // Group unassigned by branch
  const branchGroups = React.useMemo(() => {
    const map = new Map<string, { branchId: string; branchName: string; surveys: Array<{ id: string; title: string; frequency?: string }> }>()
    for (const it of instances) {
      const ex = map.get(it.branchId)
      if (ex) {
        ex.surveys.push({ id: it.surveyId, title: it.surveyTitle, frequency: it.frequency })
      } else {
        map.set(it.branchId, {
          branchId: it.branchId,
          branchName: it.branchName,
          surveys: [{ id: it.surveyId, title: it.surveyTitle, frequency: it.frequency }]
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.branchName.localeCompare(b.branchName))
  }, [instances])

  // Inline assignment helpers + recent logs
  const [assignmentLogs, setAssignmentLogs] = React.useState<Array<{ ts: string; msg: string }>>([])
  const assignMutation = useMutation({
    mutationFn: async (payload: { auditorId: string; branchId: string; surveyId?: string; sole?: boolean; surveyTitle?: string; branchName?: string }) => {
      // 1) Add branch to selected auditor's assignment
      const current = await (api as any).getAuditorAssignment(payload.auditorId)
      const branchIds: string[] = Array.from(new Set([...(current?.branchIds || []), payload.branchId]))
      await (api as any).setAuditorAssignment(payload.auditorId, { branchIds, zoneIds: current?.zoneIds || [] })
      // 2) If sole, remove branch from other auditors
      if (payload.sole) {
        for (const a of assignments as any[]) {
          if (a.userId !== payload.auditorId && (a.branchIds || []).includes(payload.branchId)) {
            const next = (a.branchIds || []).filter((bid: string) => bid !== payload.branchId)
            await (api as any).setAuditorAssignment(a.userId, { branchIds: next, zoneIds: a.zoneIds || [] })
          }
        }
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['auditor-assignments', effectiveOrgId] })
      queryClient.invalidateQueries({ queryKey: ['unassigned-instances', effectiveOrgId] })
      // Append a recent log entry
      const auditorName = users.find(u => u.id === vars.auditorId)?.name || 'Auditor'
      const byName = user?.name || 'Admin'
      const msg = `${vars.sole ? 'Assigned (sole)' : 'Assigned'} ${vars.branchName || vars.branchId} → ${auditorName} by ${byName}${vars.surveyTitle ? ` • ${vars.surveyTitle}` : ''}`
      setAssignmentLogs(prev => [{ ts: new Date().toISOString(), msg }, ...prev].slice(0, 10))
      // Persist to activity logs
      ;(api as any).createActivityLog?.(
        user?.id,
        vars.sole ? 'ASSIGN_AUDITOR_SOLE' : 'ASSIGN_AUDITOR',
        msg,
        'auditor_assignment',
        vars.branchId,
        effectiveOrgId,
        { surveyId: vars.surveyId, branchId: vars.branchId }
      )
      queryClient.invalidateQueries({ queryKey: ['activity-logs', effectiveOrgId] })
    }
  })

  return (
    <DashboardLayout title="Unassigned Surveys">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Unassigned Surveys</h1>
            <p className="text-gray-600">Survey–branch pairs without an assigned auditor. Assign an auditor or start the audit as an admin.</p>
          </div>
          <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap overflow-x-auto w-full sm:w-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search survey or branch..."
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white min-w-[220px]"
            />
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : instances.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-gray-700 font-medium">All applicable branches have auditor coverage for the selected frequency.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {branchGroups.map(({ branchId, branchName, surveys }) => (
              <div key={branchId} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-white">
                <div className="min-w-0 pr-3">
                  <div className="font-medium text-gray-900 truncate">{branchName}</div>
                  <div className="text-sm text-gray-600 truncate">{surveys.length} applicable active surveys</div>
                </div>
                <div className="flex items-center gap-2 md:gap-2 flex-nowrap whitespace-nowrap overflow-x-auto flex-shrink-0">
                  <select
                    className="input h-9 text-xs"
                    value={selected[branchId] || ''}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [branchId]: e.target.value }))}
                  >
                    <option value="">Select auditor…</option>
                    {auditors.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn-outline btn-sm text-xs"
                    disabled={!selected[branchId] || assignMutation.isPending}
                    onClick={() => selected[branchId] && assignMutation.mutate({ auditorId: selected[branchId], branchId, surveyId: undefined, branchName })}
                  >
                    Assign
                  </button>
                  <button
                    className="btn btn-outline btn-sm text-xs"
                    disabled={!selected[branchId] || assignMutation.isPending}
                    onClick={() => selected[branchId] && assignMutation.mutate({ auditorId: selected[branchId], branchId, surveyId: undefined, sole: true, branchName })}
                    title="Assign as sole auditor for this branch (removes other auditors for this branch)"
                  >
                    Make Sole
                  </button>
                  {/* Start Audit selector */}
                  <select
                    className="input h-9 text-xs"
                    value={startSurvey[branchId] || ''}
                    onChange={(e) => setStartSurvey((prev) => ({ ...prev, [branchId]: e.target.value }))}
                  >
                    <option value="">Choose survey…</option>
                    {surveys.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                  <button
                    className="btn-primary btn-sm text-xs"
                    onClick={() => startSurvey[branchId] && createDraft.mutate({ surveyId: startSurvey[branchId], branchId })}
                    disabled={createDraft.isPending || !startSurvey[branchId]}
                  >
                    {createDraft.isPending ? 'Creating...' : 'Start Audit as Admin'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Assignment Log (server + recent) */}
        <AssignmentLogs orgId={effectiveOrgId} recent={assignmentLogs} />
      </div>
    </DashboardLayout>
  )
}

// Inline log list component pulling server activity logs
const AssignmentLogs: React.FC<{ orgId?: string; recent: Array<{ ts: string; msg: string }> }> = ({ orgId, recent }) => {
  const { data: serverLogs = [] } = useQuery({
    queryKey: ['activity-logs', orgId, 'assignments'],
    queryFn: () => (api as any).getActivityLogs(undefined, orgId, { actionPrefix: 'ASSIGN_AUDITOR', limit: 10 }),
    enabled: !!orgId,
  })
  const merged = React.useMemo(() => {
    const server = (serverLogs as any[])
      .map(l => ({ ts: (l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()), msg: l.details as string }))
    return [...recent, ...server].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 10)
  }, [serverLogs, recent])
  if (merged.length === 0) return null
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-2">Recent Assignment Changes</h2>
      <div className="space-y-1">
        {merged.map((l, i) => (
          <div key={i} className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex items-center justify-between">
            <span className="truncate pr-3">{l.msg}</span>
            <span className="text-[11px] text-gray-400 shrink-0">{new Date(l.ts).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UnassignedSurveys
