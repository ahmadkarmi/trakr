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
import MobileAuditCard from '@/components/MobileAuditCard'
import ResponsiveTable, { Column } from '@/components/ResponsiveTable'
import { SkeletonAuditCard } from '@/components/Skeleton'
import { ClipboardDocumentCheckIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useOrganization } from '../contexts/OrganizationContext'

const DashboardAuditor: React.FC = () => {
  const { user } = useAuthStore()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
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

  // For assignments & frequency gating - org-scoped
  const { data: orgs = [] } = useQuery<Organization[]>({ 
    queryKey: QK.ORGANIZATIONS, 
    queryFn: api.getOrganizations,
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  const { data: branches = [] } = useQuery<Branch[]>({ 
    queryKey: ['branches', effectiveOrgId], 
    queryFn: () => api.getBranches(effectiveOrgId), 
    enabled: !!effectiveOrgId || isSuperAdmin 
  })
  const { data: zones = [] } = useQuery<Zone[]>({ 
    queryKey: ['zones', effectiveOrgId], 
    queryFn: () => api.getZones(effectiveOrgId), 
    enabled: !!effectiveOrgId || isSuperAdmin 
  })
  const { data: assignments = [] } = useQuery<AuditorAssignment[]>({ 
    queryKey: ['assignments', effectiveOrgId], 
    queryFn: () => (api as any).getAuditorAssignments(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  const { data: allAudits = [] } = useQuery<Audit[]>({ 
    queryKey: ['audits', 'all', effectiveOrgId], 
    queryFn: () => api.getAudits({ orgId: effectiveOrgId }),
    enabled: !!effectiveOrgId || isSuperAdmin
  })

  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: ['surveys', effectiveOrgId],
    queryFn: () => (api as any).getSurveys(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })

  const [selectedSurveyId, setSelectedSurveyId] = React.useState<string | null>(null)
  const [branchSearch, setBranchSearch] = React.useState('')
  const [showAvailableOnly, setShowAvailableOnly] = React.useState(true)
  const [mainTab, setMainTab] = React.useState<'cycle' | 'rejected' | 'history'>('cycle')
  const [cycleTab, setCycleTab] = React.useState<'open' | 'completed'>('open')
  React.useEffect(() => {
    if (!selectedSurveyId && surveys.length > 0) setSelectedSurveyId(surveys[0].id)
  }, [surveys, selectedSurveyId])
  const selectedSurvey = React.useMemo(() => surveys.find(s => s.id === selectedSurveyId) || null, [surveys, selectedSurveyId])

  const recent = [...audits]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const createAudit = useMutation({
    mutationFn: (payload: { surveyId: string; branchId: string }) =>
      api.createAudit({
        orgId: user?.orgId || 'org-1',
        branchId: payload.branchId,
        surveyId: payload.surveyId,
        assignedTo: user?.id || 'user-1',
      }),
    onSuccess: async (created, variables) => {
      queryClient.invalidateQueries({ queryKey: QK.AUDITS() })
      if (created?.id) navigate(`/audit/${created.id}/wizard`)
      
      // Note: No notification needed here since auditor is creating their own audit
      // Notifications are sent when admin/manager assigns audits to auditors
    },
  })

  const latestEditable = [...audits]
    .filter(a => a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

  // This cycle groupings for the signed-in auditor
  const nowTs = Date.now()
  const myCycleAudits = React.useMemo(() => {
    return allAudits.filter(a => (
      a.assignedTo === (user?.id || '') &&
      !!a.periodStart && !!a.dueAt &&
      new Date(a.periodStart).getTime() <= nowTs && nowTs <= new Date(a.dueAt).getTime()
    ))
  }, [allAudits, user?.id, nowTs])
  
  // Count from myCycleAudits for consistency with "This Cycle" section
  const statusCounts = React.useMemo(() => {
    return {
      draft: myCycleAudits.filter(a => a.status === AuditStatus.DRAFT).length,
      inProgress: myCycleAudits.filter(a => a.status === AuditStatus.IN_PROGRESS).length,
      submitted: myCycleAudits.filter(a => a.status === AuditStatus.SUBMITTED).length,
      completed: myCycleAudits.filter(a => a.status === AuditStatus.COMPLETED).length,
      approved: myCycleAudits.filter(a => a.status === AuditStatus.APPROVED).length,
    }
  }, [myCycleAudits])
  
  // Aggregate counts for display
  const pending = statusCounts.draft
  const inProgress = statusCounts.inProgress
  const completed = statusCounts.completed + statusCounts.approved
  const openCycleAudits = React.useMemo(() => {
    // COMPLETED = finished but not submitted yet, so keep in open for auditor to submit
    const openStatuses = new Set<AuditStatus>([AuditStatus.DRAFT, AuditStatus.IN_PROGRESS, AuditStatus.COMPLETED, AuditStatus.SUBMITTED])
    return myCycleAudits
      .filter(a => openStatuses.has(a.status))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [myCycleAudits])
  const completedCycleAudits = React.useMemo(() => {
    // Only APPROVED audits are truly done from auditor perspective
    const done = new Set<AuditStatus>([AuditStatus.APPROVED])
    return myCycleAudits
      .filter(a => done.has(a.status))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [myCycleAudits])
  
  // Rejected audits that need attention
  const rejectedAudits = React.useMemo(() => {
    return audits
      .filter(a => a.status === AuditStatus.REJECTED)
      .sort((a, b) => new Date(b.rejectedAt || b.updatedAt).getTime() - new Date(a.rejectedAt || a.updatedAt).getTime())
  }, [audits])

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
      return !periodAudits.some(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED || a.status === AuditStatus.SUBMITTED)
    })
  }, [assignedBranches, allAudits, selectedSurvey?.id, selectedSurvey?.frequency, orgs])
  const firstAllowedBranchId = allowedBranches[0]?.id
  const assignedBranchesSorted = React.useMemo(() => {
    const allowedSet = new Set(allowedBranches.map(b => b.id))
    return [...assignedBranches].sort((a, b) => {
      const aRank = allowedSet.has(a.id) ? 0 : 1
      const bRank = allowedSet.has(b.id) ? 0 : 1
      if (aRank !== bRank) return aRank - bRank
      return a.name.localeCompare(b.name)
    })
  }, [assignedBranches, allowedBranches])

  const assignedBranchesView = React.useMemo(() => {
    const lower = branchSearch.trim().toLowerCase()
    const base = assignedBranchesSorted.filter(b => (lower ? b.name.toLowerCase().includes(lower) : true))
    if (showAvailableOnly) {
      const allowedSet = new Set(allowedBranches.map(ab => ab.id))
      return base.filter(b => allowedSet.has(b.id))
    }
    return base
  }, [assignedBranchesSorted, branchSearch, showAvailableOnly, allowedBranches])

  // Get blocking reason for a branch
  const getBlockingReason = React.useCallback((branchId: string): string | null => {
    if (!selectedSurvey) return null
    const freq = selectedSurvey.frequency || AuditFrequency.UNLIMITED
    if (freq === AuditFrequency.UNLIMITED) return null
    
    const now = new Date().getTime()
    const periodAudits = allAudits.filter(a => 
      a.branchId === branchId && 
      a.surveyId === selectedSurvey.id && 
      a.periodStart && 
      a.dueAt && 
      new Date(a.periodStart).getTime() <= now && 
      now <= new Date(a.dueAt).getTime()
    )
    
    if (periodAudits.length === 0) return null
    const submitted = periodAudits.find(a => a.status === AuditStatus.SUBMITTED)
    const approved = periodAudits.find(a => a.status === AuditStatus.APPROVED)
    const completed = periodAudits.find(a => a.status === AuditStatus.COMPLETED)

    if (submitted) return `Awaiting approval this ${frequencyLabel[freq].toLowerCase()} period`
    if (approved) return `Already approved this ${frequencyLabel[freq].toLowerCase()} period`
    if (completed) return `Already completed this ${frequencyLabel[freq].toLowerCase()} period`
    // If org gating policy is 'any', any audit (including draft/in-progress) blocks new starts
    const gating = orgs[0]?.gatingPolicy || 'completed_approved'
    if (gating === 'any') return `An audit already exists this ${frequencyLabel[freq].toLowerCase()} period`
    return null
  }, [selectedSurvey, allAudits, orgs, frequencyLabel])

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
        return !periodAudits.some(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED || a.status === AuditStatus.SUBMITTED)
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditor Dashboard</h1>
          <p className="text-gray-600 mt-1">{assignedBranches.length} branches • {myCycleAudits.length} this cycle • {audits.length} total audits • {user?.name}</p>
        </div>

        {/* Quick Metrics - Comprehensive Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusCounts.draft}</p>
            <p className="text-xs text-gray-600 mt-1">Draft</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
              <ClockIcon className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusCounts.inProgress}</p>
            <p className="text-xs text-gray-600 mt-1">In Progress</p>
          </div>
          
          <div className="bg-white border border-yellow-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-lg">📤</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusCounts.submitted}</p>
            <p className="text-xs text-gray-600 mt-1">Submitted</p>
          </div>
          
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusCounts.completed}</p>
            <p className="text-xs text-gray-600 mt-1">Completed</p>
          </div>
          
          <div className="bg-white border border-emerald-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-lg">✅</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusCounts.approved}</p>
            <p className="text-xs text-gray-600 mt-1">Approved</p>
          </div>
        </div>

        {/* Resume Audit Card */}
        {latestEditable && (
          <div className="bg-gradient-to-r from-blue-500 to-primary-600 rounded-lg p-5 text-white">
            <h3 className="text-lg font-semibold mb-2">Continue Your Audit</h3>
            <p className="text-sm opacity-90 mb-4">Resume audit #{latestEditable.id.slice(0, 8)} • Pick up where you left off</p>
            <button
              className="bg-white text-primary-600 hover:bg-gray-100 font-medium py-2.5 px-4 rounded-lg transition-colors"
              onClick={() => navigate(`/audit/${latestEditable.id}/wizard`)}
            >
              Resume Audit
            </button>
          </div>
        )}

        {/* Main Tabbed Section: This Cycle | Rejected Audits | Audit History */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Main Tabs */}
          <div className="border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
            <nav className="flex gap-8 min-w-max" aria-label="Tabs">
              <button
                onClick={() => setMainTab('cycle')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  mainTab === 'cycle'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 This Cycle
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                  {openCycleAudits.length + completedCycleAudits.length}
                </span>
              </button>
              <button
                onClick={() => setMainTab('rejected')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1 whitespace-nowrap ${
                  mainTab === 'rejected'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {rejectedAudits.length > 0 && <ExclamationTriangleIcon className="w-4 h-4" />}
                Rejected Audits
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  rejectedAudits.length > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {rejectedAudits.length}
                </span>
              </button>
              <button
                onClick={() => setMainTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  mainTab === 'history'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📚 Audit History
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                  {audits.length}
                </span>
              </button>
            </nav>
          </div>
          
          {/* Cycle Tab Sub-tabs */}
          {mainTab === 'cycle' && (
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="inline-flex items-center bg-white border border-gray-200 rounded-lg p-1">
                <button
                  className={`${cycleTab === 'open' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'} px-4 py-2 rounded-md text-sm font-medium transition-colors`}
                  onClick={() => setCycleTab('open')}
                >
                  Open ({openCycleAudits.length})
                </button>
                <button
                  className={`${cycleTab === 'completed' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'} px-4 py-2 rounded-md text-sm font-medium transition-colors`}
                  onClick={() => setCycleTab('completed')}
                >
                  Completed ({completedCycleAudits.length})
                </button>
              </div>
            </div>
          )}
          
          <div className="p-4 sm:p-6">
            {/* This Cycle Content */}
            {mainTab === 'cycle' && (cycleTab === 'open' ? (
              openCycleAudits.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-600 font-medium">No open audits</p>
                  <p className="text-sm text-gray-500 mt-1">All audits for this cycle are completed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {openCycleAudits.map(a => {
                    const branch = branches.find(b => b.id === a.branchId)
                    const survey = surveys.find(s => s.id === a.surveyId)
                    const dueAt = a.dueAt ? new Date(a.dueAt) : null
                    const isOverdue = !!dueAt && dueAt < new Date()
                    const isDueToday = !!dueAt && dueAt.toDateString() === new Date().toDateString()
                    
                    // Button config based on status
                    const getButtonConfig = () => {
                      if (a.status === AuditStatus.DRAFT) return { label: 'Start', color: 'bg-blue-600 hover:bg-blue-700', icon: '▶' }
                      if (a.status === AuditStatus.IN_PROGRESS) return { label: 'Continue', color: 'bg-orange-600 hover:bg-orange-700', icon: '▶' }
                      if (a.status === AuditStatus.SUBMITTED) return { label: 'View Submission', color: 'bg-yellow-600 hover:bg-yellow-700', icon: '📋' }
                      return { label: 'Open', color: 'bg-primary-600 hover:bg-primary-700', icon: '▶' }
                    }
                    
                    const btnConfig = getButtonConfig()
                    
                    return (
                      <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{branch?.name || 'Unknown Branch'}</h3>
                            <p className="text-sm text-gray-600 truncate">{survey?.title || 'Unknown Survey'}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <StatusBadge status={a.status} />
                          {isOverdue && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              🚨 Overdue
                            </span>
                          )}
                          {isDueToday && !isOverdue && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              ⏰ Due Today
                            </span>
                          )}
                          {dueAt && !isOverdue && !isDueToday && (
                            <span className="text-xs text-gray-500">Due {dueAt.toLocaleDateString()}</span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => {
                            if (a.status === AuditStatus.SUBMITTED) {
                              navigate(`/audits/${a.id}/summary`)
                            } else {
                              navigate(`/audit/${a.id}/wizard`)
                            }
                          }}
                          className={`w-full flex items-center justify-center gap-2 ${btnConfig.color} text-white px-4 py-2.5 rounded-lg font-medium transition-colors`}
                        >
                          <span>{btnConfig.icon}</span>
                          <span>{btnConfig.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              completedCycleAudits.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-600 font-medium">No completed audits yet</p>
                  <p className="text-sm text-gray-500 mt-1">Complete audits will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedCycleAudits.map(a => {
                    const branch = branches.find(b => b.id === a.branchId)
                    const survey = surveys.find(s => s.id === a.surveyId)
                    const completedAt = new Date(a.updatedAt)
                    
                    return (
                      <div key={a.id} className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{branch?.name || 'Unknown Branch'}</h3>
                            <p className="text-sm text-gray-600 truncate">{survey?.title || 'Unknown Survey'}</p>
                            <p className="text-xs text-gray-500 mt-1">Completed {completedAt.toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <StatusBadge status={a.status} />
                          {a.status === AuditStatus.APPROVED && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              ✅ Approved
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => navigate(`/audits/${a.id}/summary`)}
                          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                        >
                          <span>📊</span>
                          <span>View Results</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            ))}
            
            {/* Rejected Audits Content */}
            {mainTab === 'rejected' && (
              rejectedAudits.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-600 font-medium">No rejected audits</p>
                  <p className="text-sm text-gray-500 mt-1">All your audits have been approved!</p>
                </div>
              ) : (
                <ResponsiveTable
                  items={rejectedAudits}
                  keyField={(a) => a.id}
                  columns={[
                    {
                      key: 'date',
                      header: 'Rejected Date',
                      className: 'px-6 py-4',
                      render: (a) => {
                        const rejectedAt = a.rejectedAt ? new Date(a.rejectedAt) : new Date(a.updatedAt)
                        return rejectedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      }
                    },
                    {
                      key: 'branch',
                      header: 'Branch',
                      className: 'px-6 py-4 font-medium',
                      render: (a) => branches.find(b => b.id === a.branchId)?.name || 'Unknown Branch'
                    },
                    {
                      key: 'survey',
                      header: 'Survey',
                      className: 'px-6 py-4 text-gray-600',
                      render: (a) => surveys.find(s => s.id === a.surveyId)?.title || 'Unknown Survey'
                    },
                    {
                      key: 'reason',
                      header: 'Rejection Reason',
                      className: 'px-6 py-4 text-gray-600 max-w-md',
                      render: (a) => a.rejectionNote ? (
                        <span className="block truncate" title={a.rejectionNote}>{a.rejectionNote}</span>
                      ) : (
                        <span className="text-gray-400">No reason provided</span>
                      )
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      className: 'px-6 py-4 text-right',
                      render: (a) => (
                        <button
                          onClick={() => navigate(`/audit/${a.id}/wizard`)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Reopen & Fix
                        </button>
                      )
                    },
                  ] as Column<Audit>[]}
                  mobileItem={(a) => {
                    const branch = branches.find(b => b.id === a.branchId)
                    const survey = surveys.find(s => s.id === a.surveyId)
                    const rejectedAt = a.rejectedAt ? new Date(a.rejectedAt) : new Date(a.updatedAt)
                    
                    return (
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="mb-3">
                          <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{branch?.name || 'Unknown Branch'}</h3>
                          <p className="text-sm text-gray-600 truncate">{survey?.title || 'Unknown Survey'}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20">
                            ❌ Rejected
                          </span>
                          <span className="text-xs text-gray-600">
                            {rejectedAt.toLocaleDateString()}
                          </span>
                        </div>
                        
                        {a.rejectionNote && (
                          <div className="mb-3 p-3 bg-white rounded-lg border border-red-200">
                            <p className="text-xs font-medium text-gray-700 mb-1">Rejection Reason:</p>
                            <p className="text-sm text-gray-900">{a.rejectionNote}</p>
                          </div>
                        )}
                        
                        <button 
                          onClick={() => navigate(`/audit/${a.id}/wizard`)}
                          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                        >
                          <span>🔄</span>
                          <span>Reopen & Fix</span>
                        </button>
                      </div>
                    )
                  }}
                />
              )
            )}
            
            {/* Audit History Content */}
            {mainTab === 'history' && (
              recent.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-600 font-medium">No audit history</p>
                  <p className="text-sm text-gray-500 mt-1">Your audit history will appear here</p>
                </div>
              ) : (
                <ResponsiveTable
                  items={recent}
                  keyField={(a) => a.id}
                  columns={[
                    {
                      key: 'date',
                      header: 'Last Updated',
                      className: 'px-6 py-4',
                      render: (a) => new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    },
                    {
                      key: 'branch',
                      header: 'Branch',
                      className: 'px-6 py-4 font-medium',
                      render: (a) => branches.find(b => b.id === a.branchId)?.name || 'Unknown Branch'
                    },
                    {
                      key: 'survey',
                      header: 'Survey',
                      className: 'px-6 py-4 text-gray-600',
                      render: (a) => surveys.find(s => s.id === a.surveyId)?.title || 'Unknown Survey'
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      className: 'px-6 py-4',
                      render: (a) => <StatusBadge status={a.status} />
                    },
                    {
                      key: 'completion',
                      header: 'Completion',
                      className: 'px-6 py-4 text-gray-900 font-semibold',
                      render: (a) => {
                        const s = surveys.find(su => su.id === a.surveyId)
                        if (!s) return '0%'
                        // For completed/approved audits, show 100% regardless of calculated score
                        if (a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED) {
                          return '100%'
                        }
                        const comp = Math.round(calculateAuditScore(a, s).completionPercentage)
                        return `${comp}%`
                      }
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      className: 'px-6 py-4 text-right',
                      render: (a) => (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/audit/${a.id}/summary`)}
                            className="text-gray-600 hover:text-gray-900 font-medium text-sm"
                          >
                            View
                          </button>
                          {(a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS) && (
                            <button
                              onClick={() => navigate(`/audit/${a.id}/wizard`)}
                              className="text-primary-600 hover:text-primary-900 font-medium text-sm"
                            >
                              Continue
                            </button>
                          )}
                        </div>
                      )
                    },
                  ] as Column<Audit>[]}
                  mobileItem={(a) => {
                    const branch = branches.find(b => b.id === a.branchId)
                    const survey = surveys.find(s => s.id === a.surveyId)
                    const s = surveys.find(su => su.id === a.surveyId)
                    // For completed/approved audits, show 100% regardless of calculated score
                    const comp = !s ? 0 : 
                      (a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED) ? 100 :
                      Math.round(calculateAuditScore(a, s).completionPercentage)
                    
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{branch?.name || 'Unknown Branch'}</h3>
                            <p className="text-sm text-gray-600 truncate">{survey?.title || 'Unknown Survey'}</p>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 ml-4">{comp}%</div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <StatusBadge status={a.status} />
                          <span className="text-xs text-gray-600">
                            Updated {new Date(a.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => navigate(`/audit/${a.id}/summary`)}
                            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            <span>📊</span>
                            <span>View Summary</span>
                          </button>
                          {(a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS) && (
                            <button 
                              onClick={() => navigate(`/audit/${a.id}/wizard`)}
                              className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <span>▶</span>
                              <span>Continue</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  }}
                />
              )
            )}
          </div>
        </div>

        {/* Smart Survey Selection - Only Available Surveys */}
        {availableSurveys.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Start New Audit</h3>
              
              {/* Survey Selection */}
              {availableSurveys.length > 1 ? (
                <div className="space-y-2">
                  <label htmlFor="survey-select" className="block text-sm font-medium text-gray-700">Select Survey Template</label>
                  <select 
                    id="survey-select"
                    className="input w-full sm:max-w-md"
                    value={selectedSurveyId || ''} 
                    onChange={(e) => setSelectedSurveyId(e.target.value)}
                  >
                    {availableSurveys.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Survey:</span>
                  <span className="text-sm font-semibold text-gray-900">{selectedSurvey?.title}</span>
                </div>
              )}
              
              {/* Info Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {firstAllowedBranchId && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{allowedBranches.length} branch{allowedBranches.length !== 1 ? 'es' : ''} available</span>
                  </div>
                )}
                {availableSurveys.length < surveys.length && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>{surveys.length - availableSurveys.length} survey{surveys.length - availableSurveys.length !== 1 ? 's' : ''} unavailable</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Filters - mobile first */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  className="input w-full sm:max-w-xs"
                  placeholder="Search branches…"
                  aria-label="Search branches"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary-600 rounded"
                    checked={showAvailableOnly}
                    onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  />
                  <span>Available only</span>
                </label>
              </div>

              {assignedBranchesView.length === 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-sm text-gray-600">
                  {showAvailableOnly ? 'No available branches match your filter.' : 'No branches match your filter.'}
                </div>
              )}

              {assignedBranchesView.map(branch => {
                const isAllowed = allowedBranches.some(b => b.id === branch.id)
                const reason = isAllowed ? null : getBlockingReason(branch.id)

                return (
                  <div 
                    key={branch.id} 
                    className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${
                      isAllowed 
                        ? 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm' 
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                        isAllowed ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {branch.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{branch.name}</div>
                        {!isAllowed && reason && (
                          <button 
                            onClick={() => toast.error(reason)} 
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-0.5"
                          >
                            <InformationCircleIcon className="w-3.5 h-3.5" />
                            Why unavailable?
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                        isAllowed 
                          ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!isAllowed || createAudit.isPending || !selectedSurvey}
                      onClick={() => selectedSurvey && createAudit.mutate({ surveyId: selectedSurvey.id, branchId: branch.id })}
                    >
                      {createAudit.isPending && createAudit.variables?.branchId === branch.id ? 'Starting...' : 'Start'}
                    </button>
                  </div>
                )
              })}

              {assignedBranches.length === 0 && (
                <div className="p-4 bg-gray-100 border border-gray-200 rounded-xl text-center">
                  <p className="font-medium text-gray-700">No branches assigned</p>
                  <p className="text-sm text-gray-500 mt-1">Ask an admin to assign you to a branch or zone.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {availableSurveys.length === 0 && (
          <div className="card-spacious border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarDaysIcon className="w-10 h-10 text-amber-500" />
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
        <div className="hidden">
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
        <div className="hidden">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-gray-900">My Scheduled Audits</h3>
            <p className="text-gray-600 mt-1">Recent audit activity and upcoming tasks</p>
          </div>
          <div className="px-0 py-6 md:px-6">
            {(() => {
              const mine = allAudits.filter(a => a.assignedTo === user?.id && a.surveyId && a.periodStart)
              if (mine.length === 0) return <p className="text-gray-500">No scheduled audits.</p>
              const sorted = mine.sort((a,b) => new Date(a.dueAt || a.updatedAt).getTime() - new Date(b.dueAt || b.updatedAt).getTime()).slice(0, 8)
              return (
                <div>
                                    {/* Mobile-First Scheduled Cards */}
                                    <div className="space-y-4 md:hidden">
                                      {sorted.map(a => {
                                        const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                                        return (
                                          <MobileAuditCard
                                            key={a.id}
                                            audit={a}
                                            branchName={branchName}
                                            surveys={surveys}
                                            mode="scheduled"
                                            onSummary={() => navigate('/audits/' + a.id + '/summary')}
                                            onOpen={() => navigate('/audit/' + a.id + '/wizard')}
                                          />
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
                              <td className="px-3 py-1.5 text-sm lg:text-base">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '\u2014'}</td>
                              <td className="px-3 py-1.5 space-x-2 text-sm lg:text-base">
                                <StatusBadge status={a.status} />
                                {isDueToday && !isArchived && <InfoBadge label="Due Today" tone="warning" />}
                                {overdue && isArchived && <InfoBadge label="Archived" tone="gray" />}
                                {overdue && !isArchived && <InfoBadge label="Overdue" tone="danger" />}
                              </td>
                              <td className="px-3 py-1.5 text-right space-x-2">
                                <button className="btn btn-outline btn-responsive-sm" onClick={() => navigate(`/audits/${a.id}/summary`)}>Summary</button>
                                <button className="btn btn-primary btn-responsive-sm" onClick={() => navigate(`/audit/${a.id}/wizard`)}>Open</button>
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
        <div className="hidden">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SkeletonAuditCard />
                <SkeletonAuditCard />
                <SkeletonAuditCard />
              </div>
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ClipboardDocumentCheckIcon className="h-10 w-10 text-gray-400" />
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
                              className="btn btn-outline btn-responsive-sm"
                              onClick={() => navigate(`/audits/${a.id}/summary`)}
                            >
                              Summary
                            </button>
                            <button
                              className="btn btn-primary btn-responsive-sm"
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
        <div className="hidden">
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
                    const blockingReason = getBlockingReason(b.id)
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
                            title={blockingReason || undefined}
                          >
                            {createAudit.isPending ? 'Starting...' : blockingReason || 'Start Audit'}
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
                        const blockingReason = getBlockingReason(b.id)
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
                                className="btn btn-primary btn-sm disabled:opacity-60"
                                disabled={!canStart || !selectedSurvey || createAudit.isPending}
                                onClick={() => selectedSurvey && createAudit.mutate({ surveyId: selectedSurvey.id, branchId: b.id })}
                                title={blockingReason || undefined}
                              >
                                {blockingReason || 'Start Audit'}
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
