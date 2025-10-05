import React from 'react'
import { User, Audit, AuditStatus } from '@trakr/shared'

interface AuditorRankingTableProps {
  users: User[]
  audits: Audit[]
}

const AuditorRankingTable: React.FC<AuditorRankingTableProps> = ({
  users,
  audits
}) => {
  const getAuditorMetrics = (userId: string) => {
    const userAudits = audits.filter(a => a.assignedTo === userId)
    const completed = userAudits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
    const total = userAudits.length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    // Calculate a mock quality score based on completion rate and responses
    // In a real implementation, this would use calculateAuditScore with Survey data
    const averageScore = userAudits.length > 0 ? 
      Math.round(userAudits.reduce((sum, audit) => {
        // Mock score calculation based on completion and status
        const responseCount = Object.keys(audit.responses || {}).length
        const mockScore = responseCount > 0 ? Math.min(100, responseCount * 10 + Math.random() * 20 + 60) : 0
        return sum + mockScore
      }, 0) / userAudits.length) : 0
    
    return { total, completed, completionRate, averageScore }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `#${index + 1}`
    }
  }

  const getPerformanceColor = (completionRate: number) => {
    if (completionRate >= 90) return 'text-green-600'
    if (completionRate >= 75) return 'text-yellow-600'
    if (completionRate >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  // Sort auditors by completion rate, then by average score
  const rankedAuditors = users
    .map(user => ({
      ...user,
      metrics: getAuditorMetrics(user.id)
    }))
    .sort((a, b) => {
      if (b.metrics.completionRate !== a.metrics.completionRate) {
        return b.metrics.completionRate - a.metrics.completionRate
      }
      return b.metrics.averageScore - a.metrics.averageScore
    })
    .slice(0, 10) // Top 10 auditors

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Auditor Performance Rankings</h3>
        <p className="text-sm text-gray-500">Top performing auditors by completion rate and quality</p>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auditor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Audits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rankedAuditors.map((auditor, index) => (
                <tr key={auditor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center w-8 h-8">
                      <span className="text-lg font-medium">
                        {getRankIcon(index)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {auditor.avatarUrl ? (
                        <img 
                          src={auditor.avatarUrl} 
                          alt={auditor.name} 
                          className="w-8 h-8 rounded-full mr-3" 
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-primary-600">
                            {auditor.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{auditor.name}</div>
                        <div className="text-sm text-gray-500">{auditor.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {auditor.metrics.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getPerformanceColor(auditor.metrics.completionRate)}`}>
                      {auditor.metrics.completionRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {auditor.metrics.averageScore}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${auditor.metrics.completionRate >= 75 ? 'bg-green-500' : auditor.metrics.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${auditor.metrics.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{auditor.metrics.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {rankedAuditors.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No auditor data available</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditorRankingTable
