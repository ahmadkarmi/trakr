import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../utils/api'
import { QK } from '../../utils/queryKeys'
import { Audit, AuditStatus, Survey, calculateAuditScore, calculateWeightedAuditScore } from '@trakr/shared'
import AnalyticsKPICard from '../../components/analytics/AnalyticsKPICard'
import AnalyticsChart from '../../components/analytics/AnalyticsChart'
import PersonalGoalsWidget from '../../components/analytics/PersonalGoalsWidget'

const AuditorAnalytics: React.FC = () => {
  const { user } = useAuthStore()
  
  // Fetch audits - will be filtered to user's audits only
  const { data: audits = [] } = useQuery<Audit[]>({ 
    queryKey: QK.AUDITS('auditor'), 
    queryFn: () => api.getAudits() 
  })
  const { data: surveys = [] } = useQuery<Survey[]>({ queryKey: QK.SURVEYS, queryFn: () => api.getSurveys() })

  // Filter to only current user's audits
  const myAudits = audits.filter(a => a.assignedTo === user?.id)
  
  // Calculate personal KPIs
  const totalMyAudits = myAudits.length
  // Only count APPROVED audits as completed (COMPLETED = not submitted yet)
  const completedMyAudits = myAudits.filter(a => 
    a.status === AuditStatus.APPROVED
  ).length
  const myCompletionRate = totalMyAudits > 0 ? 
    Math.round((completedMyAudits / totalMyAudits) * 100) : 0
  
  const overdueMyAudits = myAudits.filter(a => {
    if (!a.dueAt) return false
    return new Date(a.dueAt) < new Date() && a.status !== AuditStatus.APPROVED
  }).length
  
  // Calculate average quality score using actual survey data
  const myAverageScore = React.useMemo(() => {
    if (myAudits.length === 0 || surveys.length === 0) return 0
    
    const scoresWithData = myAudits
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
  }, [myAudits, surveys])

  // Calculate team average for anonymous comparison
  const teamAudits = audits.filter(a => a.assignedTo !== user?.id) // Other auditors' audits
  const teamCompletionRate = teamAudits.length > 0 ? 
    Math.round((teamAudits.filter(a => a.status === AuditStatus.APPROVED).length / teamAudits.length) * 100) : 0
  
  const teamAverageScore = React.useMemo(() => {
    if (teamAudits.length === 0 || surveys.length === 0) return 0
    
    const scoresWithData = teamAudits
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
  }, [teamAudits, surveys])

  // Calculate average time per audit (mock data for now)
  const avgTimePerAudit = "2.3h"
  const thisMonthAudits = myAudits.filter(a => {
    const auditDate = new Date(a.updatedAt)
    const now = new Date()
    return auditDate.getMonth() === now.getMonth() && auditDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="mobile-container breathing-room">
      {/* Personal Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Personal Analytics</h2>
            <p className="text-gray-600">Your audit performance and development insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="input h-10">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {/* Personal KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsKPICard
            title="My Audits"
            value={totalMyAudits.toString()}
            trend="+6"
            trendDirection="up"
            icon="📋"
            description="Total assigned audits"
          />
          <AnalyticsKPICard
            title="Completion Rate"
            value={`${myCompletionRate}%`}
            trend={myCompletionRate >= teamCompletionRate ? "+5%" : "-3%"}
            trendDirection={myCompletionRate >= teamCompletionRate ? "up" : "down"}
            icon="✅"
            description={`Team avg: ${teamCompletionRate}%`}
            variant={myCompletionRate >= teamCompletionRate ? "success" : "warning"}
          />
          <AnalyticsKPICard
            title="Quality Score"
            value={myAverageScore.toString()}
            trend={myAverageScore >= teamAverageScore ? "+2.1" : "-1.2"}
            trendDirection={myAverageScore >= teamAverageScore ? "up" : "down"}
            icon="⭐"
            description={`Team avg: ${teamAverageScore}`}
            variant={myAverageScore >= teamAverageScore ? "success" : "warning"}
          />
          <AnalyticsKPICard
            title="Overdue"
            value={overdueMyAudits.toString()}
            trend="-2"
            trendDirection="down"
            icon="🚨"
            description="Past due audits"
            variant={overdueMyAudits > 0 ? "danger" : "success"}
          />
        </div>

        {/* Personal Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <AnalyticsKPICard
            title="This Month"
            value={thisMonthAudits.toString()}
            icon="📅"
            description="Audits completed"
            compact
          />
          <AnalyticsKPICard
            title="Avg Time"
            value={avgTimePerAudit}
            icon="⏱️"
            description="Per audit"
            compact
          />
          <AnalyticsKPICard
            title="Consistency"
            value="92%"
            icon="🎯"
            description="Score variance"
            compact
          />
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Personal Performance Trends */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
            <p className="text-sm text-gray-500">Your monthly completion and quality trends</p>
          </div>
          <div className="p-6">
            <AnalyticsChart
              type="line"
              data={[
                { name: 'Jan', completion: 88, quality: 85, teamAvg: 82 },
                { name: 'Feb', completion: 92, quality: 87, teamAvg: 84 },
                { name: 'Mar', completion: 89, quality: 83, teamAvg: 81 },
                { name: 'Apr', completion: 95, quality: 91, teamAvg: 85 },
                { name: 'May', completion: 91, quality: 88, teamAvg: 83 },
                { name: 'Jun', completion: 97, quality: 93, teamAvg: 86 },
              ]}
              xKey="name"
              yKeys={['completion', 'quality', 'teamAvg']}
              colors={['#10B981', '#3B82F6', '#9CA3AF']}
            />
          </div>
        </div>

        {/* Audit Type Performance */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Performance by Audit Type</h3>
            <p className="text-sm text-gray-500">Your scores across different audit categories</p>
          </div>
          <div className="p-6">
            <AnalyticsChart
              type="bar"
              data={[
                { name: 'Safety', score: 92, count: 15 },
                { name: 'Quality', score: 88, count: 12 },
                { name: 'Compliance', score: 85, count: 8 },
                { name: 'Environmental', score: 90, count: 10 },
              ]}
              xKey="name"
              yKeys={['score']}
              colors={['#3B82F6']}
            />
          </div>
        </div>
      </div>

      {/* Personal Goals */}
      <div className="mb-8">
        <PersonalGoalsWidget 
          currentCompletionRate={myCompletionRate}
          currentQualityScore={myAverageScore}
          monthlyTarget={20}
          currentMonthly={thisMonthAudits}
        />
      </div>

      {/* Personal Insights */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Personal Insights & Development</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {myCompletionRate >= teamCompletionRate && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-sm">🏆</span>
                </div>
                <div>
                  <h4 className="font-medium text-green-900">Excellent Performance</h4>
                  <p className="text-sm text-green-700">Your completion rate is {myCompletionRate - teamCompletionRate}% above team average. Keep up the great work!</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm">📈</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Growth Opportunity</h4>
                <p className="text-sm text-blue-700">Focus on Environmental audits to improve your overall quality score - currently your lowest performing category.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-600 text-sm">🎯</span>
              </div>
              <div>
                <h4 className="font-medium text-purple-900">Consistency Achievement</h4>
                <p className="text-sm text-purple-700">Your score consistency is excellent at 92%. This shows reliable quality in your audit work.</p>
              </div>
            </div>

            {overdueMyAudits > 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-sm">⚠️</span>
                </div>
                <div>
                  <h4 className="font-medium text-red-900">Attention Needed</h4>
                  <p className="text-sm text-red-700">You have {overdueMyAudits} overdue audit{overdueMyAudits > 1 ? 's' : ''}. Consider prioritizing these to maintain your excellent completion rate.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuditorAnalytics
