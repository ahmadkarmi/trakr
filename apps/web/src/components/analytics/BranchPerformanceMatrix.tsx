import React from 'react'
import { Branch, Audit, AuditStatus } from '@trakr/shared'

interface BranchPerformanceMatrixProps {
  branches: Branch[]
  audits: Audit[]
}

const BranchPerformanceMatrix: React.FC<BranchPerformanceMatrixProps> = ({
  branches,
  audits
}) => {
  const getBranchMetrics = (branchId: string) => {
    const branchAudits = audits.filter(a => a.branchId === branchId)
    const completed = branchAudits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.APPROVED).length
    const total = branchAudits.length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const averageScore = branchAudits.length > 0 ? 
      Math.round(branchAudits.reduce((sum, audit) => sum + (audit.score || 0), 0) / branchAudits.length) : 0
    
    return { total, completed, completionRate, averageScore }
  }

  const getPerformanceColor = (completionRate: number) => {
    if (completionRate >= 90) return 'bg-green-100 text-green-800'
    if (completionRate >= 75) return 'bg-yellow-100 text-yellow-800'
    if (completionRate >= 60) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const activeBranches = branches.filter(b => b.isActive !== false).slice(0, 10) // Top 10 branches

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Branch Performance Matrix</h3>
        <p className="text-sm text-gray-500">Completion rates and quality scores by branch</p>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Audits
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
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeBranches.map((branch) => {
                const metrics = getBranchMetrics(branch.id)
                return (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-primary-600">
                            {branch.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                          <div className="text-sm text-gray-500">{branch.address}</div>
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(metrics.completionRate)}`}>
                        {metrics.completionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.averageScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${metrics.completionRate >= 75 ? 'bg-green-500' : metrics.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${metrics.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{metrics.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {activeBranches.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-500">No branch data available</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BranchPerformanceMatrix
