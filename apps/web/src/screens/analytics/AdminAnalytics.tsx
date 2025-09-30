import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../utils/api'
import { QK } from '../../utils/queryKeys'
import { Audit, Branch, User, Zone, AuditStatus, UserRole } from '@trakr/shared'
import AnalyticsKPICard from '../../components/analytics/AnalyticsKPICard'
import AnalyticsChart from '../../components/analytics/AnalyticsChart'
import BranchPerformanceMatrix from '../../components/analytics/BranchPerformanceMatrix'
import AuditorRankingTable from '../../components/analytics/AuditorRankingTable'

const AdminAnalytics: React.FC = () => {
  // Fetch all data for admin analytics
  const { data: audits = [] } = useQuery<Audit[]>({ queryKey: QK.AUDITS('admin'), queryFn: () => api.getAudits() })
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: QK.BRANCHES, queryFn: api.getBranches })
  const { data: users = [] } = useQuery<User[]>({ queryKey: QK.USERS, queryFn: api.getUsers })
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: QK.ZONES, queryFn: api.getZones })

  // Calculate system-wide KPIs
  const totalAudits = audits.length
  const completedAudits = audits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
  const completionRate = totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0
  
  const overdueAudits = audits.filter(a => {
    if (!a.dueAt) return false
    return new Date(a.dueAt) < new Date() && a.status !== AuditStatus.COMPLETED && a.status !== AuditStatus.APPROVED
  }).length
  
  // Calculate a mock quality score based on completion rate and responses
  // In a real implementation, this would use calculateAuditScore with Survey data
  const averageScore = audits.length > 0 ? 
    Math.round(audits.reduce((sum, audit) => {
      // Mock score calculation based on completion and status
      const responseCount = Object.keys(audit.responses || {}).length
      const mockScore = responseCount > 0 ? Math.min(100, responseCount * 10 + Math.random() * 20 + 60) : 0
      return sum + mockScore
    }, 0) / audits.length) : 0

  const activeBranches = branches.length
  const activeAuditors = users.filter(u => u.role === UserRole.AUDITOR).length

  return (
    <div className="mobile-container breathing-room">
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
          <AnalyticsKPICard
            title="Total Audits"
            value={totalAudits.toString()}
            trend="+12%"
            trendDirection="up"
            icon="📊"
            description="All audits in system"
          />
          <AnalyticsKPICard
            title="Completion Rate"
            value={`${completionRate}%`}
            trend="+5%"
            trendDirection="up"
            icon="✅"
            description="Completed audits"
          />
          <AnalyticsKPICard
            title="Average Score"
            value={averageScore.toString()}
            trend="+2.3"
            trendDirection="up"
            icon="⭐"
            description="Quality rating"
          />
          <AnalyticsKPICard
            title="Overdue"
            value={overdueAudits.toString()}
            trend="-8%"
            trendDirection="down"
            icon="🚨"
            description="Past due audits"
            variant={overdueAudits > 0 ? "danger" : "success"}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <AnalyticsKPICard
            title="Active Branches"
            value={activeBranches.toString()}
            icon="🏢"
            description="Operational locations"
            compact
          />
          <AnalyticsKPICard
            title="Active Auditors"
            value={activeAuditors.toString()}
            icon="👥"
            description="Team members"
            compact
          />
          <AnalyticsKPICard
            title="Active Zones"
            value={zones.length.toString()}
            icon="🗺️"
            description="Geographic areas"
            compact
          />
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Completion Trends */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Completion Trends</h3>
            <p className="text-sm text-gray-500">Audit completion over time</p>
          </div>
          <div className="p-6">
            <AnalyticsChart
              type="line"
              data={[
                { name: 'Jan', completed: 45, total: 50 },
                { name: 'Feb', completed: 52, total: 60 },
                { name: 'Mar', completed: 48, total: 55 },
                { name: 'Apr', completed: 61, total: 65 },
                { name: 'May', completed: 58, total: 62 },
                { name: 'Jun', completed: 67, total: 70 },
              ]}
              xKey="name"
              yKeys={['completed', 'total']}
              colors={['#10B981', '#6B7280']}
            />
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quality Distribution</h3>
            <p className="text-sm text-gray-500">Audit scores breakdown</p>
          </div>
          <div className="p-6">
            <AnalyticsChart
              type="bar"
              data={[
                { name: 'Excellent (90-100)', count: 45 },
                { name: 'Good (80-89)', count: 32 },
                { name: 'Fair (70-79)', count: 18 },
                { name: 'Poor (<70)', count: 5 },
              ]}
              xKey="name"
              yKeys={['count']}
              colors={['#3B82F6']}
            />
          </div>
        </div>
      </div>

      {/* Branch Performance Matrix */}
      <div className="mb-8">
        <BranchPerformanceMatrix branches={branches} audits={audits} />
      </div>

      {/* Auditor Rankings */}
      <div className="mb-8">
        <AuditorRankingTable users={users.filter(u => u.role === UserRole.AUDITOR)} audits={audits} />
      </div>
    </div>
  )
}

export default AdminAnalytics
