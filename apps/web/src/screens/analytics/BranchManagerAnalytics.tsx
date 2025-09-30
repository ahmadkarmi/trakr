import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../utils/api'
import { QK } from '../../utils/queryKeys'
import { Audit, Branch, User, AuditStatus, UserRole } from '@trakr/shared'
import AnalyticsKPICard from '../../components/analytics/AnalyticsKPICard'
import AnalyticsChart from '../../components/analytics/AnalyticsChart'
import TeamPerformanceTable from '../../components/analytics/TeamPerformanceTable'

const BranchManagerAnalytics: React.FC = () => {
  const { user } = useAuthStore()
  
  // Fetch data scoped to branch manager's branch
  const { data: audits = [] } = useQuery<Audit[]>({ 
    queryKey: QK.AUDITS('branch-manager'), 
    queryFn: () => api.getAudits() 
  })
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: QK.BRANCHES, queryFn: api.getBranches })
  const { data: users = [] } = useQuery<User[]>({ queryKey: QK.USERS, queryFn: api.getUsers })

  // Get current user's branch
  const userBranch = branches.find(b => b.managerId === user?.id)
  
  // Filter data to branch manager's scope
  const branchAudits = audits.filter(a => a.branchId === userBranch?.id)
  const teamMembers = users.filter(u => 
    u.role === UserRole.AUDITOR && 
    branchAudits.some(audit => audit.assignedTo === u.id)
  )

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
  
  // Calculate a mock quality score based on completion rate and responses
  // In a real implementation, this would use calculateAuditScore with Survey data
  const branchAverageScore = branchAudits.length > 0 ? 
    Math.round(branchAudits.reduce((sum, audit) => {
      // Mock score calculation based on completion and status
      const responseCount = Object.keys(audit.responses || {}).length
      const mockScore = responseCount > 0 ? Math.min(100, responseCount * 10 + Math.random() * 20 + 60) : 0
      return sum + mockScore
    }, 0) / branchAudits.length) : 0

  // Calculate system average for comparison (anonymized)
  const systemCompletionRate = audits.length > 0 ? 
    Math.round((audits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length / audits.length) * 100) : 0

  return (
    <div className="mobile-container breathing-room">
      {/* Branch Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Branch Analytics</h2>
            <p className="text-gray-600">
              Performance insights for {userBranch?.name || 'your branch'}
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
            <AnalyticsChart
              type="line"
              data={[
                { name: 'Jan', completion: 85, quality: 78 },
                { name: 'Feb', completion: 88, quality: 82 },
                { name: 'Mar', completion: 82, quality: 79 },
                { name: 'Apr', completion: 91, quality: 85 },
                { name: 'May', completion: 89, quality: 83 },
                { name: 'Jun', completion: 93, quality: 87 },
              ]}
              xKey="name"
              yKeys={['completion', 'quality']}
              colors={['#10B981', '#3B82F6']}
            />
          </div>
        </div>

        {/* Audit Status Distribution */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Audit Status Breakdown</h3>
            <p className="text-sm text-gray-500">Current audit status distribution</p>
          </div>
          <div className="p-6">
            <AnalyticsChart
              type="pie"
              data={[
                { name: 'Completed', value: branchAudits.filter(a => a.status === AuditStatus.COMPLETED).length },
                { name: 'In Progress', value: branchAudits.filter(a => a.status === AuditStatus.IN_PROGRESS).length },
                { name: 'Draft', value: branchAudits.filter(a => a.status === AuditStatus.DRAFT).length },
                { name: 'Submitted', value: branchAudits.filter(a => a.status === AuditStatus.SUBMITTED).length },
              ]}
              colors={['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6']}
            />
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
