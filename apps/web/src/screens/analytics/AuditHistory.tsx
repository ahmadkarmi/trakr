import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../utils/api'
import { QK } from '../../utils/queryKeys'
import { Audit, Branch, Survey, AuditStatus, calculateWeightedAuditScore, calculateAuditScore } from '@trakr/shared'
import { format } from 'date-fns'

interface AuditHistoryProps {
  roleFilter?: 'admin' | 'branch-manager' | 'auditor'
  branchId?: string
}

const AuditHistory: React.FC<AuditHistoryProps> = ({ roleFilter = 'admin', branchId }) => {
  // Fetch data
  const { data: audits = [], isLoading: auditsLoading } = useQuery<Audit[]>({ 
    queryKey: QK.AUDITS(roleFilter), 
    queryFn: () => api.getAudits() 
  })
  const { data: branches = [] } = useQuery<Branch[]>({ 
    queryKey: ['branches'], 
    queryFn: () => api.getBranches() 
  })
  const { data: surveys = [] } = useQuery<Survey[]>({ 
    queryKey: ['surveys'], 
    queryFn: () => api.getSurveys() 
  })

  // Filter state
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || 'all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'branch'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Calculate scores for all audits
  const auditsWithScores = useMemo(() => {
    return audits.map(audit => {
      const survey = surveys.find(s => s.id === audit.surveyId)
      if (!survey || !audit.responses || Object.keys(audit.responses).length === 0) {
        return { ...audit, calculatedScore: null }
      }
      
      // Try weighted score first, fall back to compliance if no weighted questions
      const weightedScore = calculateWeightedAuditScore(audit, survey)
      if (weightedScore.weightedPossiblePoints > 0) {
        return { ...audit, calculatedScore: Math.round(weightedScore.weightedCompliancePercentage) }
      }
      
      // Fallback to compliance score
      const basicScore = calculateAuditScore(audit, survey)
      return { ...audit, calculatedScore: Math.round(basicScore.compliancePercentage) }
    })
  }, [audits, surveys])

  // Calculate date filter
  const dateFilter = useMemo(() => {
    if (dateRange === 'all') return null
    const days = parseInt(dateRange)
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date
  }, [dateRange])

  // Filter and sort audits
  const filteredAudits = useMemo(() => {
    let filtered = auditsWithScores

    // Filter by survey
    if (selectedSurvey !== 'all') {
      filtered = filtered.filter(a => a.surveyId === selectedSurvey)
    }

    // Filter by branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(a => a.branchId === selectedBranch)
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.status === selectedStatus)
    }

    // Filter by date range
    if (dateFilter) {
      filtered = filtered.filter(a => new Date(a.createdAt) >= dateFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a => 
        a.id.toLowerCase().includes(query) ||
        branches.find(b => b.id === a.branchId)?.name.toLowerCase().includes(query) ||
        surveys.find(s => s.id === a.surveyId)?.title.toLowerCase().includes(query)
      )
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'score':
          comparison = (a.calculatedScore || 0) - (b.calculatedScore || 0)
          break
        case 'branch':
          const branchA = branches.find(br => br.id === a.branchId)?.name || ''
          const branchB = branches.find(br => br.id === b.branchId)?.name || ''
          comparison = branchA.localeCompare(branchB)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [auditsWithScores, selectedSurvey, selectedBranch, selectedStatus, dateFilter, searchQuery, sortBy, sortOrder, branches, surveys])

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredAudits.length
    const completed = filteredAudits.filter(a => 
      a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED
    ).length
    
    const auditsWithValidScores = filteredAudits.filter(a => a.calculatedScore !== null)
    const avgScore = auditsWithValidScores.length > 0 
      ? auditsWithValidScores.reduce((sum, a) => sum + (a.calculatedScore || 0), 0) / auditsWithValidScores.length
      : 0
    
    return { total, completed, avgScore: Math.round(avgScore) }
  }, [filteredAudits])

  const handleSort = (column: 'date' | 'score' | 'branch') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const getStatusBadge = (status: AuditStatus) => {
    const styles = {
      [AuditStatus.DRAFT]: 'bg-gray-100 text-gray-700',
      [AuditStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
      [AuditStatus.COMPLETED]: 'bg-green-100 text-green-700',
      [AuditStatus.SUBMITTED]: 'bg-purple-100 text-purple-700',
      [AuditStatus.APPROVED]: 'bg-emerald-100 text-emerald-700',
      [AuditStatus.REJECTED]: 'bg-red-100 text-red-700',
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const getScoreBadge = (score: number | null | undefined) => {
    if (score === undefined || score === null) {
      return <span className="text-gray-400">N/A</span>
    }
    
    const color = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'
    return <span className={`font-semibold ${color}`}>{score}%</span>
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Branch', 'Survey', 'Status', 'Score', 'Audit ID']
    const rows = filteredAudits.map(audit => [
      format(new Date(audit.createdAt), 'yyyy-MM-dd'),
      branches.find(b => b.id === audit.branchId)?.name || 'Unknown',
      surveys.find(s => s.id === audit.surveyId)?.title || 'Unknown',
      audit.status,
      audit.calculatedScore !== null ? `${audit.calculatedScore}%` : 'N/A',
      audit.id
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-compact bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Audits</div>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>
        
        <div className="card-compact bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        
        <div className="card-compact bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.avgScore}%</div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </div>
            <div className="text-3xl">⭐</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Survey Template</label>
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                className="input"
              >
                <option value="all">All Surveys</option>
                {surveys.map(survey => (
                  <option key={survey.id} value={survey.id}>{survey.title}</option>
                ))}
              </select>
            </div>

            {roleFilter === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="input"
                >
                  <option value="all">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input"
              >
                <option value="all">All Statuses</option>
                <option value={AuditStatus.DRAFT}>Draft</option>
                <option value={AuditStatus.IN_PROGRESS}>In Progress</option>
                <option value={AuditStatus.COMPLETED}>Completed</option>
                <option value={AuditStatus.SUBMITTED}>Submitted</option>
                <option value={AuditStatus.APPROVED}>Approved</option>
                <option value={AuditStatus.REJECTED}>Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by branch, survey, or audit ID..."
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="btn-secondary flex items-center gap-2"
                disabled={filteredAudits.length === 0}
              >
                <span>📥</span>
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortBy === 'date' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('branch')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Branch
                    {sortBy === 'branch' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Survey
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  onClick={() => handleSort('score')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Score
                    {sortBy === 'score' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditsLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading audit history...
                  </td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    <div>No audits found matching your filters</div>
                  </td>
                </tr>
              ) : (
                filteredAudits.map((audit) => {
                  const branch = branches.find(b => b.id === audit.branchId)
                  const survey = surveys.find(s => s.id === audit.surveyId)
                  
                  return (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(audit.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {branch?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {survey?.title || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(audit.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getScoreBadge(audit.calculatedScore)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href={`/audit/${audit.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info */}
      {filteredAudits.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredAudits.length} audit{filteredAudits.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export default AuditHistory
