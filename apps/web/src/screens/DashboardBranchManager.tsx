import React from 'react'
import { useAuthStore } from '../stores/auth'
import { useQuery } from '@tanstack/react-query'
import { Audit, AuditStatus, Branch, User, Survey } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '../components/StatusBadge'
import ResponsiveTable, { Column } from '../components/ResponsiveTable'
import { ClockIcon, ChartBarIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

const DashboardBranchManager: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>('')

  const { data: allAudits = [], isLoading } = useQuery<Audit[]>({
    queryKey: QK.AUDITS('branch-manager'),
    queryFn: () => api.getAudits(),
  })
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QK.BRANCHES(),
    queryFn: () => api.getBranches(),
  })
  const { data: users = [] } = useQuery<User[]>({
    queryKey: QK.USERS,
    queryFn: () => api.getUsers(),
  })
  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: QK.SURVEYS,
    queryFn: () => api.getSurveys(),
  })

  // Get branches assigned to current manager using new assignment system
  const { data: assignedBranches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-for-manager', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      // Get all branches
      const allBranches = await api.getBranches()
      
      // Get branch manager assignments for this manager
      const assignments = await api.getManagerBranchAssignments(user.id)
      
      // Return branches that this manager is assigned to
      const assignedBranchIds = assignments.map(a => a.branchId)
      return allBranches.filter(b => assignedBranchIds.includes(b.id))
    },
    enabled: !!user?.id,
  })

  const managedBranchIds = React.useMemo(() => assignedBranches.map(b => b.id), [assignedBranches])
  
  // Filter audits by managed branches ONLY - security: show nothing if no assignments
  const audits = managedBranchIds.length > 0 
    ? allAudits.filter(a => managedBranchIds.includes(a.branchId))
    : []  // Security: unassigned managers see nothing (only super admins see all orgs)
  
  // Apply branch filter if selected
  const filteredAudits = selectedBranchId
    ? audits.filter(a => a.branchId === selectedBranchId)
    : audits
    
  const total = filteredAudits.length
  
  // Audits actively being worked on (not yet submitted)
  // For managers: only DRAFT and IN_PROGRESS count as active
  // COMPLETED audits are done, just waiting for auditor to submit
  const inProgress = filteredAudits.filter(a => 
    a.status === AuditStatus.DRAFT || 
    a.status === AuditStatus.IN_PROGRESS
  ).length
  
  // Audits that have been finalized (approved or rejected)
  const finalized = filteredAudits.filter(a => 
    a.status === AuditStatus.APPROVED || 
    a.status === AuditStatus.REJECTED
  ).length
  const completionRate = total > 0 ? Math.round((finalized / total) * 100) : 0
  
  // Audits pending approval (submitted status)
  const pendingApproval = filteredAudits.filter(a => a.status === AuditStatus.SUBMITTED)

  // Audit history - finalized audits only (approved or rejected, NOT completed)
  const [historyPage, setHistoryPage] = React.useState(1)
  const pageSize = 10
  const completedAudits = filteredAudits.filter(a => 
    a.status === AuditStatus.APPROVED || 
    a.status === AuditStatus.REJECTED
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  
  const totalHistoryPages = Math.ceil(completedAudits.length / pageSize)
  const paginatedHistory = completedAudits.slice((historyPage - 1) * pageSize, historyPage * pageSize)

  return (
    <DashboardLayout title="Branch Manager Dashboard">
      <div className="mobile-container breathing-room">
        {/* Header with Branch Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branch Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage {assignedBranches.length} branch{assignedBranches.length !== 1 ? 'es' : ''} • {user?.name}</p>
          </div>
          
          {assignedBranches.length > 1 && (
            <select 
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium"
            >
              <option value="">All Branches ({assignedBranches.length})</option>
              {assignedBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* No Assignments Warning */}
        {managedBranchIds.length === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  No branches assigned
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  Contact your administrator to get branch assignments. You cannot view audits without branch assignments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics - Responsive Grid */}
        {managedBranchIds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-5 text-white cursor-pointer hover:shadow-lg transition-shadow sm:col-span-3 lg:col-span-1"
            onClick={() => pendingApproval.length > 0 && document.getElementById('pending-approvals')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium uppercase tracking-wide">Needs Approval</p>
                <p className="text-4xl font-bold mt-2">{pendingApproval.length}</p>
                <p className="text-yellow-100 text-sm mt-1">{pendingApproval.length === 1 ? 'audit' : 'audits'} pending</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                <ExclamationCircleIcon className="w-8 h-8" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{inProgress}</p>
            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Active Audits</p>
            <p className="text-xs text-gray-500 mt-0.5">Not yet submitted</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
            <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Finalized</p>
            <p className="text-xs text-gray-500 mt-0.5">Approved or rejected</p>
          </div>
        </div>
        )}

        {/* Pending Approval Section */}
        {managedBranchIds.length > 0 && (
        <div id="pending-approvals" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pending Approval</h2>
                <p className="text-sm text-gray-600 mt-1">{pendingApproval.length} audit{pendingApproval.length !== 1 ? 's' : ''} waiting for your review</p>
              </div>
              {pendingApproval.length > 0 && (
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  🔔 Action Required
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            {pendingApproval.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-gray-600 font-medium">All caught up!</p>
                <p className="text-sm text-gray-500 mt-1">No audits pending approval</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingApproval.map((audit) => {
                  const branch = branches.find(b => b.id === audit.branchId)
                  const submittedByUser = users.find(u => u.id === audit.submittedBy)
                  const survey = surveys.find(s => s.id === audit.surveyId)
                  
                  return (
                    <div key={audit.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{branch?.name || 'Unknown Branch'}</h3>
                        <p className="text-sm text-gray-600 truncate">{survey?.title || 'Unknown Survey'}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <StatusBadge status={audit.status} />
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-900">
                          ⏰ Awaiting Review
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Submitted</p>
                          <p className="font-medium text-gray-900">{audit.submittedAt ? new Date(audit.submittedAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">By</p>
                          <p className="font-medium text-gray-900 truncate">{submittedByUser?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => navigate(`/audit/${audit.id}/review`)}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                      >
                        <span>📋</span>
                        <span>Review Audit</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Audit History Section */}
        {managedBranchIds.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Audit History</h2>
                <p className="text-sm text-gray-600 mt-1">{completedAudits.length} completed audit{completedAudits.length !== 1 ? 's' : ''}</p>
              </div>
              {totalHistoryPages > 1 && (
                <span className="hidden sm:inline-flex text-sm text-gray-500">
                  Page {historyPage} of {totalHistoryPages}
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading audits...</p>
              </div>
            ) : paginatedHistory.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-gray-600 font-medium">No completed audits</p>
                <p className="text-sm text-gray-500 mt-1">Completed audits will appear here</p>
              </div>
            ) : (
              <>
                <ResponsiveTable
                  items={paginatedHistory}
                  keyField={(a) => a.id}
                  columns={[
                    {
                      key: 'date',
                      header: 'Date',
                      className: 'px-6 py-4',
                      render: (a) => {
                        const updatedAt = new Date(a.updatedAt)
                        return updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      }
                    },
                    {
                      key: 'auditId',
                      header: 'Audit ID',
                      className: 'px-6 py-4 font-mono text-gray-600',
                      render: (a) => `${a.id.slice(0, 8)}...`
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
                      key: 'submittedBy',
                      header: 'Submitted By',
                      className: 'px-6 py-4 text-gray-600',
                      render: (a) => users.find(u => u.id === a.submittedBy)?.name || 'Unknown'
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      className: 'px-6 py-4',
                      render: (a) => <StatusBadge status={a.status} />
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      className: 'px-6 py-4 text-right',
                      render: (a) => (
                        <button
                          onClick={() => navigate(`/audit/${a.id}/summary`)}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          View Summary
                        </button>
                      )
                    },
                  ] as Column<Audit>[]}
                  mobileItem={(a) => {
                    const branch = branches.find(b => b.id === a.branchId)
                    const submittedByUser = users.find(u => u.id === a.submittedBy)
                    const survey = surveys.find(s => s.id === a.surveyId)
                    const updatedAt = new Date(a.updatedAt)
                    
                    // Color based on status
                    const cardStyle = a.status === AuditStatus.APPROVED 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : a.status === AuditStatus.REJECTED
                      ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
                      : 'bg-white border-gray-200'
                    
                    const buttonStyle = a.status === AuditStatus.APPROVED
                      ? 'bg-green-600 hover:bg-green-700'
                      : a.status === AuditStatus.REJECTED
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-primary-600 hover:bg-primary-700'
                    
                    return (
                      <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${cardStyle}`}>
                        <div className="mb-3">
                          <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{branch?.name || 'Unknown Branch'}</h3>
                          <p className="text-sm text-gray-600 truncate">{survey?.title || 'Unknown Survey'}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <StatusBadge status={a.status} />
                          {a.status === AuditStatus.APPROVED && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              ✅ Approved
                            </span>
                          )}
                          {a.status === AuditStatus.REJECTED && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ❌ Rejected
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                          <span>{updatedAt.toLocaleDateString()}</span>
                          {submittedByUser && (
                            <span className="truncate ml-2">By: {submittedByUser.name}</span>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => navigate(`/audit/${a.id}/summary`)}
                          className={`w-full flex items-center justify-center gap-2 ${buttonStyle} text-white px-4 py-2.5 rounded-lg font-medium transition-colors`}
                        >
                          <span>📊</span>
                          <span>View Summary</span>
                        </button>
                      </div>
                    )
                  }}
                />
                
                {/* Pagination */}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                        disabled={historyPage === totalHistoryPages}
                        className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                    <span className="text-sm text-gray-600">
                      Page <span className="font-medium text-gray-900">{historyPage}</span> of <span className="font-medium text-gray-900">{totalHistoryPages}</span>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DashboardBranchManager
