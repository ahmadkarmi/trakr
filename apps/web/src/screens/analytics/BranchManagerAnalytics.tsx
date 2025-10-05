import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../utils/api'
import { QK } from '../../utils/queryKeys'
import { Audit, Branch, User, AuditStatus, UserRole, BranchManagerAssignment, Survey, calculateAuditScore, calculateWeightedAuditScore } from '@trakr/shared'
import AnalyticsChart from '../../components/analytics/AnalyticsChart'
import TeamPerformanceTable from '../../components/analytics/TeamPerformanceTable'
import AnalyticsKPICard from '../../components/analytics/AnalyticsKPICard'
import { useOrganization } from '../../contexts/OrganizationContext'

const BranchManagerAnalytics: React.FC = () => {
  const { user } = useAuthStore()
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id || user?.orgId

  // Fetch data scoped to current organization
  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ['audits', orgId],
    queryFn: () => api.getAudits(orgId ? { orgId } : undefined),
    enabled: !!orgId,
  })
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: QK.BRANCHES(orgId),
    queryFn: () => api.getBranches(orgId),
    enabled: !!orgId,
  })
  const { data: users = [] } = useQuery<User[]>({ queryKey: QK.USERS, queryFn: api.getUsers })
  const { data: surveys = [] } = useQuery<Survey[]>({ queryKey: QK.SURVEYS, queryFn: () => api.getSurveys() })
  
  // Get branch manager assignments for current user
  const { data: myAssignments = [] } = useQuery<BranchManagerAssignment[]>({
    queryKey: ['manager-branch-assignments', user?.id],
    queryFn: () => user?.id ? api.getManagerBranchAssignments(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  })

  // Get all branches this manager is assigned to
  const myBranchIds = React.useMemo(() => 
    myAssignments.map((a: BranchManagerAssignment) => a.branchId),
    [myAssignments]
  )
  
  const myBranches = React.useMemo(() => 
    branches.filter(b => myBranchIds.includes(b.id)),
    [branches, myBranchIds]
  )
  
  // Filter data to branch manager's scope (all assigned branches)
  const branchAudits = audits.filter(a => myBranchIds.includes(a.branchId))
  const teamMembers = users.filter(u => 
    u.role === UserRole.AUDITOR && 
    branchAudits.some(audit => audit.assignedTo === u.id)
  )
  
  console.log('[Branch Manager Analytics] My Branch IDs:', myBranchIds)
  console.log('[Branch Manager Analytics] Branch Audits:', branchAudits.length)
  console.log('[Branch Manager Analytics] All Audits:', audits.length)

  // Calculate branch-specific KPIs
  const totalBranchAudits = branchAudits.length
  const completedBranchAudits = branchAudits.filter(a => 
    a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED
  ).length
  const branchCompletionRate = totalBranchAudits > 0 ? 
    Math.round((completedBranchAudits / totalBranchAudits) * 100) : 0
  
  const overdueBranchAudits = branchAudits.filter(a => {
    if (!a.dueAt) return false
    return new Date(a.dueAt) < new Date() && a.status !== AuditStatus.COMPLETED && a.status !== AuditStatus.APPROVED
  }).length
  
  // Calculate average quality score using actual survey data
  const branchAverageScore = React.useMemo(() => {
    if (branchAudits.length === 0 || surveys.length === 0) return 0
    
    const scoresWithData = branchAudits
      .filter(audit => audit.responses && Object.keys(audit.responses).length > 0)
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
    
    if (scoresWithData.length === 0) return 0
    return Math.round(scoresWithData.reduce((sum, score) => sum + score, 0) / scoresWithData.length)
  }, [branchAudits, surveys])

  // Calculate system average for comparison (anonymized)
  const systemCompletionRate = audits.length > 0 ? 
    Math.round((audits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length / audits.length) * 100) : 0

  // Calculate real monthly trends from audit data
  const monthlyTrends = React.useMemo(() => {
    const now = new Date()
    const months = []
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = monthDate.toLocaleString('default', { month: 'short' })
      const monthYear = monthDate.getFullYear()
      const monthNum = monthDate.getMonth()
      
      // Filter audits for this month
      const monthAudits = branchAudits.filter(a => {
        const auditDate = new Date(a.createdAt)
        return auditDate.getFullYear() === monthYear && auditDate.getMonth() === monthNum
      })
      
      // Calculate metrics
      const total = monthAudits.length
      const completed = monthAudits.filter(a => 
        a.status === AuditStatus.COMPLETED || 
        a.status === AuditStatus.APPROVED
      ).length
      const completion = total > 0 ? Math.round((completed / total) * 100) : 0
      
      // Calculate quality score using actual survey data
      const qualityScores = monthAudits
        .filter(audit => audit.responses && Object.keys(audit.responses).length > 0)
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
      
      const quality = qualityScores.length > 0 ?
        Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : 0
      
      months.push({
        name: monthName,
        completion,
        quality,
        audits: total
      })
    }
    
    return months
  }, [branchAudits, surveys])

  return (
    <div className="mobile-container breathing-room">
      {/* Branch Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Branch Analytics</h2>
            <p className="text-gray-600">
              Performance insights for {myBranches.length === 1 ? myBranches[0]?.name : `${myBranches.length} branches`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select className="input h-10">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {/* Branch KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsKPICard
            title="Branch Audits"
            value={totalBranchAudits.toString()}
            trend="+8%"
            trendDirection="up"
            icon="📋"
            description="Total branch audits"
          />
          <AnalyticsKPICard
            title="Completion Rate"
            value={`${branchCompletionRate}%`}
            trend={branchCompletionRate >= systemCompletionRate ? "+3%" : "-2%"}
            trendDirection={branchCompletionRate >= systemCompletionRate ? "up" : "down"}
            icon="✅"
            description={`System avg: ${systemCompletionRate}%`}
            variant={branchCompletionRate >= systemCompletionRate ? "success" : "warning"}
          />
          <AnalyticsKPICard
            title="Average Score"
            value={branchAverageScore.toString()}
            trend="+1.8"
            trendDirection="up"
            icon="⭐"
            description="Branch quality rating"
          />
          <AnalyticsKPICard
            title="Overdue"
            value={overdueBranchAudits.toString()}
            trend="-5%"
            trendDirection="down"
            icon="🚨"
            description="Past due audits"
            variant={overdueBranchAudits > 0 ? "danger" : "success"}
          />
        </div>

        {/* Team Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <AnalyticsKPICard
            title="Team Members"
            value={teamMembers.length.toString()}
            icon="👥"
            description="Active auditors"
            compact
          />
          <AnalyticsKPICard
            title="Avg per Auditor"
            value={teamMembers.length > 0 ? Math.round(totalBranchAudits / teamMembers.length).toString() : "0"}
            icon="📊"
            description="Audits per person"
            compact
          />
          <AnalyticsKPICard
            title="Branch Rank"
            value="3rd"
            icon="🏆"
            description="vs other branches"
            compact
          />
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Branch Trends */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Branch Performance Trends</h3>
            <p className="text-sm text-gray-500">Monthly completion and quality trends</p>
          </div>
          <div className="p-6">
            {branchAudits.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm mt-2">Audit data will appear here once audits are assigned to your branches.</p>
              </div>
            ) : monthlyTrends.every(m => m.audits === 0) ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">No trend data yet</p>
                <p className="text-sm mt-2">Monthly trends will appear as audits are completed over time.</p>
              </div>
            ) : (
              <AnalyticsChart
                type="line"
                data={monthlyTrends}
                xKey="name"
                yKeys={['completion', 'quality']}
                colors={['#10B981', '#3B82F6']}
              />
            )}
          </div>
        </div>

        {/* Audit Status Distribution */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Audit Status Breakdown</h3>
            <p className="text-sm text-gray-500">Current audit status distribution</p>
          </div>
          <div className="p-6">
            {branchAudits.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">No audits to display</p>
                <p className="text-sm mt-2">Audit status breakdown will appear here once audits are created.</p>
              </div>
            ) : (
              <AnalyticsChart
                type="pie"
                data={[
                  { name: 'Approved', value: branchAudits.filter(a => a.status === AuditStatus.APPROVED).length },
                  { name: 'Submitted', value: branchAudits.filter(a => a.status === AuditStatus.SUBMITTED).length },
                  { name: 'Completed', value: branchAudits.filter(a => a.status === AuditStatus.COMPLETED).length },
                  { name: 'In Progress', value: branchAudits.filter(a => a.status === AuditStatus.IN_PROGRESS).length },
                  { name: 'Draft', value: branchAudits.filter(a => a.status === AuditStatus.DRAFT).length },
                  { name: 'Rejected', value: branchAudits.filter(a => a.status === AuditStatus.REJECTED).length },
                ]}
                colors={['#10B981', '#8B5CF6', '#3B82F6', '#F59E0B', '#6B7280', '#EF4444']}
              />
            )}
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="mb-8">
        <TeamPerformanceTable teamMembers={teamMembers} audits={branchAudits} />
      </div>

      {/* Branch Insights */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Branch Insights & Recommendations</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-green-900">Strong Performance</h4>
                <p className="text-sm text-green-700">Your branch completion rate is {branchCompletionRate - systemCompletionRate}% above system average.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm">i</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Team Development</h4>
                <p className="text-sm text-blue-700">Consider additional training for team members with completion rates below 80%.</p>
              </div>
            </div>

            {overdueBranchAudits > 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-sm">!</span>
                </div>
                <div>
                  <h4 className="font-medium text-red-900">Action Required</h4>
                  <p className="text-sm text-red-700">{overdueBranchAudits} audits are overdue and need immediate attention.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BranchManagerAnalytics
