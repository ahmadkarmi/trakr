import React from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const variantClasses: Record<Variant, { text: string; ring: string; bg: string }> = {
  primary: { text: 'text-primary-700', ring: 'ring-primary-100', bg: 'bg-primary-50' },
  success: { text: 'text-success-700', ring: 'ring-success-100', bg: 'bg-success-50' },
  warning: { text: 'text-warning-700', ring: 'ring-warning-100', bg: 'bg-warning-50' },
  danger:  { text: 'text-danger-700',  ring: 'ring-danger-100',  bg: 'bg-danger-50'  },
  neutral: { text: 'text-gray-700',    ring: 'ring-gray-100',    bg: 'bg-gray-50'    },
}

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  variant?: Variant
  trend?: { direction: 'up' | 'down'; value: string }
  progress?: number // 0-100, optional small bar
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, variant = 'neutral', trend, progress }) => {
  const v = variantClasses[variant]
  const progressPct = Math.max(0, Math.min(100, progress ?? 0))
  return (
    <div className={`card ring-1 ${v.ring}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-gray-500 truncate">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-2xl sm:text-3xl font-semibold ${v.text}`}>{value}</p>
            {trend && (
              <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-full ${trend.direction === 'up' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                {trend.direction === 'up' ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md flex items-center justify-center flex-shrink-0 ${v.bg}`}>{icon}</div>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-2 w-full bg-gray-100 rounded">
          <div className={`h-2 rounded ${v.text.replace('text-', 'bg-')}`} style={{ width: `${progressPct}%` }} />
        </div>
      )}
    </div>
  )
}

export default StatCard
