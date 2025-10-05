import React from 'react'
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline'
import { AuditPermissions } from '../hooks/useAuditStateMachine'

interface Props {
  permissions: AuditPermissions
  completionPercent?: number
  className?: string
}

/**
 * Banner that shows audit status, warnings, and next actions to the user
 * Visual feedback based on the state machine's output
 */
export function AuditStatusBanner({ permissions, completionPercent = 0, className = '' }: Props) {
  // Don't show banner if there's nothing to display
  if (!permissions.showWarning && !permissions.nextAction) {
    return null
  }

  const { warningType, showWarning, nextAction } = permissions

  // Determine banner styling based on warning type
  const getBannerStyles = () => {
    switch (warningType) {
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
          IconComponent: XCircleIcon,
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-800',
          IconComponent: ExclamationTriangleIcon,
        }
      case 'info':
      default:
        // Use success green for 100% complete, blue for info
        if (completionPercent === 100 && nextAction) {
          return {
            container: 'bg-green-50 border-green-200',
            icon: 'text-green-600',
            text: 'text-green-800',
            IconComponent: CheckCircleIcon,
          }
        }
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-800',
          IconComponent: InformationCircleIcon,
        }
    }
  }

  const styles = getBannerStyles()
  const { IconComponent } = styles

  return (
    <div 
      className={`rounded-lg border p-4 ${styles.container} ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Warning message */}
      {showWarning && (
        <div className="flex items-start gap-3 mb-3">
          <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${styles.text}`}>
              {showWarning}
            </p>
          </div>
        </div>
      )}

      {/* Next action guidance */}
      {nextAction && (
        <div className={`flex items-start gap-3 ${showWarning ? 'pt-3 border-t border-current/20' : ''}`}>
          <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${styles.text}`}>
              Next Step:
            </p>
            <p className={`text-sm ${styles.text}`}>
              {nextAction}
            </p>
            
            {/* Progress indicator for incomplete audits */}
            {completionPercent < 100 && completionPercent > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={styles.text}>Progress</span>
                  <span className={`font-medium ${styles.text}`}>{completionPercent}%</span>
                </div>
                <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      completionPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${completionPercent}%` }}
                    role="progressbar"
                    aria-valuenow={completionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status label badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.container} border ${styles.text}`}>
          {permissions.statusLabel}
        </span>
      </div>
    </div>
  )
}

/**
 * Compact version for dashboard/list views
 */
export function AuditStatusBadge({ permissions, className = '' }: { permissions: AuditPermissions; className?: string }) {
  const getStatusColor = () => {
    switch (permissions.warningType) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'info':
        if (permissions.statusLabel.includes('Complete') || permissions.statusLabel.includes('Approved')) {
          return 'bg-green-100 text-green-800 border-green-200'
        }
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()} ${className}`}>
      {permissions.statusLabel}
    </span>
  )
}
