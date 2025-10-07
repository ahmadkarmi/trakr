import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../utils/api'
import { QK } from '../../utils/queryKeys'
import { Audit, Branch, User, Zone, AuditStatus, UserRole, Survey, calculateAuditScore, calculateWeightedAuditScore } from '@trakr/shared'
import Tabs from '../../components/Tabs'
import AuditHistory from './AuditHistory'
import AnalyticsChart from '../../components/analytics/AnalyticsChart'

const AdminAnalytics: React.FC = () => {
  // Fetch all data for admin analytics
  const { data: audits = [] } = useQuery<Audit[]>({ queryKey: QK.AUDITS('admin'), queryFn: () => api.getAudits() })
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => api.getBranches() })
  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.getUsers() })
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ['zones'], queryFn: () => api.getZones() })
  const { data: surveys = [] } = useQuery<Survey[]>({ queryKey: QK.SURVEYS, queryFn: () => api.getSurveys() })

  // Calculate system-wide KPIs
  const totalAudits = audits.length
  // Only count APPROVED audits as completed (COMPLETED = not submitted yet)
  const completedAudits = audits.filter(a => a.status === AuditStatus.APPROVED).length
  const completionRate = totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0
  
  const overdueAudits = audits.filter(a => {
    if (!a.dueAt) return false
    return new Date(a.dueAt) < new Date() && a.status !== AuditStatus.APPROVED
  }).length
  
  // Calculate average quality score using actual survey data
  const averageScore = React.useMemo(() => {
    console.log('🔍 [DEBUG] Audits:', audits.length, 'Surveys:', surveys.length)
    console.log('🔍 [DEBUG] First survey sections count:', surveys[0]?.sections?.length, 'Survey title:', surveys[0]?.title)
    
    if (audits.length === 0 || surveys.length === 0) return 0
    
    const auditsWithResponses = audits.filter(audit => audit.responses && Object.keys(audit.responses).length > 0)
    console.log('🔍 [DEBUG] Audits with responses:', auditsWithResponses.length)
    
    const scoresWithData = auditsWithResponses
      .map((audit, index) => {
        const survey = surveys.find(s => s.id === audit.surveyId)
        if (!survey) return null
        
        if (index === 0) {
          console.log('🔍 [DEBUG] First audit - Survey has sections:', survey.sections?.length)
          console.log('🔍 [DEBUG] First audit - Response keys:', Object.keys(audit.responses || {}).length)
        }
        
        // Try weighted score first, fall back to compliance if no weighted questions
        const weightedScore = calculateWeightedAuditScore(audit, survey)
        if (weightedScore.weightedPossiblePoints > 0) {
          console.log('✅ [DEBUG] Using weighted score:', weightedScore.weightedCompliancePercentage, 'for audit:', audit.id.slice(0, 8))
          return weightedScore.weightedCompliancePercentage
        }
        // Fallback to compliance score if no weighted questions
        const basicScore = calculateAuditScore(audit, survey)
        console.log('📊 [DEBUG] Using compliance score:', basicScore.compliancePercentage, 'Yes:', basicScore.yesAnswers, 'No:', basicScore.noAnswers, 'for audit:', audit.id.slice(0, 8))
        return basicScore.compliancePercentage
      })
      .filter((score): score is number => score !== null)
    
    console.log('🔍 [DEBUG] All scores:', scoresWithData)
    
    if (scoresWithData.length === 0) return 0
    
    const avg = Math.round(scoresWithData.reduce((sum, score) => sum + score, 0) / scoresWithData.length)
    console.log('🎯 [DEBUG] Final average:', avg)
    return avg
  }, [audits, surveys])

  const activeBranches = branches.length
  const activeAuditors = users.filter(u => u.role === UserRole.AUDITOR).length

  // Calculate monthly completion trends
  const completionTrends = React.useMemo(() => {
    const now = new Date()
    const months = []
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = monthDate.toLocaleString('default', { month: 'short' })
      const monthYear = monthDate.getFullYear()
      const monthNum = monthDate.getMonth()
      
      const monthAudits = audits.filter(a => {
        const auditDate = new Date(a.createdAt)
        return auditDate.getFullYear() === monthYear && auditDate.getMonth() === monthNum
      })
      
      const total = monthAudits.length
      const completed = monthAudits.filter(a => a.status === AuditStatus.APPROVED).length
      const completion = total > 0 ? Math.round((completed / total) * 100) : 0
      
      months.push({ name: monthName, completion, total })
    }
    
    return months
  }, [audits])

  // Calculate quality distribution (compliance score ranges for completed audits)
  const qualityDistribution = React.useMemo(() => {
    if (audits.length === 0 || surveys.length === 0) return []
    
    // Only include completed/approved audits for quality metrics
    const completedAudits = audits.filter(a => 
      a.status === AuditStatus.APPROVED &&
      a.responses && Object.keys(a.responses).length > 0
    )
    
    if (completedAudits.length === 0) return []
    
    const ranges = [
      { name: 'Excellent (90-100%)', min: 90, max: 100, count: 0, color: 'bg-green-500' },
      { name: 'Good (80-89%)', min: 80, max: 89, count: 0, color: 'bg-blue-500' },
      { name: 'Fair (70-79%)', min: 70, max: 79, count: 0, color: 'bg-yellow-500' },
      { name: 'Poor (60-69%)', min: 60, max: 69, count: 0, color: 'bg-orange-500' },
      { name: 'Critical (<60%)', min: 0, max: 59, count: 0, color: 'bg-red-500' },
    ]
    
    completedAudits.forEach(audit => {
      const survey = surveys.find(s => s.id === audit.surveyId)
      if (!survey) return
      
      // Try weighted score first, fall back to compliance if no weighted questions
      const weightedScore = calculateWeightedAuditScore(audit, survey)
      let percentage: number
      if (weightedScore.weightedPossiblePoints > 0) {
        percentage = Math.round(weightedScore.weightedCompliancePercentage)
      } else {
        const basicScore = calculateAuditScore(audit, survey)
        percentage = Math.round(basicScore.compliancePercentage)
      }
      
      const range = ranges.find(r => percentage >= r.min && percentage <= r.max)
      if (range) range.count++
    })
    
    return ranges.filter(r => r.count > 0)
  }, [audits, surveys])

  // Calculate branch performance
  const branchPerformance = React.useMemo(() => {
    return branches.map(branch => {
      const branchAudits = audits.filter(a => a.branchId === branch.id)
      const total = branchAudits.length
      const completed = branchAudits.filter(a => a.status === AuditStatus.APPROVED).length
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
      
      // Only calculate quality score from completed audits with responses
      const completedWithResponses = branchAudits
        .filter(audit => 
          audit.status === AuditStatus.APPROVED &&
          audit.responses && Object.keys(audit.responses).length > 0
        )
        .map(audit => {
          const survey = surveys.find(s => s.id === audit.surveyId)
          if (!survey) return null
          // Try weighted score first, fall back to compliance if no weighted questions
          const weightedScore = calculateWeightedAuditScore(audit, survey)
          if (weightedScore.weightedPossiblePoints > 0) {
            return weightedScore.weightedCompliancePercentage
          }
          const basicScore = calculateAuditScore(audit, survey)
          return basicScore.compliancePercentage
        })
        .filter((score): score is number => score !== null)
      
      const avgScore = completedWithResponses.length > 0 ?
        Math.round(completedWithResponses.reduce((sum, score) => sum + score, 0) / completedWithResponses.length) : null
      
      return {
        name: branch.name,
        totalAudits: total,
        completedAudits: completed,
        completionRate,
        avgScore
      }
    })
    .filter(b => b.totalAudits > 0) // Only show branches with audits
    .sort((a, b) => b.completionRate - a.completionRate)
  }, [branches, audits, surveys])

  // Calculate auditor performance rankings
  const auditorRankings = React.useMemo(() => {
    const auditors = users.filter(u => u.role === UserRole.AUDITOR)
    
    return auditors.map(auditor => {
      const auditorAudits = audits.filter(a => a.assignedTo === auditor.id)
      const total = auditorAudits.length
      const completed = auditorAudits.filter(a => a.status === AuditStatus.APPROVED).length
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
      
      // Only calculate quality score from completed audits with responses
      const completedWithResponses = auditorAudits
        .filter(audit => 
          audit.status === AuditStatus.APPROVED &&
          audit.responses && Object.keys(audit.responses).length > 0
        )
        .map(audit => {
          const survey = surveys.find(s => s.id === audit.surveyId)
          if (!survey) return null
          // Try weighted score first, fall back to compliance if no weighted questions
          const weightedScore = calculateWeightedAuditScore(audit, survey)
          if (weightedScore.weightedPossiblePoints > 0) {
            return weightedScore.weightedCompliancePercentage
          }
          const basicScore = calculateAuditScore(audit, survey)
          return basicScore.compliancePercentage
        })
        .filter((score): score is number => score !== null)
      
      const avgScore = completedWithResponses.length > 0 ?
        Math.round(completedWithResponses.reduce((sum, score) => sum + score, 0) / completedWithResponses.length) : null
      
      return {
        name: auditor.name,
        totalAudits: total,
        completedAudits: completed,
        completionRate,
        avgScore
      }
    })
    .filter(a => a.totalAudits > 0) // Only show auditors with audits
    .sort((a, b) => {
      // Sort by completion rate first, then by avg score
      if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate
      // Handle null scores (put them at the end)
      if (a.avgScore === null) return 1
      if (b.avgScore === null) return -1
      return b.avgScore - a.avgScore
    })
  }, [users, audits, surveys])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'history', label: 'Audit History', icon: '📋', badge: audits.length },
    { id: 'reports', label: 'Reports', icon: '📄', disabled: true },
  ]

  return (
    <div className="mobile-container breathing-room">
      <Tabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab */}
        <div>
      {/* System Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
            <p className="text-gray-600">Comprehensive view of audit performance across the organization</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="input h-10">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-compact bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{totalAudits}</div>
                <div className="text-sm text-gray-600">Total Audits</div>
                <div className="text-xs text-gray-500">All audits in system</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
                <div className="text-xs text-gray-500">Completed audits</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                <span className="text-xl">⭐</span>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{averageScore}</div>
                <div className="text-sm text-gray-600">Average Score</div>
                <div className="text-xs text-gray-500">Quality rating</div>
              </div>
            </div>
          </div>
          
          <div className={`card-compact ${overdueAudits > 0 ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200' : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                <span className="text-xl">🚨</span>
              </div>
              <div className="flex-1">
                <div className={`text-2xl font-bold ${overdueAudits > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueAudits}</div>
                <div className="text-sm text-gray-600">Overdue</div>
                <div className="text-xs text-gray-500">Past due audits</div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="card-compact bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
                <span className="text-lg">🏢</span>
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900">{activeBranches}</div>
                <div className="text-sm text-gray-600">Active Branches</div>
                <div className="text-xs text-gray-500">Operational locations</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900">{activeAuditors}</div>
                <div className="text-sm text-gray-600">Active Auditors</div>
                <div className="text-xs text-gray-500">Team members</div>
              </div>
            </div>
          </div>
          
          <div className="card-compact bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
                <span className="text-lg">🗺️</span>
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900">{zones.length}</div>
                <div className="text-sm text-gray-600">Active Zones</div>
                <div className="text-xs text-gray-500">Geographic areas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Completion Trends */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Completion Trends</h3>
            <p className="text-sm text-gray-500">Audit completion over time (last 6 months)</p>
          </div>
          <div className="p-6">
            {completionTrends.every(m => m.total === 0) ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <div className="text-lg font-medium text-gray-700">No trend data yet</div>
                  <div className="text-sm text-gray-500">Monthly trends will appear as audits are created over time</div>
                </div>
              </div>
            ) : (
              <AnalyticsChart
                type="line"
                data={completionTrends}
                xKey="name"
                yKeys={['completion']}
                colors={['#10B981']}
              />
            )}
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quality Distribution</h3>
            <p className="text-sm text-gray-500">Audit scores breakdown by range</p>
          </div>
          <div className="p-6">
            {qualityDistribution.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-lg font-medium text-gray-700">No quality data yet</div>
                  <div className="text-sm text-gray-500">Score distribution will appear as audits are completed with responses</div>
                </div>
              </div>
            ) : (
              <AnalyticsChart
                type="bar"
                data={qualityDistribution.map(d => ({ name: d.name, value: d.count }))}
                xKey="name"
                yKeys={['value']}
                colors={['#3B82F6']}
              />
            )}
          </div>
        </div>
      </div>

      {/* Branch Performance Matrix */}
      <div className="mb-8">
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Branch Performance Matrix</h3>
            <p className="text-sm text-gray-500">Completion rates and quality scores by branch</p>
          </div>
          <div className="p-6">
            {branchPerformance.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-4xl mb-2">🏢</div>
                  <div className="text-lg font-medium text-gray-700">No branch data yet</div>
                  <div className="text-sm text-gray-500">Branch performance will appear as branches are created</div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Audits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Quality Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {branchPerformance.map((branch, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{branch.totalAudits}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="text-green-600 font-medium">{branch.completedAudits}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>{branch.completionRate}%</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${branch.completionRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {branch.avgScore !== null ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              branch.avgScore >= 90 ? 'bg-green-100 text-green-800' :
                              branch.avgScore >= 80 ? 'bg-blue-100 text-blue-800' :
                              branch.avgScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {branch.avgScore}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No completed audits</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {branch.avgScore !== null ? (
                            branch.completionRate >= 90 && branch.avgScore >= 90 ? (
                              <span className="text-green-600 font-medium">⭐ Excellent</span>
                            ) : branch.completionRate >= 80 && branch.avgScore >= 80 ? (
                              <span className="text-blue-600 font-medium">✓ Good</span>
                            ) : branch.completionRate >= 70 || branch.avgScore >= 70 ? (
                              <span className="text-yellow-600 font-medium">➜ Average</span>
                            ) : (
                              <span className="text-red-600 font-medium">⚠ Needs Attention</span>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auditor Rankings */}
      <div className="mb-8">
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Auditor Performance Rankings</h3>
            <p className="text-sm text-gray-500">Top performing auditors by completion rate and quality</p>
          </div>
          <div className="p-6">
            {auditorRankings.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <div className="text-lg font-medium text-gray-700">No auditor data yet</div>
                  <div className="text-sm text-gray-500">Auditor rankings will appear as auditors are assigned and complete audits</div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auditor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Audits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Quality Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditorRankings.map((auditor, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {idx < 3 ? (
                            <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                          ) : (
                            <span>#{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{auditor.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{auditor.totalAudits}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="text-green-600 font-medium">{auditor.completedAudits}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>{auditor.completionRate}%</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${auditor.completionRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {auditor.avgScore !== null ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              auditor.avgScore >= 90 ? 'bg-green-100 text-green-800' :
                              auditor.avgScore >= 80 ? 'bg-blue-100 text-blue-800' :
                              auditor.avgScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {auditor.avgScore}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No completed audits</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {auditor.avgScore !== null ? (
                            auditor.completionRate >= 90 && auditor.avgScore >= 90 ? (
                              <span className="text-green-600 font-medium">⭐ Outstanding</span>
                            ) : auditor.completionRate >= 80 && auditor.avgScore >= 80 ? (
                              <span className="text-blue-600 font-medium">✓ Strong</span>
                            ) : auditor.completionRate >= 70 || auditor.avgScore >= 70 ? (
                              <span className="text-yellow-600 font-medium">➜ Satisfactory</span>
                            ) : (
                              <span className="text-red-600 font-medium">⚠ Developing</span>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
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

        {/* Audit History Tab */}
        <div>
          <AuditHistory roleFilter="admin" />
        </div>

        {/* Reports Tab (Disabled) */}
        <div>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports Coming Soon</h3>
            <p className="text-gray-500">Scheduled and automated reports will be available here</p>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

export default AdminAnalytics
