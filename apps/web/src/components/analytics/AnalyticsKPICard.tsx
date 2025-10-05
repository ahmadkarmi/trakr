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
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
      case 'warning':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
      case 'danger':
        return 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
    }
  }

  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-500'
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

  if (compact) {
    return (
      <div className={`card-compact ${getVariantStyles()}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
            <span className="text-lg">{icon}</span>
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-600">{title}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card-compact ${getVariantStyles()}`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
          <span className="text-xl">{icon}</span>
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()} {trend}
              </span>
            )}
            <span className="text-xs text-gray-500">{description}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsKPICard
