// (moved helpers inside component)
import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, Branch, Organization, AuditStatus, UserRole, Zone } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatusBadge from '@/components/StatusBadge'
import ResponsiveTable from '../components/ResponsiveTable'
import InfoBadge from '@/components/InfoBadge'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useOrganization } from '../contexts/OrganizationContext'

const DashboardAdmin: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { effectiveOrgId, isSuperAdmin, currentOrg } = useOrganization()

  const queryClient = useQueryClient()
  
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches', effectiveOrgId],
    queryFn: () => api.getBranches(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ['zones', effectiveOrgId],
    queryFn: () => api.getZones(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
  const { data: users = [] } = useQuery({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
  // surveys query removed from dashboard; not needed for KPIs here
  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ['audits', 'admin', effectiveOrgId],
    queryFn: () => api.getAudits({ orgId: effectiveOrgId }),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  // Get all branch manager assignments to identify branches without managers
  const { data: branchManagerAssignments = [] } = useQuery({
    queryKey: ['branch-manager-assignments'],
    queryFn: () => api.getAllBranchManagerAssignments(),
  })

  // Identify branches without assigned managers (admin needs to approve audits from these)
  const branchesWithoutManagers = React.useMemo(() => {
    const assignedBranchIds = new Set(
      branchManagerAssignments
        .filter(assignment => assignment.isActive)
        .map(assignment => assignment.branchId)
    )
    return branches.filter(branch => !assignedBranchIds.has(branch.id))
  }, [branches, branchManagerAssignments])

  // Audits from branches without managers that need admin approval
  const auditsNeedingAdminApproval = React.useMemo(() => {
    const branchIdsWithoutManagers = new Set(branchesWithoutManagers.map(b => b.id))
    return audits.filter(audit => 
      audit.status === AuditStatus.SUBMITTED && 
      branchIdsWithoutManagers.has(audit.branchId)
    )
  }, [audits, branchesWithoutManagers])

  const [statusFilter, setStatusFilter] = React.useState<'all' | 'finalized' | AuditStatus>('all')
  const [branchFilter, setBranchFilter] = React.useState<string>('all')
  const [auditorFilter, setAuditorFilter] = React.useState<string>('all')
  const [dateFrom, setDateFrom] = React.useState<string>('')
  const [dateTo, setDateTo] = React.useState<string>('')
  const [period, setPeriod] = React.useState<'week' | 'month' | 'quarter'>('week')
  const [quickChip, setQuickChip] = React.useState<'none' | 'due_this_week' | 'due_next_week' | 'overdue' | 'submitted' | 'waiting_approval' | 'completed' | 'approved' | 'finalized'>('none')
  const [searchInput, setSearchInput] = React.useState<string>('')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false)
  const [sortField, setSortField] = React.useState<'due' | 'updated' | 'status' | 'branch' | 'auditor'>('updated')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')
  const [viewScope, setViewScope] = React.useState<'week' | 'all'>('week')
  const [searchParams, setSearchParams] = useSearchParams()
  const filtersInitialized = React.useRef(false)

  const manualArchive = useMutation({
    mutationFn: (payload: { auditId: string; userId: string }) => api.manualArchiveAudit(payload.auditId, payload.userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.AUDITS('admin') }),
  })

  // Organization settings moved to Settings screen (admin-only)
  // Org-aware period helpers (mirrors server scheduling logic)
  const org = currentOrg
  const getOrgLocalNow = React.useCallback((now: Date) => {
    try { return new Date(now.toLocaleString('en-US', { timeZone: org?.timeZone || 'UTC' })) } catch { return new Date(now) }
  }, [org?.timeZone])

  const nowTs = Date.now()
  const isOverdue = React.useCallback((a: Audit) => !!a.dueAt && new Date(a.dueAt).getTime() < nowTs && a.status !== AuditStatus.APPROVED && a.status !== AuditStatus.REJECTED, [nowTs])

  // Weekly insights - fixed to current week only
  const weeklyAudits = React.useMemo(() => {
    const now = new Date()
    const orgNow = getOrgLocalNow(now)
    const startOfWeek = (d: Date) => {
      const w = (org?.weekStartsOn ?? 1) as 0 | 1
      const day = d.getDay()
      const diff = (day - w + 7) % 7
      const s = new Date(d); s.setDate(d.getDate() - diff); s.setHours(0,0,0,0); return s
    }
    const endOfWeek = (d: Date) => { const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999); return e }
    const weekStart = startOfWeek(orgNow)
    const weekEnd = endOfWeek(orgNow)
    const delta = orgNow.getTime() - now.getTime()
    const adjustedStart = new Date(weekStart.getTime() - delta)
    const adjustedEnd = new Date(weekEnd.getTime() - delta)
    
    return audits.filter(a => {
      const t = a.periodStart ? new Date(a.periodStart).getTime() : new Date(a.updatedAt).getTime()
      return t >= adjustedStart.getTime() && t <= adjustedEnd.getTime()
    })
  }, [audits, getOrgLocalNow, org?.weekStartsOn])

  const completedOrApproved = weeklyAudits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED)
  const completionRate = weeklyAudits.length > 0 ? Math.round((completedOrApproved.length / weeklyAudits.length) * 100) : 0
  
  // On-time rate: Simple logic - 100% unless there are overdue audits
  const auditsWithDueDates = weeklyAudits.filter(a => a.dueAt)
  const overdueAuditsAll = auditsWithDueDates.filter(isOverdue) // All overdue (including completed late)
  const onTimeRate = auditsWithDueDates.length > 0 ? 
    Math.round(((auditsWithDueDates.length - overdueAuditsAll.length) / auditsWithDueDates.length) * 100) : 100
  const coverageBranches = React.useMemo(() => new Set(weeklyAudits.map(a => a.branchId)), [weeklyAudits])

  // Zone coverage summary (top 5 by scheduled) - Weekly focus
  const zoneRows = React.useMemo(() => {
    const rows = zones.map((z) => {
      const bids = new Set(z.branchIds)
      const list = weeklyAudits.filter((a) => bids.has(a.branchId))
      const scheduled = list.length
      const completed = list.filter((a) => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
      const overdue = list.filter(a => isOverdue(a) && a.status !== AuditStatus.COMPLETED && a.status !== AuditStatus.APPROVED).length
      return { id: z.id, name: z.name, scheduled, completed, overdue }
    }).sort((a, b) => b.scheduled - a.scheduled).slice(0, 5)
    return rows
  }, [zones, weeklyAudits, isOverdue])

  const filteredAudits = React.useMemo(() => {
    const sourceAudits = viewScope === 'week' ? weeklyAudits : audits
    const filtered = sourceAudits.filter(a => {
      const statusOk = statusFilter === 'all' || (statusFilter === 'finalized' ? (a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED) : a.status === statusFilter)
      const branchOk = branchFilter === 'all' || a.branchId === branchFilter
      const auditorOk = auditorFilter === 'all' || a.assignedTo === auditorFilter
      const t = new Date(a.updatedAt).getTime()
      const fromOk = !dateFrom || t >= new Date(dateFrom).getTime()
      const toOk = !dateTo || t <= new Date(dateTo).getTime()
      let quickOk = true
      if (quickChip === 'due_this_week') quickOk = !!(a.dueAt && !isOverdue(a))
      else if (quickChip === 'due_next_week') {
        // Check if due in next week
        const now = new Date()
        const nextWeekStart = new Date(now)
        nextWeekStart.setDate(now.getDate() + 7)
        nextWeekStart.setHours(0, 0, 0, 0)
        const nextWeekEnd = new Date(nextWeekStart)
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
        nextWeekEnd.setHours(23, 59, 59, 999)
        const dueDate = a.dueAt ? new Date(a.dueAt) : null
        quickOk = !!(dueDate && dueDate >= nextWeekStart && dueDate <= nextWeekEnd)
      }
      else if (quickChip === 'overdue') quickOk = isOverdue(a)
      else if (quickChip === 'submitted') quickOk = a.status === AuditStatus.SUBMITTED
      else if (quickChip === 'waiting_approval') quickOk = a.status === AuditStatus.SUBMITTED
      else if (quickChip === 'completed') quickOk = a.status === AuditStatus.COMPLETED
      else if (quickChip === 'approved') quickOk = a.status === AuditStatus.APPROVED
      else if (quickChip === 'finalized') quickOk = a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED
      // search across ID, branch name, auditor name
      const q = searchQuery.trim().toLowerCase()
      let searchOk = true
      if (q) {
        const branchName = branches.find(b => b.id === a.branchId)?.name?.toLowerCase() || ''
        const auditorName = users.find(u => u.id === a.assignedTo)?.name?.toLowerCase() || ''
        searchOk = a.id.toLowerCase().includes(q) || branchName.includes(q) || auditorName.includes(q)
      }
      return statusOk && branchOk && auditorOk && fromOk && toOk && quickOk && searchOk
    })
    
    // Apply sorting based on selected field and direction
    return filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortField) {
        case 'due':
          aVal = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER
          bVal = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER
          break
        case 'updated':
          aVal = new Date(a.updatedAt).getTime()
          bVal = new Date(b.updatedAt).getTime()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'branch':
          aVal = branches.find(br => br.id === a.branchId)?.name || a.branchId
          bVal = branches.find(br => br.id === b.branchId)?.name || b.branchId
          break
        case 'auditor':
          aVal = users.find(u => u.id === a.assignedTo)?.name || a.assignedTo || ''
          bVal = users.find(u => u.id === b.assignedTo)?.name || b.assignedTo || ''
          break
        default:
          aVal = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER
          bVal = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER
      }
      
      // Handle string vs number comparison
      let result = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        result = aVal.localeCompare(bVal)
      } else {
        result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      }
      
      return sortDirection === 'desc' ? -result : result
    })
  }, [viewScope, weeklyAudits, audits, statusFilter, branchFilter, auditorFilter, dateFrom, dateTo, quickChip, isOverdue, searchQuery, branches, users, sortField, sortDirection])

  const completedCount = weeklyAudits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
  const inProgressCount = weeklyAudits.filter(a => a.status === AuditStatus.IN_PROGRESS).length
  
  // Real-time priorities (not period-filtered)
  const dueThisWeekCount = weeklyAudits.filter(a => a.dueAt && !isOverdue(a)).length
  const overdueCountAll = audits.filter(a => isOverdue(a) && a.status !== AuditStatus.COMPLETED && a.status !== AuditStatus.APPROVED).length

  // User management stats
  const activeUsersCount = users.filter(u => u.isActive !== false).length
  const pendingInvitesCount = users.filter(u => !u.emailVerified).length

  const hasFilters = React.useMemo(() => (
    statusFilter !== 'all' || branchFilter !== 'all' || auditorFilter !== 'all' || !!dateFrom || !!dateTo || quickChip !== 'none' || searchQuery.trim() !== ''
  ), [statusFilter, branchFilter, auditorFilter, dateFrom, dateTo, quickChip, searchQuery])

  // Debounce search input -> query
  React.useEffect(() => {
    const h = window.setTimeout(() => setSearchQuery(searchInput), 150)
    return () => window.clearTimeout(h)
  }, [searchInput])

  // Initialize filters from URL once
  React.useEffect(() => {
    if (filtersInitialized.current) return
    const sp = searchParams
    const s = sp.get('status') as 'all' | 'finalized' | AuditStatus | null
    const b = sp.get('branch')
    const a = sp.get('auditor')
    const f = sp.get('from')
    const t = sp.get('to')
    const c = sp.get('chip') as 'none' | 'due_this_week' | 'due_next_week' | 'overdue' | 'submitted' | 'waiting_approval' | 'completed' | 'approved' | 'finalized' | null
    const q = sp.get('q')
    const p = sp.get('period') as 'week' | 'month' | 'quarter' | null
    if (s) setStatusFilter(s as 'all' | 'finalized' | AuditStatus)
    if (b) setBranchFilter(b)
    if (a) setAuditorFilter(a)
    if (f) setDateFrom(f)
    if (t) setDateTo(t)
    if (c) setQuickChip(c)
    if (q) { setSearchInput(q); setSearchQuery(q) }
    if (p) setPeriod(p)
    filtersInitialized.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist filters to URL (after init)
  React.useEffect(() => {
    if (!filtersInitialized.current) return
    const params: Record<string, string> = {}
    if (statusFilter !== 'all') params.status = statusFilter as string
    if (branchFilter !== 'all') params.branch = branchFilter
    if (auditorFilter !== 'all') params.auditor = auditorFilter
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    if (quickChip !== 'none') params.chip = quickChip
    if (searchQuery.trim()) params.q = searchQuery.trim()
    if (period !== 'week') params.period = period
    setSearchParams(params, { replace: true })
  }, [statusFilter, branchFilter, auditorFilter, dateFrom, dateTo, quickChip, searchQuery, period, setSearchParams])

  // Highlight helper
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const highlightMatch = (text: string): React.ReactNode => {
    const q = searchQuery.trim()
    if (!q) return text
    try {
      const re = new RegExp(`(${escapeRegExp(q)})`, 'ig')
      const parts = text.split(re)
      return parts.map((part, i) => (
        i % 2 === 1 ? <mark key={i} className="bg-yellow-100 text-gray-900 rounded px-0.5">{part}</mark> : <span key={i}>{part}</span>
      ))
    } catch { return text }
  }

  // Active badges (when panel collapsed)
  const activeBadges = React.useMemo(() => {
    const arr: { key: string; label: string; onClear: () => void }[] = []
    if (statusFilter !== 'all') arr.push({ key: 'status', label: `Status: ${statusFilter.replace('_',' ')}`, onClear: () => setStatusFilter('all') })
    if (branchFilter !== 'all') arr.push({ key: 'branch', label: `Branch: ${branches.find(b => b.id === branchFilter)?.name || branchFilter}` , onClear: () => setBranchFilter('all') })
    if (auditorFilter !== 'all') arr.push({ key: 'auditor', label: `Auditor: ${users.find(u => u.id === auditorFilter)?.name || auditorFilter}`, onClear: () => setAuditorFilter('all') })
    if (dateFrom) arr.push({ key: 'from', label: `From: ${dateFrom}`, onClear: () => setDateFrom('') })
    if (dateTo) arr.push({ key: 'to', label: `To: ${dateTo}`, onClear: () => setDateTo('') })
    if (searchQuery.trim()) arr.push({ key: 'q', label: `Search: ${searchQuery.trim()}`, onClear: () => { setSearchInput(''); setSearchQuery('') } })
    return arr
  }, [statusFilter, branchFilter, auditorFilter, dateFrom, dateTo, searchQuery, branches, users])

  const clearAllFilters = () => {
    setStatusFilter('all')
    setBranchFilter('all')
    setAuditorFilter('all')
    setDateFrom('')
    setDateTo('')
    setQuickChip('none')
    setSearchQuery('')
  }


  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="mobile-container breathing-room">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">{branches.length} branches • {audits.length} audits • {user?.name}</p>
          </div>
          
          <button 
            className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            onClick={() => navigate('/manage/surveys')}
          >
            + Create Survey Template
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <button 
            className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md transition-shadow"
            onClick={() => navigate('/manage/branches')}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl">🏢</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
            <p className="text-sm text-gray-600 mt-1">Branches</p>
          </button>
          
          <button 
            className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md transition-shadow"
            onClick={() => navigate('/manage/zones')}
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl">🗺️</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{zones.length}</p>
            <p className="text-sm text-gray-600 mt-1">Zones</p>
          </button>
          
          <button 
            className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md transition-shadow"
            onClick={() => navigate('/manage/users')}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl">👥</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeUsersCount}</p>
            <p className="text-sm text-gray-600 mt-1">Active Users</p>
          </button>
          
          <button 
            className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md transition-shadow"
            onClick={() => navigate('/manage/users')}
          >
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl">✉️</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingInvitesCount}</p>
            <p className="text-sm text-gray-600 mt-1">Pending Invites</p>
          </button>

          {/* Branches Without Managers - Needs Attention */}
          {branchesWithoutManagers.length > 0 ? (
            <button 
              className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-4 text-left hover:shadow-md transition-shadow"
              onClick={() => navigate('/manage/branches')}
              title="Branches without assigned managers need attention"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl">⚠️</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{branchesWithoutManagers.length}</p>
              <p className="text-sm text-amber-800 font-medium mt-1">No Manager</p>
            </button>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-left">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl">✅</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-600 mt-1">No Manager</p>
            </div>
          )}

          {/* Audits Needing Admin Approval */}
          {auditsNeedingAdminApproval.length > 0 ? (
            <button 
              className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-lg p-4 text-left hover:shadow-md transition-shadow"
              onClick={() => {
                setStatusFilter(AuditStatus.SUBMITTED)
                setQuickChip('waiting_approval')
              }}
              title="Submitted audits from branches without managers need admin approval"
            >
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl">🔔</span>
              </div>
              <p className="text-2xl font-bold text-red-900">{auditsNeedingAdminApproval.length}</p>
              <p className="text-sm text-red-800 font-medium mt-1">Need Approval</p>
            </button>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-left">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl">✓</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-600 mt-1">Need Approval</p>
            </div>
          )}
        </div>

        {/* Weekly Insights - Fixed to Current Week */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weekly Insights</h2>
              <p className="text-sm text-gray-600 mt-1">Current week performance</p>
            </div>
          </div>
          
          {/* Metrics Grid - Unified Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Overdue Priority */}
            {overdueCountAll > 0 ? (
              <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-5 text-white">
                <p className="text-sm font-medium opacity-90">Overdue</p>
                <p className="text-4xl font-bold mt-2">{overdueCountAll}</p>
                <p className="text-sm mt-1 opacity-90">Urgent action required</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-xl">✅</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600 mt-1">Overdue</p>
              </div>
            )}
            
            {/* Due This Week */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl">⏰</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{dueThisWeekCount}</p>
              <p className="text-sm text-gray-600 mt-1">Due This Week</p>
            </div>

            {/* Completion Rate */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
              <p className="text-sm text-gray-600 mt-1">Completion</p>
              <p className="text-xs text-gray-500 mt-1">{completedCount} of {weeklyAudits.length}</p>
            </div>

            {/* In Progress */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl">⚡</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{inProgressCount}</p>
              <p className="text-sm text-gray-600 mt-1">In Progress</p>
            </div>

            {/* On-time Rate */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
                <ClipboardDocumentListIcon className="w-6 h-6 text-primary-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{onTimeRate}%</p>
              <p className="text-sm text-gray-600 mt-1">On-time</p>
            </div>

            {/* Branches Coverage */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-xl">🏢</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{coverageBranches.size}</p>
              <p className="text-sm text-gray-600 mt-1">Branches</p>
            </div>
          </div>
        </div>

        {/* Organization Settings moved to the Settings (cogwheel) screen for admins */}

        {/* Zone coverage + Recent activity row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Zone coverage */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-lg font-medium text-gray-900">Weekly Zone Coverage</h3>
              <span className="text-xs text-gray-500">This week • Top 5</span>
            </div>
            <div className="p-4 sm:p-6">
              {zoneRows.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No zones or audits this period.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {zoneRows.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{r.scheduled}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{r.completed}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={r.overdue > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                              {r.overdue}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-4 sm:p-6">
              {(() => {
                // Derive activity from recent audits with detailed information
                const recentAudits = [...audits]
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .slice(0, 10)
                
                if (recentAudits.length === 0) {
                  return <p className="text-gray-500 text-center py-8">No recent activity.</p>
                }

                // Build activity items with detailed info
                const activityItems = recentAudits.map((audit) => {
                  const branch = branches.find(b => b.id === audit.branchId)
                  const auditor = users.find(u => u.id === audit.assignedTo)
                  
                  let action = ''
                  let actor = ''
                  let timestamp = new Date(audit.updatedAt)
                  
                  if (audit.status === AuditStatus.APPROVED && audit.approvedBy) {
                    const approver = users.find(u => u.id === audit.approvedBy)
                    action = '✅ Approved'
                    actor = approver?.name || 'Unknown Manager'
                    timestamp = audit.approvedAt ? new Date(audit.approvedAt) : timestamp
                  } else if (audit.status === AuditStatus.REJECTED && audit.rejectedBy) {
                    const rejecter = users.find(u => u.id === audit.rejectedBy)
                    action = '❌ Rejected'
                    actor = rejecter?.name || 'Unknown Manager'
                    timestamp = audit.rejectedAt ? new Date(audit.rejectedAt) : timestamp
                  } else if (audit.status === AuditStatus.SUBMITTED && audit.submittedBy) {
                    const submitter = users.find(u => u.id === audit.submittedBy)
                    action = '📤 Submitted for Approval'
                    actor = submitter?.name || auditor?.name || 'Unknown'
                    timestamp = audit.submittedAt ? new Date(audit.submittedAt) : timestamp
                  } else if (audit.status === AuditStatus.COMPLETED) {
                    action = '✔️ Completed'
                    actor = auditor?.name || 'Unknown Auditor'
                  } else if (audit.status === AuditStatus.IN_PROGRESS) {
                    action = '🔄 In Progress'
                    actor = auditor?.name || 'Unknown Auditor'
                  } else if (audit.status === AuditStatus.DRAFT) {
                    action = '📝 Draft Created'
                    actor = auditor?.name || 'Unassigned'
                  } else {
                    action = '📋 Updated'
                    actor = auditor?.name || 'Unknown'
                  }
                  
                  return {
                    id: audit.id,
                    action,
                    actor,
                    branch: branch?.name || 'Unknown Branch',
                    timestamp,
                    audit,
                  }
                })
                
                return (
                  <ResponsiveTable
                    items={activityItems}
                    keyField={(item) => item.id}
                    mobileItem={(item) => {
                      const user = users.find(u => u.name === item.actor)
                      const initials = item.actor.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      
                      return (
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900">{item.action}</div>
                              <div className="text-sm text-gray-600 mt-1">{item.branch}</div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {item.timestamp.toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {user?.avatarUrl ? (
                              <img src={user.avatarUrl} alt={item.actor} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                                {initials}
                              </div>
                            )}
                            <span className="text-xs text-gray-500 font-medium">{item.actor}</span>
                          </div>
                          <button
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            onClick={() => navigate(`/audits/${item.audit.id}/summary`)}
                          >
                            View Details →
                          </button>
                        </div>
                      )
                    }}
                    columns={[
                      {
                        key: 'action',
                        header: 'Action',
                        render: (item) => (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.action}</span>
                          </div>
                        ),
                      },
                      {
                        key: 'branch',
                        header: 'Branch',
                        render: (item) => (
                          <div className="text-sm text-gray-900">{item.branch}</div>
                        ),
                      },
                      {
                        key: 'actor',
                        header: 'By',
                        render: (item) => {
                          const user = users.find(u => u.name === item.actor)
                          const initials = item.actor.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          
                          return (
                            <div className="flex items-center gap-2">
                              {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt={item.actor} className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                                  {initials}
                                </div>
                              )}
                              <span className="text-sm text-gray-600">{item.actor}</span>
                            </div>
                          )
                        },
                      },
                      {
                        key: 'timestamp',
                        header: 'When',
                        render: (item) => (
                          <div className="text-xs text-gray-500">
                            {item.timestamp.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        ),
                      },
                      {
                        key: 'actions',
                        header: '',
                        className: 'text-right',
                        render: (item) => (
                          <button
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            onClick={() => navigate(`/audits/${item.audit.id}/summary`)}
                          >
                            View →
                          </button>
                        ),
                      },
                    ]}
                  />
                )
              })()}
            </div>
          </div>
        </div>

        {/* This Week's Audits - Full width row */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {viewScope === 'week' ? 'This Week\'s Audits' : 'All Audits'}
                </h3>
                {/* View Scope Toggle */}
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                  <button 
                    className={`px-4 py-2 text-sm font-medium transition-colors ${viewScope === 'week' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`} 
                    onClick={() => setViewScope('week')}
                  >
                    This Week
                  </button>
                  <button 
                    className={`px-4 py-2 text-sm font-medium transition-colors ${viewScope === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`} 
                    onClick={() => setViewScope('all')}
                  >
                    All Audits
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {/* Professional Search & Filter Bar */}
              <div className="mb-4 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search audit, branch, auditor..."
                    className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all"
                  />
                </div>
                
                {/* Compact Filter & Sort Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Quick Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</label>
                    <select 
                      className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[140px]" 
                      value={quickChip} 
                      onChange={(e) => setQuickChip(e.target.value as typeof quickChip)}
                    >
                      <option value="none">All</option>
                      <option value="overdue">🚨 Overdue</option>
                      <option value="due_this_week">⏰ Due This Week</option>
                      <option value="due_next_week">📅 Due Next Week</option>
                      <option value="submitted">📤 Submitted</option>
                      <option value="waiting_approval">⏳ Pending</option>
                      <option value="completed">✅ Completed</option>
                      <option value="approved">👍 Approved</option>
                      <option value="finalized">🎯 Finalized</option>
                    </select>
                  </div>
                  
                  {/* Sort Controls */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</label>
                    <select 
                      className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[100px]" 
                      value={sortField} 
                      onChange={(e) => setSortField(e.target.value as typeof sortField)}
                    >
                      <option value="due">Due Date</option>
                      <option value="updated">Updated</option>
                      <option value="status">Status</option>
                      <option value="branch">Branch</option>
                      <option value="auditor">Auditor</option>
                    </select>
                    <button 
                      className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
                    >
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
                
                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                      onClick={() => setShowAdvanced((v) => !v)}
                    >
                      <FunnelIcon className="w-4 h-4" />
                      <span>Advanced Filters</span>
                    </button>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                      {filteredAudits.length} results
                    </div>
                  </div>
                  <button 
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors px-3 py-2"
                    onClick={clearAllFilters} 
                    disabled={!hasFilters}
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>
                
              </div>
              
              {/* Active Filter Badges */}
              {!showAdvanced && activeBadges.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {activeBadges.map(b => (
                    <span key={b.key} className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      {b.label}
                      <button className="hover:text-gray-900" onClick={b.onClear} aria-label={`Clear ${b.key}`}>
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Advanced Filters */}
              {showAdvanced && (
                  <div className="mt-3 p-3 border rounded-md bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <label className="label">Status</label>
                        <select className="input h-9" value={statusFilter} onChange={(e) => setStatusFilter((e.target.value as 'all' | 'finalized' | AuditStatus))}>
                          <option value="all">All</option>
                          <option value={AuditStatus.DRAFT}>Draft</option>
                          <option value={AuditStatus.IN_PROGRESS}>In Progress</option>
                          <option value={AuditStatus.COMPLETED}>Completed</option>
                          <option value={AuditStatus.APPROVED}>Approved</option>
                          <option value={AuditStatus.REJECTED}>Rejected</option>
                          <option value="finalized">Finalized (Completed + Approved)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Branch</label>
                        <select className="input h-9" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                          <option value="all">All</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Auditor</label>
                        <select className="input h-9" value={auditorFilter} onChange={(e) => setAuditorFilter(e.target.value)}>
                          <option value="all">All</option>
                          {users.filter(u => u.role === UserRole.AUDITOR).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label">From</label>
                          <input type="date" className="input h-9" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>
                        <div>
                          <label className="label">To</label>
                          <input type="date" className="input h-9" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowAdvanced(false)}>Close</button>
                      <button className="btn btn-ghost btn-sm disabled:opacity-50" onClick={clearAllFilters} disabled={!hasFilters}>Clear all</button>
                    </div>
                  </div>
                )}
              
              <ResponsiveTable
                items={filteredAudits.slice(0, viewScope === 'week' ? 8 : 20)}
                keyField={(a: Audit) => a.id}
                empty={
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <span className="text-3xl">📋</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {viewScope === 'week' ? 'No audits scheduled this week' : 'No audits found'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {viewScope === 'week' 
                        ? 'There are no audits scheduled for the current week.'
                        : hasFilters 
                          ? 'Try adjusting your filters or search criteria.'
                          : 'Get started by creating your first audit.'}
                    </p>
                    {viewScope === 'week' && audits.length > 0 && (
                      <button
                        onClick={() => setViewScope('all')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        View All Audits
                      </button>
                    )}
                    {!hasFilters && audits.length === 0 && (
                      <button
                        onClick={() => navigate('/manage/surveys')}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        Create Survey Template
                      </button>
                    )}
                  </div>
                }
                mobileItem={(a: Audit) => {
                  const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
                  const auditorName = users.find(u => u.id === a.assignedTo)?.name || 'Unassigned'
                  const isOverdue = a.dueAt && new Date(a.dueAt) < new Date()
                  const isDueToday = a.dueAt && new Date(a.dueAt).toDateString() === new Date().toDateString()
                  const pastDue = a.dueAt ? new Date(a.dueAt).getTime() < Date.now() : false
                  const canManualArchive = !a.isArchived && pastDue && (a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS || a.status === AuditStatus.SUBMITTED)
                  
                  return (
                    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      {/* Card Header */}
                      <div className="mb-4">
                        {/* Title Row */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-base font-bold text-primary-600">
                              {a.id.slice(-2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-base truncate">
                              {highlightMatch(a.id)}
                            </h4>
                            <p className="text-gray-600 text-sm truncate">{highlightMatch(branchName)}</p>
                          </div>
                        </div>
                        
                        {/* Status Labels Row */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
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
                            {a.isArchived && <InfoBadge label="Archived" tone="gray" />}
                        </div>
                        
                        {/* Audit Details */}
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Auditor:</span>
                            <span className="font-medium text-gray-900">{highlightMatch(auditorName)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Updated:</span>
                            <span className="text-gray-900">{new Date(a.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Due Date:</span>
                            <span className="text-gray-900">{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            className="w-full sm:flex-1 bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors"
                            onClick={() => navigate(`/audits/${a.id}/summary`)}
                          >
                            View Summary
                          </button>
                          {(a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS) && (
                            <button 
                              className="w-full sm:flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                              onClick={() => navigate(`/audit/${a.id}/wizard`)}
                            >
                              Edit
                            </button>
                          )}
                          {canManualArchive && (
                            <button 
                              className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                              onClick={() => manualArchive.mutate({ auditId: a.id, userId: user!.id })} 
                              disabled={manualArchive.isPending}
                            >
                              {manualArchive.isPending ? 'Archiving...' : 'Archive'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }}
                columns={[
                  { key: 'audit', header: 'Audit', render: (a: Audit) => highlightMatch(a.id) },
                  { 
                    key: 'branch', 
                    header: (
                      <button 
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                        onClick={() => {
                          if (sortField === 'branch') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('branch')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        Branch {sortField === 'branch' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    ), 
                    render: (a: Audit) => highlightMatch(branches.find(b => b.id === a.branchId)?.name || a.branchId) 
                  },
                  { 
                    key: 'auditor', 
                    header: (
                      <button 
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                        onClick={() => {
                          if (sortField === 'auditor') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('auditor')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        Auditor {sortField === 'auditor' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    ), 
                    render: (a: Audit) => highlightMatch(users.find(u => u.id === a.assignedTo)?.name || a.assignedTo || '') 
                  },
                  { 
                    key: 'status', 
                    header: (
                      <button 
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                        onClick={() => {
                          if (sortField === 'status') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('status')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    ), 
                    render: (a: Audit) => <StatusBadge status={a.status} /> 
                  },
                  { 
                    key: 'due', 
                    header: (
                      <button 
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                        onClick={() => {
                          if (sortField === 'due') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('due')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        Due Date {sortField === 'due' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    ), 
                    render: (a: Audit) => a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—' 
                  },
                  { key: 'archived', header: 'Archived', render: (a: Audit) => a.isArchived ? 'Yes' : 'No' },
                  { 
                    key: 'updated', 
                    header: (
                      <button 
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                        onClick={() => {
                          if (sortField === 'updated') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('updated')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        Updated {sortField === 'updated' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    ), 
                    render: (a: Audit) => new Date(a.updatedAt).toLocaleDateString() 
                  },
                  { key: 'actions', header: '', className: 'text-right', render: (a: Audit) => {
                    const pastDue = a.dueAt ? new Date(a.dueAt).getTime() < Date.now() : false
                    const canManualArchive = !a.isArchived && pastDue && (a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS || a.status === AuditStatus.SUBMITTED)
                    const canEdit = a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS
                    
                    return (
                      <div className="flex items-center gap-1 justify-end">
                        <button 
                          className="btn btn-ghost btn-sm text-xs px-2 py-1"
                          onClick={() => navigate(`/audits/${a.id}/summary`)}
                          title="View audit summary"
                        >
                          View
                        </button>
                        {canEdit && (
                          <button 
                            className="btn btn-primary btn-sm text-xs px-2 py-1"
                            onClick={() => navigate(`/audit/${a.id}/wizard`)}
                            title="Edit audit"
                          >
                            Edit
                          </button>
                        )}
                        {canManualArchive && (
                          <button 
                            className="btn btn-danger btn-sm text-xs px-2 py-1" 
                            onClick={() => manualArchive.mutate({ auditId: a.id, userId: user!.id })} 
                            disabled={manualArchive.isPending}
                            title="Archive overdue audit"
                          >
                            {manualArchive.isPending ? 'Archiving…' : 'Archive'}
                          </button>
                        )}
                      </div>
                    )
                  }},
                ]}
              />
            </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardAdmin
