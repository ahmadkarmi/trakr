import React from 'react'

interface PersonalGoalsWidgetProps {
  currentCompletionRate: number
  currentQualityScore: number
  monthlyTarget: number
  currentMonthly: number
}

const PersonalGoalsWidget: React.FC<PersonalGoalsWidgetProps> = ({
  currentCompletionRate,
  currentQualityScore,
  monthlyTarget,
  currentMonthly
}) => {
  const completionGoal = 95
  const qualityGoal = 90
  
  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Personal Goals & Progress</h3>
        <p className="text-sm text-gray-500">Track your progress toward personal performance targets</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Completion Rate Goal */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-900">Completion Rate</h4>
              <span className="text-2xl">🎯</span>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-blue-700">Current: {currentCompletionRate}%</span>
                <span className="text-blue-600">Goal: {completionGoal}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getProgressColor(currentCompletionRate, completionGoal)}`}
                  style={{ width: `${getProgressPercentage(currentCompletionRate, completionGoal)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-blue-600">
              {currentCompletionRate >= completionGoal ? 
                '🎉 Goal achieved!' : 
                `${completionGoal - currentCompletionRate}% to go`
              }
            </p>
          </div>

          {/* Quality Score Goal */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-green-900">Quality Score</h4>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-green-700">Current: {currentQualityScore}</span>
                <span className="text-green-600">Goal: {qualityGoal}</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getProgressColor(currentQualityScore, qualityGoal)}`}
                  style={{ width: `${getProgressPercentage(currentQualityScore, qualityGoal)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-green-600">
              {currentQualityScore >= qualityGoal ? 
                '🌟 Excellent quality!' : 
                `${qualityGoal - currentQualityScore} points to go`
              }
            </p>
          </div>

          {/* Monthly Target */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-purple-900">Monthly Target</h4>
              <span className="text-2xl">📅</span>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-purple-700">Current: {currentMonthly}</span>
                <span className="text-purple-600">Target: {monthlyTarget}</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getProgressColor(currentMonthly, monthlyTarget)}`}
                  style={{ width: `${getProgressPercentage(currentMonthly, monthlyTarget)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-purple-600">
              {currentMonthly >= monthlyTarget ? 
                '🚀 Target exceeded!' : 
                `${monthlyTarget - currentMonthly} audits to go`
              }
            </p>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Recent Achievements</h4>
          <div className="flex flex-wrap gap-2">
            {currentCompletionRate >= completionGoal && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🎯 Completion Master
              </span>
            )}
            {currentQualityScore >= qualityGoal && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ⭐ Quality Champion
              </span>
            )}
            {currentMonthly >= monthlyTarget && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                🚀 Monthly Hero
              </span>
            )}
            {currentCompletionRate >= 100 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                💯 Perfect Score
              </span>
            )}
          </div>
          
          {currentCompletionRate < completionGoal && currentQualityScore < qualityGoal && currentMonthly < monthlyTarget && (
            <p className="text-sm text-gray-500 mt-2">
              Keep up the great work! Achievements will appear here as you reach your goals.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PersonalGoalsWidget
