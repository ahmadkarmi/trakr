// (moved helpers inside component)
import React from 'react'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Audit, Branch, Organization, LogEntry, AuditStatus, UserRole, Zone } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatCard from '../components/StatCard'
import ProgressDonut from '../components/ProgressDonut'
import StatusBadge from '@/components/StatusBadge'
import ResponsiveTable from '../components/ResponsiveTable'
import InfoBadge from '@/components/InfoBadge'
import { UsersIcon, ClipboardDocumentListIcon, BuildingOfficeIcon, ClipboardDocumentCheckIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

const DashboardAdmin: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const queryClient = useQueryClient()
  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: QK.ORGANIZATIONS,
    queryFn: api.getOrganizations,
  })
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QK.BRANCHES(orgs[0]?.id),
    queryFn: () => api.getBranches(orgs[0]?.id),
    enabled: orgs.length > 0,
  })
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: QK.ZONES(orgs[0]?.id),
    queryFn: () => api.getZones(orgs[0]?.id),
    enabled: orgs.length > 0,
  })
  const { data: users = [] } = useQuery({
    queryKey: QK.USERS,
    queryFn: api.getUsers,
  })
  // surveys query removed from dashboard; not needed for KPIs here
  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: QK.AUDITS('admin'),
    queryFn: () => api.getAudits(),
  })
  const { data: activity = [] } = useQuery<LogEntry[]>({
    queryKey: QK.ACTIVITY('admin'),
    queryFn: () => api.getActivityLogs(),
  })

  // TODO: Get branches without assigned managers (admin needs to approve these)
  // const { data: branchManagerAssignments = [] } = useQuery({
  //   queryKey: ['branch-manager-assignments'],
  //   queryFn: () => api.getBranchManagerAssignments(),
  // })

  // TODO: Implement admin approval logic for branches without managers
  // const branchesWithoutManagers = React.useMemo(() => {
  //   const assignedBranchIds = branchManagerAssignments.map(assignment => assignment.branchId);
  //   return branches.filter(branch => !assignedBranchIds.includes(branch.id));
  // }, [branches, branchManagerAssignments]);

  // TODO: Use branchesWithoutManagers to show admin approval stats in UI
  // const auditsNeedingAdminApproval = audits.filter(audit => 
  //   audit.status === AuditStatus.SUBMITTED && 
  //   branchesWithoutManagers.some(branch => branch.id === audit.branchId)
  // );

  const [statusFilter, setStatusFilter] = React.useState<'all' | 'finalized' | AuditStatus>('all')
  const [branchFilter, setBranchFilter] = React.useState<string>('all')
  const [auditorFilter, setAuditorFilter] = React.useState<string>('all')
  const [dateFrom, setDateFrom] = React.useState<string>('')
  const [dateTo, setDateTo] = React.useState<string>('')
  const [period, setPeriod] = React.useState<'week' | 'month' | 'quarter'>('week')
  const [quickChip, setQuickChip] = React.useState<'none' | 'due_today' | 'overdue' | 'submitted' | 'waiting_approval' | 'completed' | 'approved' | 'finalized'>('none')
  const [searchInput, setSearchInput] = React.useState<string>('')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const filtersInitialized = React.useRef(false)

  const manualArchive = useMutation({
    mutationFn: (payload: { auditId: string; userId: string }) => api.manualArchiveAudit(payload.auditId, payload.userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.AUDITS('admin') }),
  })

  // Organization settings moved to Settings screen (admin-only)
  // Org-aware period helpers (mirrors server scheduling logic)
  const org = orgs[0]
  const getOrgLocalNow = React.useCallback((now: Date) => {
    try { return new Date(now.toLocaleString('en-US', { timeZone: org?.timeZone || 'UTC' })) } catch { return new Date(now) }
  }, [org?.timeZone])
  const getPeriodRange = React.useMemo(() => {
    const now = new Date()
    const orgNow = getOrgLocalNow(now)
    const startOfWeek = (d: Date) => {
      const w = (org?.weekStartsOn ?? 1) as 0 | 1
      const day = d.getDay()
      const diff = (day - w + 7) % 7
      const s = new Date(d); s.setDate(d.getDate() - diff); s.setHours(0,0,0,0); return s
    }
    const endOfWeek = (d: Date) => { const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999); return e }
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
    const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const startOfQuarter = (d: Date) => { const q = Math.floor(d.getMonth()/3); return new Date(d.getFullYear(), q*3, 1, 0,0,0,0) }
    const endOfQuarter = (d: Date) => { const q = Math.floor(d.getMonth()/3); return new Date(d.getFullYear(), (q+1)*3, 0, 23,59,59,999) }
    let s: Date, e: Date
    if (period === 'week') { s = startOfWeek(orgNow); e = endOfWeek(orgNow) }
    else if (period === 'month') { s = startOfMonth(orgNow); e = endOfMonth(orgNow) }
    else { s = startOfQuarter(orgNow); e = endOfQuarter(orgNow) }
    const delta = orgNow.getTime() - now.getTime()
    return { start: new Date(s.getTime() - delta), end: new Date(e.getTime() - delta) }
  }, [period, getOrgLocalNow, org?.weekStartsOn])

  // Period-scoped utilities
  const isInPeriod = React.useCallback((a: Audit) => {
    const start = getPeriodRange.start.getTime(); const end = getPeriodRange.end.getTime()
    const t = a.periodStart ? new Date(a.periodStart).getTime() : new Date(a.updatedAt).getTime()
    return t >= start && t <= end
  }, [getPeriodRange])
  const nowTs = Date.now()
  const isOverdue = React.useCallback((a: Audit) => !!a.dueAt && new Date(a.dueAt).getTime() < nowTs && a.status !== AuditStatus.APPROVED && a.status !== AuditStatus.REJECTED, [nowTs])
  const isDueTodayOrg = React.useCallback((a: Audit) => {
    if (!a.dueAt) return false
    const due = new Date(a.dueAt)
    const now = new Date()
    try {
      const dueStr = due.toLocaleDateString('en-CA', { timeZone: org?.timeZone || 'UTC' })
      const nowStr = now.toLocaleDateString('en-CA', { timeZone: org?.timeZone || 'UTC' })
      return dueStr === nowStr
    } catch { return due.toDateString() === now.toDateString() }
  }, [org?.timeZone])

  const auditsInPeriod = React.useMemo(() => audits.filter(isInPeriod), [audits, isInPeriod])
  const completedOrApproved = auditsInPeriod.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED)
  const completionRate = auditsInPeriod.length > 0 ? Math.round((completedOrApproved.length / auditsInPeriod.length) * 100) : 0
  const onTimeNumerator = completedOrApproved.filter(a => a.dueAt ? new Date((a.approvedAt || a.updatedAt)).getTime() <= new Date(a.dueAt).getTime() : true).length
  const onTimeRate = completedOrApproved.length > 0 ? Math.round((onTimeNumerator / completedOrApproved.length) * 100) : 0
  const overdueCount = auditsInPeriod.filter(isOverdue).length
  const coverageBranches = React.useMemo(() => new Set(auditsInPeriod.map(a => a.branchId)), [auditsInPeriod])
  const coverageRate = branches.length > 0 ? Math.round((coverageBranches.size / branches.length) * 100) : 0

  // Zone coverage summary (top 5 by scheduled)
  const zoneRows = React.useMemo(() => {
    const rows = zones.map((z) => {
      const bids = new Set(z.branchIds)
      const list = auditsInPeriod.filter((a) => bids.has(a.branchId))
      const scheduled = list.length
      const completed = list.filter((a) => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
      const overdue = list.filter(isOverdue).length
      return { id: z.id, name: z.name, scheduled, completed, overdue }
    }).sort((a, b) => b.scheduled - a.scheduled).slice(0, 5)
    return rows
  }, [zones, auditsInPeriod, isOverdue])

  const filteredAudits = React.useMemo(() => {
    return audits.filter(a => {
      if (!isInPeriod(a)) return false
      const statusOk = statusFilter === 'all' || (statusFilter === 'finalized' ? (a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED) : a.status === statusFilter)
      const branchOk = branchFilter === 'all' || a.branchId === branchFilter
      const auditorOk = auditorFilter === 'all' || a.assignedTo === auditorFilter
      const t = new Date(a.updatedAt).getTime()
      const fromOk = !dateFrom || t >= new Date(dateFrom).getTime()
      const toOk = !dateTo || t <= new Date(dateTo).getTime()
      let quickOk = true
      if (quickChip === 'due_today') quickOk = isDueTodayOrg(a)
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
  }, [audits, statusFilter, branchFilter, auditorFilter, dateFrom, dateTo, quickChip, isInPeriod, isDueTodayOrg, isOverdue, searchQuery, branches, users])

  const completedCount = auditsInPeriod.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
  const inProgressCount = auditsInPeriod.filter(a => a.status === AuditStatus.IN_PROGRESS).length
  const draftCount = auditsInPeriod.filter(a => a.status === AuditStatus.DRAFT).length
  const completedOnlyCount = auditsInPeriod.filter(a => a.status === AuditStatus.COMPLETED).length
  const approvedOnlyCount = auditsInPeriod.filter(a => a.status === AuditStatus.APPROVED).length
  const finalizedAuditsInPeriod = React.useMemo(() => auditsInPeriod.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED), [auditsInPeriod])

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
    const c = sp.get('chip') as 'none' | 'due_today' | 'overdue' | 'submitted' | 'waiting_approval' | 'completed' | 'approved' | 'finalized' | null
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

  // CSV export helpers
  const csvEscape = (val: unknown) => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const exportCsv = (rows: Audit[]) => {
    const headers = ['Audit ID','Branch','Auditor','Status','Updated','Due','Approved At','Approval Note']
    const lines = [headers.join(',')]
    rows.forEach(a => {
      const branchName = branches.find(b => b.id === a.branchId)?.name || a.branchId
      const auditorName = users.find(u => u.id === a.assignedTo)?.name || a.assignedTo || ''
      const updated = new Date(a.updatedAt).toLocaleString()
      const due = a.dueAt ? new Date(a.dueAt).toLocaleDateString() : ''
      const approvedAt = a.approvedAt ? new Date(a.approvedAt).toLocaleString() : ''
      const row = [a.id, branchName, auditorName, a.status, updated, due, approvedAt, a.approvalNote || '']
      lines.push(row.map(csvEscape).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')
    link.download = `audits-${ts}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="mobile-container space-y-6">
        {/* Hero welcome */}
        <div className="card-mobile">
          <div className="text-center sm:text-left mobile-section">
            <h2 className="heading-mobile-xl text-gray-900 mb-2">Welcome back, {user?.name}! 🛠️</h2>
            <p className="text-mobile-body text-gray-600">Manage the entire audit system, users, and templates.</p>
          </div>
          <div className="mobile-section">
            <div className="mobile-grid sm:grid-cols-2 lg:grid-cols-3">
              <button className="btn-mobile-primary sm:btn-primary" onClick={() => navigate('/manage/surveys')}>
                Create Survey Template
              </button>
              <button className="btn-mobile-primary sm:btn-outline" onClick={() => navigate('/manage/branches')}>
                Manage Branches
              </button>
              <button className="btn-mobile-primary sm:btn-outline" onClick={() => navigate('/manage/zones')}>
                Manage Zones
              </button>
              <button className="btn-mobile-primary sm:btn-outline" onClick={() => navigate('/manage/assignments')}>
                Assign Auditors
              </button>
              <button className="btn-mobile-primary sm:btn-ghost" onClick={() => {}}>
                Invite Users
              </button>
            </div>
          </div>
        </div>

        {/* Period selector + KPI cards */}
        <div className="card-mobile">
          <div className="mobile-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-mobile-body text-gray-600 font-medium">Period:</span>
                <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
                  {(['week','month','quarter'] as const).map(p => (
                    <button 
                      key={p} 
                      className={`px-4 py-2 text-sm font-medium touch-target ${period===p ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`} 
                      onClick={() => setPeriod(p)}
                    >
                      {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Quarter'}
                    </button>
                  ))}
                </div>
              </div>
              {org?.timeZone && (
                <span className="text-mobile-caption text-gray-500">Timezone: {org.timeZone}</span>
              )}
            </div>
          </div>
          <div className="mobile-grid lg:grid-cols-4">
            <StatCard title="Completion" value={`${completionRate}%`} subtitle="In period" variant="success" progress={completionRate} icon={<ClipboardDocumentCheckIcon className="w-6 h-6 text-success-700" />} />
            <StatCard title="On-time" value={`${onTimeRate}%`} subtitle="Completed on/before due" variant="primary" icon={<ClipboardDocumentListIcon className="w-6 h-6 text-primary-700" />} />
            <StatCard title="Overdue" value={overdueCount} subtitle="Past due" variant="warning" icon={<BuildingOfficeIcon className="w-6 h-6 text-warning-700" />} />
            <StatCard title="Coverage" value={`${coverageRate}%`} subtitle={`${coverageBranches.size}/${branches.length} branches`} variant="neutral" icon={<UsersIcon className="w-6 h-6 text-gray-700" />} />
          </div>
        </div>

        {/* Organization Settings moved to the Settings (cogwheel) screen for admins */}

        {/* Middle row: zone coverage + table + activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Zone coverage */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Zone Coverage</h3>
              <span className="text-xs text-gray-500">Top 5</span>
            </div>
            <div className="p-6">
              {zoneRows.length === 0 ? (
                <p className="text-gray-500">No zones or audits this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left">Zone</th>
                        <th className="px-3 py-1.5 text-right">Scheduled</th>
                        <th className="px-3 py-1.5 text-right">Completed</th>
                        <th className="px-3 py-1.5 text-right">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {zoneRows.map(r => (
                        <tr key={r.id}>
                          <td className="px-3 py-1.5">{r.name}</td>
                          <td className="px-3 py-1.5 text-right">{r.scheduled}</td>
                          <td className="px-3 py-1.5 text-right">{r.completed}</td>
                          <td className="px-3 py-1.5 text-right">{r.overdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* Recent audits table */}
          <div className="card xl:col-span-2">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Audits</h3>
            </div>
            <div className="p-6">
              {/* Filters: compact toolbar */}
              <div className="mb-3 sticky top-0 bg-white z-10 pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search audit, branch, auditor…"
                        className="input pl-7 h-9 text-sm w-64"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button className={`px-2 py-1 rounded-full border text-xs ${quickChip==='due_today' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} onClick={() => setQuickChip(quickChip==='due_today'?'none':'due_today')}>Due Today</button>
                      <button className={`px-2 py-1 rounded-full border text-xs ${quickChip==='overdue' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} onClick={() => setQuickChip(quickChip==='overdue'?'none':'overdue')}>Overdue</button>
                      <button className={`px-2 py-1 rounded-full border text-xs ${quickChip==='submitted' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} onClick={() => setQuickChip(quickChip==='submitted'?'none':'submitted')}>Submitted</button>
                      <button className={`px-2 py-1 rounded-full border text-xs ${quickChip==='waiting_approval' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} onClick={() => setQuickChip(quickChip==='waiting_approval'?'none':'waiting_approval')}>Waiting Approval</button>
                      <button className={`px-2 py-1 rounded-full border text-xs ${quickChip==='completed' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} onClick={() => setQuickChip(quickChip==='completed'?'none':'completed')}>Completed</button>
                      <button className={`px-2 py-1 rounded-full border text-xs ${quickChip==='approved' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} onClick={() => setQuickChip(quickChip==='approved'?'none':'approved')}>Approved</button>
                      <button className={`px-2 py-1 rounded-full border text-xs ${quickChip==='finalized' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} onClick={() => setQuickChip(quickChip==='finalized'?'none':'finalized')}>Finalized</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 hidden sm:inline">{filteredAudits.length} results</span>
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50" onClick={() => setShowAdvanced((v) => !v)}>
                      <FunnelIcon className="w-4 h-4" /> Filters
                    </button>
                    <button className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50" onClick={clearAllFilters} disabled={!hasFilters}>
                      <XMarkIcon className="w-4 h-4" /> Clear
                    </button>
                  </div>
                </div>
                {!showAdvanced && activeBadges.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {activeBadges.map(b => (
                      <span key={b.key} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        {b.label}
                        <button className="hover:text-gray-900" onClick={b.onClear} aria-label={`Clear ${b.key}`}>
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                      <button className="btn-ghost btn-sm" onClick={() => setShowAdvanced(false)}>Close</button>
                      <button className="btn-ghost btn-sm disabled:opacity-50" onClick={clearAllFilters} disabled={!hasFilters}>Clear all</button>
                    </div>
                  </div>
                )}
              </div>
              <ResponsiveTable
                items={filteredAudits.slice(0, 8)}
                keyField={(a: Audit) => a.id}
                empty={<p className="text-gray-500 py-8">No audits yet.</p>}
                mobileItem={(a: Audit) => (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{highlightMatch(a.id)}</p>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{branches.find(b => b.id === a.branchId)?.name || a.branchId}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-xs text-gray-500">Updated {new Date(a.updatedAt).toLocaleDateString()} • Due {a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—'}</p>
                      {a.isArchived && <InfoBadge className="mt-1" label="Archived" tone="gray" />}
                    </div>
                  </div>
                )}
                columns={[
                  { key: 'audit', header: 'Audit', render: (a: Audit) => highlightMatch(a.id) },
                  { key: 'branch', header: 'Branch', render: (a: Audit) => highlightMatch(branches.find(b => b.id === a.branchId)?.name || a.branchId) },
                  { key: 'auditor', header: 'Auditor', render: (a: Audit) => highlightMatch(users.find(u => u.id === a.assignedTo)?.name || a.assignedTo || '') },
                  { key: 'status', header: 'Status', render: (a: Audit) => <StatusBadge status={a.status} /> },
                  { key: 'due', header: 'Due', render: (a: Audit) => a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—' },
                  { key: 'archived', header: 'Archived', render: (a: Audit) => a.isArchived ? 'Yes' : 'No' },
                  { key: 'updated', header: 'Updated', render: (a: Audit) => new Date(a.updatedAt).toLocaleDateString() },
                  { key: 'actions', header: '', className: 'text-right', render: (a: Audit) => {
                    const pastDue = a.dueAt ? new Date(a.dueAt).getTime() < Date.now() : false
                    const canManualArchive = !a.isArchived && pastDue && (a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS || a.status === AuditStatus.SUBMITTED)
                    return (
                      <div className="space-x-2">
                        {canManualArchive && (
                          <button className="btn-danger btn-sm" onClick={() => manualArchive.mutate({ auditId: a.id, userId: user!.id })} disabled={manualArchive.isPending}>
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

          {/* Side column */}
          <div className="space-y-6">
            <div className="card p-6 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <ProgressDonut value={completionRate} label="Completed" />
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <div className="font-semibold text-success-700">{completedCount}</div>
                    <div className="text-gray-500">Completed</div>
                  </div>
                  <div>
                    <div className="font-semibold text-warning-700">{inProgressCount}</div>
                    <div className="text-gray-500">In Progress</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700">{draftCount}</div>
                    <div className="text-gray-500">Draft</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                {activity.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recent activity.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {activity.slice(0, 6).map((log) => (
                      <li key={log.id} className="flex justify-between">
                        <span className="text-gray-700">{log.action} – {log.details}</span>
                        <span className="text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Finalized Audits: Completed + Approved */}
          <div className="card xl:col-span-2">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Finalized Audits</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Completed: {completedOnlyCount}</span>
                <span className="text-xs text-gray-500">Approved: {approvedOnlyCount}</span>
                <button className="btn-outline btn-sm" onClick={() => exportCsv(finalizedAuditsInPeriod)}>Export CSV</button>
              </div>
            </div>
            <div className="p-6">
              {finalizedAuditsInPeriod.length === 0 ? (
                <p className="text-gray-500">No finalized audits in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left">Audit</th>
                        <th className="px-3 py-1.5 text-left">Branch</th>
                        <th className="px-3 py-1.5 text-left">Auditor</th>
                        <th className="px-3 py-1.5 text-left">Status</th>
                        <th className="px-3 py-1.5 text-left">Approved</th>
                        <th className="px-3 py-1.5 text-left">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {finalizedAuditsInPeriod.slice(0, 12).map(a => (
                        <tr key={a.id}>
                          <td className="px-3 py-1.5">{a.id}</td>
                          <td className="px-3 py-1.5">{branches.find(b => b.id === a.branchId)?.name || a.branchId}</td>
                          <td className="px-3 py-1.5">{users.find(u => u.id === a.assignedTo)?.name || a.assignedTo || ''}</td>
                          <td className="px-3 py-1.5"><StatusBadge status={a.status} /></td>
                          <td className="px-3 py-1.5">{a.approvedAt ? new Date(a.approvedAt).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-1.5">{new Date(a.updatedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardAdmin
