import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, AuditStatus, Survey, calculateAuditScore, getQuarterRange, Branch, Zone, AuditorAssignment, Organization, AuditFrequency } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import InfoBadge from '@/components/InfoBadge'
import { ClipboardDocumentCheckIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const DashboardAuditor: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const { data: audits = [], isLoading } = useQuery<Audit[]>({
    queryKey: QK.AUDITS(`auditor-${user?.id || ''}`),
    queryFn: () => {
      const { start } = getQuarterRange(new Date())
      return api.getAudits({ assignedTo: user?.id, updatedAfter: start })
    },
    enabled: !!user?.id,
  })

  // For assignments & frequency gating
  const { data: orgs = [] } = useQuery<Organization[]>({ queryKey: QK.ORGANIZATIONS, queryFn: api.getOrganizations })
  const orgId = orgs[0]?.id
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: QK.BRANCHES(orgId), queryFn: () => api.getBranches(orgId), enabled: !!orgId })
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: QK.ZONES(orgId), queryFn: () => api.getZones(orgId), enabled: !!orgId })
  const { data: assignments = [] } = useQuery<AuditorAssignment[]>({ queryKey: QK.ASSIGNMENTS, queryFn: api.getAuditorAssignments })
  const { data: allAudits = [] } = useQuery<Audit[]>({ queryKey: QK.AUDITS('all'), queryFn: () => api.getAudits() })

  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: QK.SURVEYS,
    queryFn: api.getSurveys,
  })

  const [selectedSurveyId, setSelectedSurveyId] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!selectedSurveyId && surveys.length > 0) setSelectedSurveyId(surveys[0].id)
  }, [surveys, selectedSurveyId])
  const selectedSurvey = React.useMemo(() => surveys.find(s => s.id === selectedSurveyId) || null, [surveys, selectedSurveyId])

  const pending = audits.filter(a => a.status === AuditStatus.DRAFT).length
  const inProgress = audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length
  const completed = audits.filter(a => a.status === AuditStatus.COMPLETED).length

  const recent = [...audits]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const createAudit = useMutation({
    mutationFn: (payload: { surveyId: string; branchId: string }) =>
      api.createAudit({
        orgId: user?.orgId || 'org-1',
        branchId: payload.branchId,
        surveyId: payload.surveyId,
        assignedTo: user?.id || 'user-1',
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      if (created?.id) navigate(`/audit/${created.id}/wizard`)
    },
  })

  const latestEditable = [...audits]
    .filter(a => a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

  // Compute effective assigned branches (direct + via zones)
  const myAssignment = React.useMemo(() => assignments.find(a => a.userId === user?.id), [assignments, user?.id])
  const assignedBranchIdsFromZones = React.useMemo<string[]>(() => {
    if (!myAssignment) return []
    const out: string[] = []
    ;(myAssignment.zoneIds || []).forEach((zid: string) => {
      const z = zones.find((zz) => zz.id === zid)
      if (z?.branchIds) out.push(...z.branchIds)
    })
    return out
  }, [myAssignment, zones])
  const assignedBranchIdsDirect = React.useMemo<string[]>(() => myAssignment?.branchIds ?? [], [myAssignment])
  const effectiveAssignedBranchIds = React.useMemo<string[]>(() => {
    const map: Record<string, true> = {}
    assignedBranchIdsDirect.forEach((id) => { if (id) map[id] = true })
    assignedBranchIdsFromZones.forEach((id) => { if (id) map[id] = true })
    return Object.keys(map)
  }, [assignedBranchIdsDirect, assignedBranchIdsFromZones])
  const assignedBranches = React.useMemo(() => branches.filter(b => effectiveAssignedBranchIds.includes(b.id)), [branches, effectiveAssignedBranchIds])

  // Frequency gating helpers
  const frequencyLabel: Record<AuditFrequency, string> = {
    [AuditFrequency.UNLIMITED]: 'Unlimited',
    [AuditFrequency.DAILY]: 'Daily',
    [AuditFrequency.WEEKLY]: 'Weekly',
    [AuditFrequency.MONTHLY]: 'Monthly',
    [AuditFrequency.QUARTERLY]: 'Quarterly',
  }
  const allowedBranches = React.useMemo(() => {
    const freq = selectedSurvey?.frequency || AuditFrequency.UNLIMITED
    if (freq === AuditFrequency.UNLIMITED) return assignedBranches
    const surveyId = selectedSurvey?.id
    const gating = orgs[0]?.gatingPolicy || 'completed_approved'
    const now = new Date().getTime()
    return assignedBranches.filter(b => {
      const periodAudits = allAudits.filter(a => a.branchId === b.id && a.surveyId === surveyId && a.periodStart && a.dueAt && new Date(a.periodStart).getTime() <= now && now <= new Date(a.dueAt).getTime())
      if (gating === 'any') return periodAudits.length === 0
      // completed_approved gating
      return !periodAudits.some(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED)
    })
  }, [assignedBranches, allAudits, selectedSurvey?.id, selectedSurvey?.frequency, orgs])
  const firstAllowedBranchId = allowedBranches[0]?.id

  return (
    <DashboardLayout title="Auditor Dashboard">
      <div className="mobile-container space-y-6">
        <div className="card-mobile">
          <div className="text-center sm:text-left">
            <h2 className="heading-mobile-xl text-gray-900 mb-2">
              Welcome back, {user?.name}! 🕵️‍♂️
            </h2>
            <p className="text-mobile-body text-gray-600">
              Here you can view and complete your assigned audits.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-mobile">
          <div className="mobile-section">
            <h3 className="heading-mobile-md text-gray-900 mb-4">Quick Actions</h3>
            
            {/* Survey Selection */}
            <div className="mb-4">
              <label className="label">Select Survey Template</label>
              <select className="input-mobile" value={selectedSurveyId || ''} onChange={(e) => setSelectedSurveyId(e.target.value)}>
                {surveys.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
              <button
                className="btn-mobile-primary sm:btn-outline sm:flex-1"
                disabled={!latestEditable}
                onClick={() => latestEditable && navigate(`/audit/${latestEditable.id}/wizard`)}
                title={latestEditable ? `Resume ${latestEditable.id}` : 'No draft/in-progress audits to resume'}
              >
                {latestEditable ? 'Resume Latest Audit' : 'No Drafts to Resume'}
              </button>
              <button
                className="btn-mobile-primary sm:flex-1"
                disabled={createAudit.isPending || !selectedSurvey || !firstAllowedBranchId}
                onClick={() => selectedSurvey && firstAllowedBranchId && createAudit.mutate({ surveyId: selectedSurvey.id, branchId: firstAllowedBranchId })}
                title={!firstAllowedBranchId ? 'No assigned branches available to start under current survey frequency policy' : (!selectedSurvey ? 'Select a survey first' : 'Start a new audit on your first available branch')}
              >
                {createAudit.isPending ? 'Starting…' : 'Start New Audit'}
              </button>
            </div>
          </div>
          
          {surveys.length === 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-mobile-caption text-amber-700">No survey templates found. Ask an admin to create one under Manage Survey Templates.</p>
            </div>
          )}
        </div>

        <div className="mobile-grid">
          <StatCard title="Pending Audits" value={pending} subtitle="Awaiting completion" variant="primary" icon={<ClipboardDocumentCheckIcon className="w-6 h-6 text-primary-700" />} />
          <StatCard title="In Progress" value={inProgress} subtitle="Currently working on" variant="warning" icon={<ClockIcon className="w-6 h-6 text-warning-700" />} />
          <StatCard title="Completed" value={completed} subtitle="All time" variant="success" icon={<CheckCircleIcon className="w-6 h-6 text-success-700" />} />
        </div>

        {/* My Scheduled Audits */}
        <div className="card-mobile">
          <div className="mobile-section">
            <h3 className="heading-mobile-md text-gray-900">My Scheduled Audits</h3>
          </div>
          <div className="p-6">
            {(() => {
              const mine = allAudits.filter(a => a.assignedTo === user?.id && a.surveyId && a.periodStart)
              if (mine.length === 0) return <p className="text-gray-500">No scheduled audits.</p>
              const sorted = mine.sort((a,b) => new Date(a.dueAt || a.updatedAt).getTime() - new Date(b.dueAt || b.updatedAt).getTime()).slice(0, 8)
              return (
                <div>
                  {/* Mobile card list */}
                  <div className="grid gap-3 md:hidden">
                    {sorted.map(a => {
                      const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                      return (
                        <div key={a.id} className="card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-gray-900">{a.id}</div>
                              <div className="text-xs text-gray-500">{branchName}</div>
                            </div>
                            <div className="text-right">
                              <StatusBadge status={a.status} />
                              <div className="text-xs text-gray-500 mt-1">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—'}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2 justify-end">
                            <button className="btn-outline btn-sm" onClick={() => navigate(`/audit/${a.id}`)}>Details</button>
                            <button className="btn-primary btn-sm" onClick={() => navigate(`/audit/${a.id}/wizard`)}>Open</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[720px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Audit</th>
                          <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Due</th>
                          <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-1.5" />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sorted.map(a => {
                          const branch = branches.find(b => b.id === a.branchId)
                          const dueTs = a.dueAt ? new Date(a.dueAt).getTime() : null
                          const isDueToday = !!dueTs && new Date().toDateString() === new Date(dueTs).toDateString()
                          const isArchived = !!a.isArchived
                          const overdue = !!dueTs && dueTs < Date.now()
                          return (
                            <tr key={a.id}>
                              <td className="px-3 py-1.5 text-sm lg:text-base">{a.id}</td>
                              <td className="px-3 py-1.5 text-sm lg:text-base">{branch?.name || a.branchId}</td>
                              <td className="px-3 py-1.5 text-sm lg:text-base">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—'}</td>
                              <td className="px-3 py-1.5 space-x-2 text-sm lg:text-base">
                                <StatusBadge status={a.status} />
                                {isDueToday && !isArchived && <InfoBadge label="Due Today" tone="warning" />}
                                {overdue && isArchived && <InfoBadge label="Archived" tone="gray" />}
                                {overdue && !isArchived && <InfoBadge label="Overdue" tone="danger" />}
                              </td>
                              <td className="px-3 py-1.5 text-right space-x-2">
                                <button className="btn-outline btn-sm md:h-10 md:px-4 xl:h-11 xl:px-5" onClick={() => navigate(`/audit/${a.id}`)}>Details</button>
                                <button className="btn-primary btn-sm md:h-10 md:px-4 xl:h-11 xl:px-5" onClick={() => navigate(`/audit/${a.id}/wizard`)}>Open</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Audits</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <p className="text-gray-500 py-8">Loading audits...</p>
            ) : recent.length === 0 ? (
              <p className="text-gray-500 py-8">No audits found.</p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="grid gap-3 md:hidden">
                  {recent.map((a) => {
                    const s = surveys.find(su => su.id === a.surveyId)
                    const comp = s ? Math.round(calculateAuditScore(a, s).completionPercentage) : 0
                    const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                    return (
                      <div key={a.id} className="card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-900">{a.id}</div>
                            <div className="text-xs text-gray-500">{branchName} • Updated {new Date(a.updatedAt).toLocaleDateString()}</div>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="mt-2">
                          <div className="h-2 bg-gray-200 rounded">
                            <div className="h-2 bg-primary-500 rounded" style={{ width: `${comp}%` }} />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{comp}%</div>
                        </div>
                        <div className="mt-2 flex gap-2 justify-end">
                          <button className="btn-outline btn-sm" onClick={() => navigate(`/audit/${a.id}`)}>Details</button>
                          <button className="btn-primary btn-sm" onClick={() => navigate(`/audit/${a.id}/wizard`)}>Continue</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[960px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Audit</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                        <th className="px-3 py-1.5" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {recent.map((a) => {
                      const s = surveys.find(su => su.id === a.surveyId)
                      const comp = s ? Math.round(calculateAuditScore(a, s).completionPercentage) : 0
                      const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                      return (
                        <tr key={a.id}>
                          <td className="px-3 py-1.5">{a.id}</td>
                          <td className="px-3 py-1.5">{branchName}</td>
                          <td className="px-3 py-1.5"><StatusBadge status={a.status} /></td>
                          <td className="px-3 py-1.5">
                            <div className="w-40 lg:w-48 xl:w-56 2xl:w-64">
                              <div className="h-2 bg-gray-200 rounded">
                                <div className="h-2 bg-primary-500 rounded" style={{ width: `${comp}%` }} />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{comp}%</div>
                            </div>
                          </td>
                          <td className="px-3 py-1.5">{new Date(a.updatedAt).toLocaleDateString()}</td>
                          <td className="px-3 py-1.5 text-right space-x-2">
                            <button
                              className="btn-outline btn-sm md:h-10 md:px-4 xl:h-11 xl:px-5"
                              onClick={() => navigate(`/audit/${a.id}`)}
                            >
                              Details
                            </button>
                            <button
                              className="btn-primary btn-sm md:h-10 md:px-4 xl:h-11 xl:px-5"
                              onClick={() => navigate(`/audit/${a.id}/wizard`)}
                            >
                              Continue
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Assigned Branches & Frequency */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Assigned Branches</h3>
          </div>
          <div className="p-6">
            {assignedBranches.length === 0 ? (
              <p className="text-gray-500">No branches assigned yet. Ask an admin to assign branches or zones to you.</p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="grid gap-3 md:hidden">
                  {assignedBranches.map(b => {
                    const freq = selectedSurvey?.frequency || AuditFrequency.UNLIMITED
                    const canStart = allowedBranches.some(ab => ab.id === b.id)
                    return (
                      <div key={b.id} className="card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-900">{b.name}</div>
                            <div className="text-xs text-gray-500">{frequencyLabel[freq]}</div>
                          </div>
                          <div className="text-right">
                            {canStart ? (
                              <InfoBadge label="Available" tone="success" />
                            ) : (
                              <InfoBadge label="Unavailable" tone="gray" />
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2 justify-end">
                          <button
                            className="btn-primary btn-sm disabled:opacity-60"
                            disabled={!canStart || !selectedSurvey || createAudit.isPending}
                            onClick={() => selectedSurvey && createAudit.mutate({ surveyId: selectedSurvey.id, branchId: b.id })}
                          >
                            Start Audit
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[720px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Survey Frequency</th>
                        <th className="px-3 py-1.5 text-left text-xs lg:text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-1.5" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignedBranches.map(b => {
                        const freq = selectedSurvey?.frequency || AuditFrequency.UNLIMITED
                        const canStart = allowedBranches.some(ab => ab.id === b.id)
                        return (
                          <tr key={b.id}>
                            <td className="px-3 py-1.5">{b.name}</td>
                            <td className="px-3 py-1.5">{frequencyLabel[freq]}</td>
                            <td className="px-3 py-1.5">
                              {canStart ? (
                                <InfoBadge label="Available" tone="success" />
                              ) : (
                                <InfoBadge label="Already audited this period" tone="gray" />
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                className="btn-primary btn-sm disabled:opacity-60"
                                disabled={!canStart || !selectedSurvey || createAudit.isPending}
                                onClick={() => selectedSurvey && createAudit.mutate({ surveyId: selectedSurvey.id, branchId: b.id })}
                              >
                                Start Audit
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardAuditor
