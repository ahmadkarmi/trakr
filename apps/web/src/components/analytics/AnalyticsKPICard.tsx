import React from 'react'

interface AnalyticsKPICardProps {
  title: string
  value: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  icon: string
  description: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  compact?: boolean
}

const AnalyticsKPICard: React.FC<AnalyticsKPICardProps> = ({
  title,
  value,
  trend,
  trendDirection = 'neutral',
  icon,
  description,
  variant = 'default',
  compact = false
}) => {
  const darkCardStyles = 'dark:bg-[var(--color-card)] dark:border-white/10 dark:bg-none'

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return `bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 ${darkCardStyles}`
      case 'warning':
        return `bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 ${darkCardStyles}`
      case 'danger':
        return `bg-gradient-to-r from-red-50 to-pink-50 border-red-200 ${darkCardStyles}`
      default:
        return `bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 ${darkCardStyles}`
    }
  }

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      default:
        return '→'
    }
  }

  const getTrendBadgeClasses = () => {
    switch (trendDirection) {
      case 'up':
        return 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-500/10 dark:text-green-200 dark:ring-green-500/30'
      case 'down':
        return 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/30'
      default:
        return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10'
    }
  }

  if (compact) {
    return (
      <div className={`card-compact ${getVariantStyles()} hover:-translate-y-1 transition-all duration-300 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.12)]`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary-400 rounded-lg blur-md opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center dark:bg-white/10">
              <span className="text-lg">{icon}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</div>
            <div className="text-sm font-semibold text-gray-600 dark:text-slate-300">{title}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">{description}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`group card-compact ${getVariantStyles()} hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-400 rounded-lg blur-lg opacity-15 group-hover:opacity-30 transition-opacity" />
          <div className="relative w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center dark:bg-white/10">
            <span className="text-xl">{icon}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</div>
          <div className="text-sm font-semibold text-gray-600 dark:text-slate-300">{title}</div>
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${getTrendBadgeClasses()}`}>
                {getTrendIcon()} {trend}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-slate-400">{description}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsKPICard
