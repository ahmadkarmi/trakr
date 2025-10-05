import React from 'react'
import { Audit, Survey, calculateAuditScore, AuditStatus } from '@trakr/shared'
import StatusBadge from '@/components/StatusBadge'

export type MobileAuditCardMode = 'recent' | 'scheduled'

type Props = {
  audit: Audit
  branchName: string
  surveys: Survey[]
  mode?: MobileAuditCardMode
  onSummary: () => void
  onOpen: () => void
}

const MobileAuditCard: React.FC<Props> = ({ audit: a, branchName, surveys, mode = 'recent', onSummary, onOpen }) => {
  const s = React.useMemo(() => surveys.find(su => su.id === a.surveyId), [surveys, a.surveyId])
  const comp = React.useMemo(() => (s ? Math.round(calculateAuditScore(a, s).completionPercentage) : 0), [a, s])

  const dueAt = a.dueAt ? new Date(a.dueAt) : null
  const isOverdue = !!dueAt && dueAt < new Date()
  const isDueToday = !!dueAt && dueAt.toDateString() === new Date().toDateString()

  const short2 = a.id.slice(-2)
  const short8 = a.id.slice(-8)

  // Status-based button configuration
  const buttonConfig = React.useMemo(() => {
    switch (a.status) {
      case AuditStatus.DRAFT:
        return {
          label: comp > 0 ? 'Continue Draft' : 'Start Audit',
          action: onOpen,
          icon: '▶',
          color: 'bg-blue-600 hover:bg-blue-700',
        }
      case AuditStatus.IN_PROGRESS:
        return {
          label: 'Continue',
          action: onOpen,
          icon: '▶',
          color: 'bg-orange-600 hover:bg-orange-700',
        }
      case AuditStatus.SUBMITTED:
        return {
          label: 'View Submission',
          action: onSummary,
          icon: '📋',
          color: 'bg-yellow-600 hover:bg-yellow-700',
        }
      case AuditStatus.COMPLETED:
        return {
          label: 'View Results',
          action: onSummary,
          icon: '✓',
          color: 'bg-green-600 hover:bg-green-700',
        }
      case AuditStatus.APPROVED:
        return {
          label: 'View Approved',
          action: onSummary,
          icon: '✅',
          color: 'bg-emerald-600 hover:bg-emerald-700',
        }
      default:
        return {
          label: 'Open',
          action: onOpen,
          icon: '▶',
          color: 'bg-primary-600 hover:bg-primary-700',
        }
    }
  }, [a.status, comp, onOpen, onSummary])

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Card Header with Status Indicator */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-primary-600">{short2}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-lg truncate">
                  {mode === 'recent' ? a.id : branchName}
                </h4>
                <p className="text-gray-600 text-sm">
                  {mode === 'recent' ? branchName : `ID: ${short8}`}
                </p>
              </div>
            </div>

            {/* Status & Date Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={a.status} />
              {isOverdue && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Overdue
                </span>
              )}
              {isDueToday && !isOverdue && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Due Today
                </span>
              )}
              <span className="text-xs text-gray-500">
                {mode === 'recent'
                  ? `Updated ${new Date(a.updatedAt).toLocaleDateString()}`
                  : (dueAt ? `Due ${dueAt.toLocaleDateString()}` : 'No due date')}
              </span>
            </div>
          </div>

          {/* Progress Circle (only for recent) */}
          {mode === 'recent' && (
            <div className="flex-shrink-0">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${comp}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">{comp}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar (only for recent) */}
        {mode === 'recent' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Completion Progress</span>
              <span className="text-sm text-gray-500">{comp}% complete</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${comp}%` }}
              />
            </div>
          </div>
        )}

        {/* Status-Based Action Button */}
        <div>
          <button
            className={`w-full flex items-center justify-center gap-2 ${buttonConfig.color} text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 touch-target shadow-sm hover:shadow-md`}
            onClick={buttonConfig.action}
            aria-label={`${buttonConfig.label} audit`}
          >
            <span className="text-lg">{buttonConfig.icon}</span>
            <span>{buttonConfig.label}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MobileAuditCard
