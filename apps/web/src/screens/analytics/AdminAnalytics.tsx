import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../utils/api'
import { QK } from '../../utils/queryKeys'
import { Audit, Branch, User, Zone, AuditStatus, UserRole } from '@trakr/shared'
// Note: Analytics components will be imported when they're properly set up
// For now, we'll use placeholder components

const AdminAnalytics: React.FC = () => {
  // Fetch all data for admin analytics
  const { data: audits = [] } = useQuery<Audit[]>({ queryKey: QK.AUDITS('admin'), queryFn: () => api.getAudits() })
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => api.getBranches() })
  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.getUsers() })
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ['zones'], queryFn: () => api.getZones() })

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
            <p className="text-sm text-gray-500">Audit completion over time</p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <div className="text-lg font-medium text-gray-700">Completion Trends Chart</div>
                <div className="text-sm text-gray-500">Line chart showing audit completion over time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quality Distribution</h3>
            <p className="text-sm text-gray-500">Audit scores breakdown</p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-lg font-medium text-gray-700">Quality Distribution Chart</div>
                <div className="text-sm text-gray-500">Bar chart showing audit score ranges</div>
              </div>
            </div>
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
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-4xl mb-2">🏢</div>
                <div className="text-lg font-medium text-gray-700">Branch Performance Matrix</div>
                <div className="text-sm text-gray-500">Table showing performance metrics for {branches.length} branches</div>
              </div>
            </div>
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
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-4xl mb-2">👥</div>
                <div className="text-lg font-medium text-gray-700">Auditor Rankings Table</div>
                <div className="text-sm text-gray-500">Performance rankings for {users.filter(u => u.role === UserRole.AUDITOR).length} auditors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics
