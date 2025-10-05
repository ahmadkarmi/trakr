import React from 'react'
import { User, Audit, AuditStatus } from '@trakr/shared'

interface TeamPerformanceTableProps {
  teamMembers: User[]
  audits: Audit[]
}

const TeamPerformanceTable: React.FC<TeamPerformanceTableProps> = ({
  teamMembers,
  audits
}) => {
  const getMemberMetrics = (userId: string) => {
    const memberAudits = audits.filter(a => a.assignedTo === userId)
    const completed = memberAudits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
    const total = memberAudits.length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    // Calculate a mock quality score based on completion rate and responses
    // In a real implementation, this would use calculateAuditScore with Survey data
    const averageScore = memberAudits.length > 0 ? 
      Math.round(memberAudits.reduce((sum, audit) => {
        // Mock score calculation based on completion and status
        const responseCount = Object.keys(audit.responses || {}).length
        const mockScore = responseCount > 0 ? Math.min(100, responseCount * 10 + Math.random() * 20 + 60) : 0
        return sum + mockScore
      }, 0) / memberAudits.length) : 0
    
    const overdue = memberAudits.filter(a => {
      if (!a.dueAt) return false
      return new Date(a.dueAt) < new Date() && a.status !== AuditStatus.COMPLETED && a.status !== AuditStatus.APPROVED
    }).length
    
    return { total, completed, completionRate, averageScore, overdue }
  }

  const getPerformanceColor = (completionRate: number) => {
    if (completionRate >= 90) return 'text-green-600 bg-green-50'
    if (completionRate >= 75) return 'text-yellow-600 bg-yellow-50'
    if (completionRate >= 60) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getPerformanceIcon = (completionRate: number) => {
    if (completionRate >= 90) return '🌟'
    if (completionRate >= 75) return '👍'
    if (completionRate >= 60) return '⚠️'
    return '🔴'
  }

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Team Performance</h3>
        <p className="text-sm text-gray-500">Individual performance metrics for your team members</p>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamMembers.map((member) => {
                const metrics = getMemberMetrics(member.id)
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {member.avatarUrl ? (
                          <img 
                            src={member.avatarUrl} 
                            alt={member.name} 
                            className="w-8 h-8 rounded-full mr-3" 
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-primary-600">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(metrics.completionRate)}`}>
                          {metrics.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.averageScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {metrics.overdue > 0 ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {metrics.overdue}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getPerformanceIcon(metrics.completionRate)}</span>
                        <span className="text-sm text-gray-600">
                          {metrics.completionRate >= 90 ? 'Excellent' : 
                           metrics.completionRate >= 75 ? 'Good' : 
                           metrics.completionRate >= 60 ? 'Fair' : 'Needs Improvement'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {teamMembers.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No team members found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TeamPerformanceTable
