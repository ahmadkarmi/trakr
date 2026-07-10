  // (moved helpers inside component)
import React, { useMemo } from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, Branch, AuditStatus, UserRole, Zone, User } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatusBadge from '@/components/StatusBadge'
import ResponsiveTable from '../components/ResponsiveTable'
import InfoBadge from '@/components/InfoBadge'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { useOrganization } from '../contexts/OrganizationContext'
import toast from 'react-hot-toast'
import MetricCard from '../components/MetricCard'
import ErrorState from '../components/ErrorState'

// Admin Organization Onboarding Component
const AdminOrgOnboarding: React.FC = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [orgName, setOrgName] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const createOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      const org = await (api as any).createOrganization(name)
      // Update current user's org_id
      if (user) {
        await (api as any).updateUser(user.id, { org_id: org.id })
      }
      return org
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.ORGANIZATIONS })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Organization created successfully!')
      // Refresh the page to reload org context
      window.location.reload()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create organization')
    }
  })
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (orgName.trim()) {
      setIsSubmitting(true)
      createOrgMutation.mutate(orgName.trim())
    }
  }

  return (
    <DashboardLayout title="Welcome to Trakr">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white dark:bg-(--color-card) rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <BuildingOffice2Icon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome, {user?.name}!
            </h1>
            <p className="text-lg text-gray-600 dark:text-slate-300">
              Let's get started by creating your organization
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-500/20 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  As an Admin, you'll be able to manage branches, surveys, users, and audits within your organization.
                  Any users you invite will automatically join your organization.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="w-full px-4 py-3 border border-gray-300 dark:border-white/15 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-white/5 dark:text-white"
                required
                disabled={isSubmitting}
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                This will be the name of your organization across the platform
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={!orgName.trim() || isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </span>
                ) : (
                  'Create Organization'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">What's next?</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>Set up your branches and locations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>Create survey templates for audits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>Invite branch managers and auditors (they'll join your org automatically)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>Start conducting audits!</span>
              </li>
            </ul>
          </div>
        </div>

        {/* (Removed preview card here; logs are shown in main DashboardAdmin screen) */}
      </div>
    </DashboardLayout>
  )
}

const DashboardAdmin: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { effectiveOrgId, isSuperAdmin, currentOrg, isLoading: orgLoading } = useOrganization()

  const queryClient = useQueryClient()

  // Force a refresh of org-scoped data when user/org/scope changes (prevents stale weekly tiles after login)
  const lastScopeKey = React.useRef<string>('')
  React.useEffect(() => {
    const scopeKey = `${user?.id || 'anon'}|${effectiveOrgId || 'ALL'}|${isSuperAdmin ? 'SA' : 'ORG'}`
    if (lastScopeKey.current === scopeKey) return
    lastScopeKey.current = scopeKey
    queryClient.invalidateQueries({ queryKey: ['audits'] })
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['zones'] })
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['branch-manager-assignments'] })
  }, [user?.id, effectiveOrgId, isSuperAdmin, queryClient])
  
  // IMPORTANT: Call ALL hooks before any conditional returns (Rules of Hooks)
  const { data: branches = [], isLoading: branchesLoading, isError: branchesError } = useQuery<Branch[]>({
    queryKey: ['branches', effectiveOrgId, user?.id],
    queryFn: () => api.getBranches(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
    staleTime: 2 * 60 * 1000,
  })
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ['zones', effectiveOrgId, user?.id],
    queryFn: () => api.getZones(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
    staleTime: 2 * 60 * 1000,
  })
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', effectiveOrgId, user?.id],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
    staleTime: 2 * 60 * 1000,
  })
  // surveys query removed with Unassigned feature
  const { data: audits = [], isError: auditsError } = useQuery<Audit[]>({
    queryKey: ['audits', 'admin', effectiveOrgId, user?.id],
    queryFn: () => api.getAudits({ orgId: effectiveOrgId }),
    enabled: !!effectiveOrgId || isSuperAdmin,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  // Recent Activity feed: derive from the 10 most recently updated audits.
  // Memoized so an unrelated re-render (e.g. typing in a filter) doesn't re-sort
  // the full audits array and re-run 4 linear .find() calls per row.
  const activityItems = useMemo(() => {
    const branchById = new Map(branches.map(b => [b.id, b]))
    const userById = new Map(users.map(u => [u.id, u]))

    const recentAudits = [...audits]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)

    return recentAudits.map((audit) => {
      const branch = branchById.get(audit.branchId)
      const auditor = userById.get(audit.assignedTo)

      let action = ''
      let actor = ''
      let timestamp = new Date(audit.updatedAt)

      if (audit.status === AuditStatus.APPROVED && audit.approvedBy) {
        const approver = userById.get(audit.approvedBy)
        action = '✅ Approved'
        actor = approver?.name || 'Unknown Manager'
        timestamp = audit.approvedAt ? new Date(audit.approvedAt) : timestamp
      } else if (audit.status === AuditStatus.REJECTED && audit.rejectedBy) {
        const rejecter = userById.get(audit.rejectedBy)
        action = '❌ Rejected'
        actor = rejecter?.name || 'Unknown Manager'
        timestamp = audit.rejectedAt ? new Date(audit.rejectedAt) : timestamp
      } else if (audit.status === AuditStatus.SUBMITTED && audit.submittedBy) {
        const submitter = userById.get(audit.submittedBy)
        action = '📤 Submitted for Approval'
        actor = submitter?.name || auditor?.name || 'Unknown'
        timestamp = audit.submittedAt ? new Date(audit.submittedAt) : timestamp
      } else if (audit.status === AuditStatus.COMPLETED) {
        action = '✔️ Completed'
        const completedByUser = userById.get((audit as any).completedBy)
        actor = completedByUser?.name || auditor?.name || 'Unknown Auditor'
      } else if (audit.status === AuditStatus.IN_PROGRESS) {
        action = '🔄 In Progress'
        const startedByUser = userById.get((audit as any).startedBy)
        actor = startedByUser?.name || auditor?.name || 'Unknown Auditor'
      } else if (audit.status === AuditStatus.DRAFT) {
        action = '📝 Draft Created'
        const creator = userById.get((audit as any).createdBy)
        actor = (audit as any).createdOrigin === 'SYSTEM_SCHEDULED'
          ? 'System'
          : (creator?.name || auditor?.name || 'Unassigned')
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
  }, [audits, branches, users])

  // Auditor filter dropdown options: avoid re-filtering the full users list on every
  // unrelated re-render (e.g. typing in the date filter).
  const auditorOptions = useMemo(() => users.filter(u => u.role === UserRole.AUDITOR), [users])

  // Get all branch manager assignments to identify branches without managers
  // NOTE: RLS policies automatically filter by org, no need to pass orgId
  const { data: branchManagerAssignments = [] } = useQuery<Array<{ branchId: string; isActive: boolean }>>({
    queryKey: ['branch-manager-assignments', effectiveOrgId, user?.id],
    queryFn: () => (api as any).getAllBranchManagerAssignments(),
    enabled: !!effectiveOrgId || isSuperAdmin,
    staleTime: 2 * 60 * 1000,
  })
  // auditor assignments and recent assign logs removed with Unassigned feature

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
  // (createDraftMutation removed with Unassigned feature)

  // Organization settings moved to Settings screen (admin-only)
  // Org-aware period helpers (mirrors server scheduling logic)
  const org = currentOrg
  const getOrgLocalNow = React.useCallback((now: Date) => {
    try { return new Date(now.toLocaleString('en-US', { timeZone: org?.timeZone || 'UTC' })) } catch { return new Date(now) }
  }, [org?.timeZone])

  const nowTs = Date.now()
  const isOverdue = React.useCallback((a: Audit) => !!a.dueAt && new Date(a.dueAt).getTime() < nowTs && a.status !== AuditStatus.APPROVED && a.status !== AuditStatus.REJECTED, [nowTs])

  // Weekly insights - current org-local week based on schedule, not last update
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
    // Include audits whose scheduled period overlaps with this week window
    return audits.filter(a => {
      const ps = a.periodStart ? new Date(a.periodStart).getTime() : undefined
      const pe = a.periodEnd ? new Date(a.periodEnd).getTime() : undefined
      if (ps != null && pe != null) {
        return ps <= adjustedEnd.getTime() && pe >= adjustedStart.getTime()
      }
      const ts = a.dueAt ?? a.createdAt
      const t = ts ? new Date(ts).getTime() : 0
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

  // (unassigned survey derivation removed)

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
        i % 2 === 1 ? <mark key={i} className="bg-yellow-100 dark:bg-yellow-500/30 text-gray-900 dark:text-white rounded-sm px-0.5">{part}</mark> : <span key={i}>{part}</span>
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

  // Guards: Handle loading and missing org states AFTER all hooks
  if (orgLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (branchesError || auditsError) {
    return (
      <DashboardLayout title="Dashboard">
        <ErrorState message="Failed to load dashboard data." retry={() => {
          queryClient.invalidateQueries({ queryKey: ['branches'] })
          queryClient.invalidateQueries({ queryKey: ['audits'] })
        }} />
      </DashboardLayout>
    )
  }

  // If admin has no org, show org creation onboarding
  if (!effectiveOrgId && !isSuperAdmin) {
    return <AdminOrgOnboarding />
  }
  
  // Empty Organization State: Check if we should show onboarding
  const isEmptyOrg = !branchesLoading && branches.length === 0 && audits.length === 0
  
  // Render empty org onboarding OR normal dashboard
  if (isEmptyOrg) {
    return (
      <DashboardLayout title="Welcome">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚀</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome to {currentOrg?.name || 'Your Organization'}!
            </h1>
            <p className="text-lg text-gray-600 dark:text-slate-300">
              Let's get your organization set up. Follow these steps to get started.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Step 1: Create Branches */}
            <div className="bg-white dark:bg-(--color-card) border-2 border-gray-200 dark:border-white/10 rounded-lg p-6 hover:border-blue-500 transition-colors">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🏢</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                1. Create Branches
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Add your physical locations or branches that will be audited.
              </p>
              <button
                onClick={() => navigate('/manage/branches')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Create First Branch
              </button>
            </div>

            {/* Step 2: Create Survey Templates */}
            <div className="bg-white dark:bg-(--color-card) border-2 border-gray-200 dark:border-white/10 rounded-lg p-6 hover:border-green-500 transition-colors">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                2. Create Survey Templates
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Define what gets audited by creating survey templates with questions.
              </p>
              <button
                onClick={() => navigate('/manage/surveys')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Create Survey Template
              </button>
            </div>

            {/* Step 3: Invite Users */}
            <div className="bg-white dark:bg-(--color-card) border-2 border-gray-200 dark:border-white/10 rounded-lg p-6 hover:border-purple-500 transition-colors">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                3. Invite Team Members
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Add auditors, branch managers, and admins to your organization.
              </p>
              <button
                onClick={() => navigate('/manage/users')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Invite Users
              </button>
            </div>

            {/* Step 4: Optional Zones */}
            <div className="bg-white dark:bg-(--color-card) border-2 border-gray-200 dark:border-white/10 rounded-lg p-6 hover:border-yellow-500 transition-colors">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🗺️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                4. Create Zones (Optional)
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Group branches into zones for easier management and assignment.
              </p>
              <button
                onClick={() => navigate('/manage/zones')}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Create Zones
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-sm">
            <h4 className="font-semibold text-gray-900 mb-2 dark:text-white">📘 Need Help?</h4>
            <p className="text-gray-600 text-sm dark:text-slate-300">
              Check out our documentation or contact support if you need assistance setting up your organization.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Normal dashboard (has data)
  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Header - No heading duplication, only show subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <p className="text-base text-gray-500 font-medium">{branches.length} branches • {audits.length} audits • {user?.name}</p>
          </div>
          
          <button 
            className="btn btn-primary btn-md w-full sm:w-auto"
            onClick={() => navigate('/manage/surveys')}
          >
            + Create Survey Template
          </button>
        </div>
  
        {/* Quick Actions */}
        <div className="card">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col gap-1">
            <p className="heading-micro">Quick Actions</p>
            <h2 className="heading-section-title">Manage your org at a glance</h2>
            <p className="heading-subtitle">Jump into the most common admin tasks.</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard icon={<span className="text-lg">🏢</span>} value={branches.length} label="Branches" onClick={() => navigate('/manage/branches')} />
              <MetricCard icon={<span className="text-lg">🗺️</span>} value={zones.length} label="Zones" onClick={() => navigate('/manage/zones')} />
              <MetricCard icon={<span className="text-lg">👥</span>} value={activeUsersCount} label="Active Users" onClick={() => navigate('/manage/users')} />
              <MetricCard icon={<span className="text-lg">✉️</span>} value={pendingInvitesCount} label="Pending Invites" tone={pendingInvitesCount > 0 ? 'warning' : 'default'} onClick={() => navigate('/manage/users')} />
              <MetricCard icon={<span className="text-lg">⚠️</span>} value={branchesWithoutManagers.length} label="No Manager" tone={branchesWithoutManagers.length > 0 ? 'warning' : 'success'} onClick={() => navigate('/manage/branches')} />
              <MetricCard icon={<span className="text-lg">🔔</span>} value={auditsNeedingAdminApproval.length} label="Need Approval" tone={auditsNeedingAdminApproval.length > 0 ? 'danger' : 'default'} onClick={() => { setStatusFilter(AuditStatus.SUBMITTED); setQuickChip('waiting_approval') }} />
            </div>
          </div>
        </div>

        {/* Weekly Insights - Fixed to Current Week */}
        <div className="card">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col gap-1">
            <p className="heading-micro">Performance</p>
            <h2 className="heading-section-title">Weekly Insights</h2>
            <p className="heading-subtitle">Current week performance</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard
                icon={<span className="text-lg">{overdueCountAll > 0 ? '❗' : '✅'}</span>}
                value={overdueCountAll}
                label="Overdue"
                tone={overdueCountAll > 0 ? 'danger' : 'success'}
              />
              <MetricCard
                icon={<span className="text-lg">⏰</span>}
                value={dueThisWeekCount}
                label="Due This Week"
                tone={dueThisWeekCount > 0 ? 'warning' : 'default'}
              />
              <MetricCard
                icon={<ClipboardDocumentCheckIcon className="w-5 h-5 text-green-600" />}
                value={`${completionRate}%`}
                label="Completion"
                tone="success"
              >
                <p className="text-xs text-gray-500 mt-1">{completedCount} of {weeklyAudits.length}</p>
              </MetricCard>
              <MetricCard
                icon={<span className="text-lg">⚡</span>}
                value={inProgressCount}
                label="In Progress"
                tone="primary"
              />
              <MetricCard
                icon={<ClipboardDocumentListIcon className="w-5 h-5 text-primary-600" />}
                value={`${onTimeRate}%`}
                label="On-time"
                tone="primary"
              />
              <MetricCard
                icon={<span className="text-lg">🏢</span>}
                value={coverageBranches.size}
                label="Branches"
              />
            </div>
          </div>
        </div>

        {/* Organization Settings moved to the Settings (cogwheel) screen for admins */}

        {/* Zone coverage + Recent activity row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Zone coverage */}
          <div className="card h-full">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col gap-1">
              <p className="heading-micro">Coverage</p>
              <h3 className="heading-section-title">Your Week At A Glance</h3>
              <span className="text-xs text-gray-500">Current week highlights</span>
            </div>
            <div className="card-body">
              {zoneRows.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                    <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium mb-2">No audits scheduled this week</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                    Weekly audits require auditor-to-branch assignments before they can be created.
                  </p>
                  <button
                    onClick={() => navigate('/manage/assignments')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-xs text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Assign Auditors to Branches
                  </button>
                </div>
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
                    <tbody className="bg-white dark:bg-(--color-card) divide-y divide-gray-200 dark:divide-white/10">
                      {zoneRows.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{r.scheduled}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{r.completed}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={r.overdue > 0 ? 'text-red-600 font-medium' : 'text-gray-900 dark:text-white'}>
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
          <div className="card h-full">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col gap-1">
              <p className="heading-micro">Timeline</p>
              <h3 className="heading-section-title">Recent Activity</h3>
            </div>
            <div className="card-body p-0">
              {(() => {
                if (activityItems.length === 0) {
                  return <p className="text-gray-500 text-center py-8">No recent activity.</p>
                }

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
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.action}</div>
                              <div className="text-sm text-gray-600 dark:text-slate-300 mt-1">{item.branch}</div>
                              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.audit?.surveyVersion != null ? `v${item.audit.surveyVersion}` : '—'}</div>
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
                        key: 'version',
                        header: 'Version',
                        render: (item) => (item.audit?.surveyVersion != null ? `v${item.audit.surveyVersion}` : '—'),
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
                    className="w-full pl-12 pr-4 py-2.5 border border-gray-300 dark:border-white/15 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-white/10 transition-all"
                  />
                </div>
                
                {/* Compact Filter & Sort Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Quick Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-200 whitespace-nowrap">Filter:</label>
                    <select 
                      className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-(--color-card) dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[140px]" 
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
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-200 whitespace-nowrap">Sort:</label>
                    <select 
                      className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-(--color-card) dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[100px]" 
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
                      className="px-3 py-2 border border-gray-300 dark:border-white/15 bg-white dark:bg-(--color-card) hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white rounded-lg transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
                      onClick={() => setShowAdvanced((v) => !v)}
                    >
                      <FunnelIcon className="w-4 h-4" />
                      <span>Advanced Filters</span>
                    </button>
                    <div className="text-sm text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-lg">
                      {filteredAudits.length} results
                    </div>
                  </div>
                  <button 
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors px-3 py-2"
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
                    <span key={b.key} className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-white/10">
                      {b.label}
                      <button className="hover:text-gray-900 dark:hover:text-white" onClick={b.onClear} aria-label={`Clear ${b.key}`}>
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Advanced Filters */}
              {showAdvanced && (
                  <div className="mt-3 p-3 border dark:border-white/10 rounded-md bg-gray-50 dark:bg-(--color-card-muted)">
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
                          {auditorOptions.map(u => (
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
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full mb-4">
                      <span className="text-3xl">📋</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {viewScope === 'week' ? 'No audits scheduled this week' : 'No audits found'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                      {viewScope === 'week' 
                        ? 'There are no audits scheduled for the current week.'
                        : hasFilters 
                          ? 'Try adjusting your filters or search criteria.'
                          : 'Get started by creating your first audit.'}
                    </p>
                    {viewScope === 'week' && audits.length > 0 && (
                      <button
                        onClick={() => setViewScope('all')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-(--color-card) hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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
                    <div className="bg-white dark:bg-(--color-card) rounded-lg border border-gray-200 dark:border-white/10 p-5 hover:shadow-md transition-shadow">
                      {/* Card Header */}
                      <div className="mb-4">
                        {/* Title Row */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
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
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Version:</span>
                            <span className="text-gray-900">{a.surveyVersion != null ? `v${a.surveyVersion}` : '—'}</span>
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
                  { key: 'version', header: 'Version', render: (a: Audit) => (a.surveyVersion != null ? `v${a.surveyVersion}` : '—') },
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
