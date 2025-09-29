import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, AuditStatus, Survey, calculateAuditScore, getQuarterRange, Branch, Zone, AuditorAssignment, Organization, AuditFrequency } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate } from 'react-router-dom'
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

  // Filter surveys to only show those with available branches
  const availableSurveys = React.useMemo(() => {
    return surveys.filter(survey => {
      const freq = survey.frequency || AuditFrequency.UNLIMITED
      if (freq === AuditFrequency.UNLIMITED) return assignedBranches.length > 0
      
      const gating = orgs[0]?.gatingPolicy || 'completed_approved'
      const now = new Date().getTime()
      
      const surveyAllowedBranches = assignedBranches.filter(b => {
        const periodAudits = allAudits.filter(a => a.branchId === b.id && a.surveyId === survey.id && a.periodStart && a.dueAt && new Date(a.periodStart).getTime() <= now && now <= new Date(a.dueAt).getTime())
        if (gating === 'any') return periodAudits.length === 0
        return !periodAudits.some(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED)
      })
      
      return surveyAllowedBranches.length > 0
    })
  }, [surveys, assignedBranches, allAudits, orgs])

  // Auto-select first available survey if current selection is not available
  React.useEffect(() => {
    if (availableSurveys.length > 0) {
      if (!selectedSurveyId || !availableSurveys.find(s => s.id === selectedSurveyId)) {
        setSelectedSurveyId(availableSurveys[0].id)
      }
    }
  }, [availableSurveys, selectedSurveyId])

  return (
    <DashboardLayout title="Auditor Dashboard">
      <div className="mobile-container breathing-room">
        {/* Compact Header with Avatar */}
        <div className="flex items-center gap-3 mb-6 lg:mb-8">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xl">🕵️‍♂️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Welcome back, {user?.name}</h2>
            <p className="text-sm text-gray-500">{assignedBranches.length} branches • {pending + inProgress} active audits</p>
          </div>
        </div>

        {/* Action-First Quick Actions */}
        {latestEditable && (
          <div className="card-spacious bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Continue Your Audit</h3>
                <p className="text-blue-700">Resume audit {latestEditable.id}</p>
                <p className="text-sm text-blue-600 mt-1">Pick up where you left off</p>
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg touch-target"
                onClick={() => navigate(`/audit/${latestEditable.id}/wizard`)}
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* Smart Survey Selection - Only Available Surveys */}
        {availableSurveys.length > 0 && (
          <div className="card-spacious">
            <div className="card-header">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start New Audit</h3>
                  <p className="text-gray-600">
                    {selectedSurvey?.title || 'Select survey template'}
                  </p>
                  {firstAllowedBranchId && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ {allowedBranches.length} branches available for this period
                    </p>
                  )}
                  {availableSurveys.length < surveys.length && (
                    <p className="text-sm text-amber-600 mt-1">
                      📅 {surveys.length - availableSurveys.length} surveys not available due to frequency policy
                    </p>
                  )}
                </div>
                {availableSurveys.length > 1 && (
                  <select 
                    className="input rounded-xl border-gray-300 bg-white min-w-[140px]"
                    value={selectedSurveyId || ''} 
                    onChange={(e) => setSelectedSurveyId(e.target.value)}
                  >
                    {availableSurveys.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            
            <div className="card-body">
              <button
                className="btn-mobile-primary text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={createAudit.isPending || !selectedSurvey || !firstAllowedBranchId}
                onClick={() => selectedSurvey && firstAllowedBranchId && createAudit.mutate({ surveyId: selectedSurvey.id, branchId: firstAllowedBranchId })}
              >
                {createAudit.isPending ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Starting Audit...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">🚀</span>
                    <span>Start Audit{firstAllowedBranchId ? ` at ${allowedBranches[0]?.name}` : ''}</span>
                  </div>
                )}
              </button>
              
              {!firstAllowedBranchId && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-500 text-lg">⚠️</span>
                    <div>
                      <p className="font-medium text-amber-800">No branches available</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Current survey frequency policy prevents new audits at this time
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {availableSurveys.length === 0 && (
          <div className="card-spacious border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📅</span>
              </div>
              {surveys.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">No Survey Templates</h3>
                  <p className="text-amber-700 mb-4">Ask an admin to create survey templates to get started</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">No Audits Available</h3>
                  <p className="text-amber-700 mb-2">All surveys have been completed for this period</p>
                  <p className="text-sm text-amber-600">
                    {surveys.length} survey{surveys.length !== 1 ? 's' : ''} exist but frequency policy prevents new audits
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actionable Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card-compact card-interactive bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center shadow-sm">
                <ClipboardDocumentCheckIcon className="w-7 h-7 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-primary-600 mb-1">{pending}</div>
                <div className="text-sm font-medium text-gray-700">Pending Audits</div>
                <div className="text-xs text-gray-500 mt-1">Ready to start</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact card-interactive bg-gradient-to-br from-warning-50 to-orange-50 border-warning-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-warning-100 rounded-2xl flex items-center justify-center shadow-sm">
                <ClockIcon className="w-7 h-7 text-warning-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-warning-600 mb-1">{inProgress}</div>
                <div className="text-sm font-medium text-gray-700">In Progress</div>
                <div className="text-xs text-gray-500 mt-1">Currently working</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact card-interactive bg-gradient-to-br from-success-50 to-green-50 border-success-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-success-100 rounded-2xl flex items-center justify-center shadow-sm">
                <CheckCircleIcon className="w-7 h-7 text-success-600" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-success-600 mb-1">{completed}</div>
                <div className="text-sm font-medium text-gray-700">Completed</div>
                <div className="text-xs text-gray-500 mt-1">All time total</div>
              </div>
            </div>
          </div>
        </div>

        {/* My Scheduled Audits */}
        <div className="card-spacious">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-gray-900">My Scheduled Audits</h3>
            <p className="text-gray-600 mt-1">Recent audit activity and upcoming tasks</p>
          </div>
          <div className="p-6">
            {(() => {
              const mine = allAudits.filter(a => a.assignedTo === user?.id && a.surveyId && a.periodStart)
              if (mine.length === 0) return <p className="text-gray-500">No scheduled audits.</p>
              const sorted = mine.sort((a,b) => new Date(a.dueAt || a.updatedAt).getTime() - new Date(b.dueAt || b.updatedAt).getTime()).slice(0, 8)
              return (
                <div>
                  {/* Enhanced Mobile Audit Cards */}
                  <div className="grid gap-6 md:hidden">
                    {sorted.map(a => {
                      const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                      return (
                        <div key={a.id} className="card-compact card-interactive bg-white border border-gray-200">
                          <div className="card-header">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-base mb-1 truncate">
                                  Audit {a.id}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">{branchName}</p>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={a.status} />
                                  <span className="text-xs text-gray-500">
                                    {a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : 'No due date'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="card-footer">
                            <div className="flex gap-3">
                              <button 
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                                onClick={() => navigate(`/audit/${a.id}`)}
                              >
                                View Details
                              </button>
                              <button 
                                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-xl font-medium transition-colors touch-target"
                                onClick={() => navigate(`/audit/${a.id}/wizard`)}
                              >
                                Open Audit
                              </button>
                            </div>
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

        {/* Completely Redesigned Recent Audits - Mobile First */}
        <div className="card-spacious">
          <div className="card-header">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Recent Audits</h3>
                <p className="text-gray-600 mt-1">Your audit history and progress</p>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {recent.length} audits
              </div>
            </div>
            
            {/* Mobile-First Search & Filter Bar */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all"
                  placeholder="Search audit, branch, auditor..."
                />
              </div>
              
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors">
                  Due Today
                </button>
                <button className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors">
                  Overdue
                </button>
                <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors">
                  Submitted
                </button>
                <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors">
                  Waiting Approval
                </button>
                <button className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors">
                  Completed
                </button>
                <button className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors">
                  Approved
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                  Finalized
                </button>
              </div>
              
              {/* Filter Toggle & Clear */}
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-sm font-medium">Filters</span>
                </button>
                <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Clear
                </button>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500 text-lg">Loading audits...</p>
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📋</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No audits found</h4>
              <p className="text-gray-500 mb-6">Your completed audits will appear here</p>
              <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                Start Your First Audit
              </button>
            </div>
          ) : (
            <>
              {/* Optimized Mobile Audit Cards */}
              <div className="space-y-4 md:hidden">
                {recent.map((a) => {
                  const s = surveys.find(su => su.id === a.surveyId)
                  const comp = s ? Math.round(calculateAuditScore(a, s).completionPercentage) : 0
                  const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                  const isOverdue = a.dueAt && new Date(a.dueAt) < new Date()
                  const isDueToday = a.dueAt && new Date(a.dueAt).toDateString() === new Date().toDateString()
                  
                  return (
                    <div key={a.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                      {/* Card Header with Status Indicator */}
                      <div className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                                <span className="text-lg font-bold text-primary-600">
                                  {a.id.slice(-2)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-lg truncate">
                                  {a.id}
                                </h4>
                                <p className="text-gray-600 text-sm">{branchName}</p>
                              </div>
                            </div>
                            
                            {/* Status & Date Row */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <StatusBadge status={a.status} />
                              {isOverdue && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Overdue
                                </span>
                              )}
                              {isDueToday && !isOverdue && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Due Today
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                Updated {new Date(a.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Progress Circle */}
                          <div className="flex-shrink-0">
                            <div className="relative w-16 h-16">
                              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-200"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="text-primary-500"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  fill="none"
                                  strokeDasharray={`${comp}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-900">{comp}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar for Mobile */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Completion Progress</span>
                            <span className="text-sm text-gray-500">{comp}% complete</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${comp}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg font-medium transition-all duration-200 touch-target whitespace-nowrap"
                            onClick={() => navigate(`/audit/${a.id}`)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View</span>
                          </button>
                          <button 
                            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg font-medium transition-all duration-200 touch-target hover:shadow-lg whitespace-nowrap"
                            onClick={() => navigate(`/audit/${a.id}/wizard`)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l7 7-7 7M4 12h14" />
                            </svg>
                            <span>Continue</span>
                          </button>
                        </div>
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
                {/* Enhanced Mobile Branch Cards */}
                <div className="grid gap-6 md:hidden">
                  {assignedBranches.map(b => {
                    const freq = selectedSurvey?.frequency || AuditFrequency.UNLIMITED
                    const canStart = allowedBranches.some(ab => ab.id === b.id)
                    return (
                      <div key={b.id} className="card-compact card-interactive bg-white border border-gray-200">
                        <div className="card-header">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-base mb-1 truncate">
                                {b.name}
                              </h4>
                              <p className="text-sm text-gray-600">{frequencyLabel[freq]} frequency</p>
                            </div>
                            <div className="flex-shrink-0">
                              {canStart ? (
                                <InfoBadge label="Available" tone="success" />
                              ) : (
                                <InfoBadge label="Unavailable" tone="gray" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="card-footer">
                          <button
                            className={`w-full px-4 py-3 rounded-xl font-medium transition-colors touch-target ${
                              canStart && selectedSurvey && !createAudit.isPending
                                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!canStart || !selectedSurvey || createAudit.isPending}
                            onClick={() => selectedSurvey && createAudit.mutate({ surveyId: selectedSurvey.id, branchId: b.id })}
                          >
                            {createAudit.isPending ? 'Starting...' : 'Start Audit'}
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

        {/* Floating Action Button for Primary Action */}
        {selectedSurvey && firstAllowedBranchId && !latestEditable && (
          <button
            className="btn-mobile-fab"
            onClick={() => createAudit.mutate({ surveyId: selectedSurvey.id, branchId: firstAllowedBranchId })}
            disabled={createAudit.isPending}
            title="Start New Audit"
          >
            {createAudit.isPending ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DashboardAuditor
