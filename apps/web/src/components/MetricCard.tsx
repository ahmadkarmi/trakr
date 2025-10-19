import React from 'react'

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger'

type Size = 'md' | 'lg'

interface MetricCardProps {
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  tone?: Tone
  size?: Size
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

const toneClasses: Record<Tone, { iconBg: string; iconText: string; border: string; value: string; label: string }> = {
  default: { iconBg: 'bg-gray-100', iconText: 'text-gray-600', border: 'border-gray-200', value: 'text-gray-900', label: 'text-gray-600' },
  primary: { iconBg: 'bg-primary-100', iconText: 'text-primary-600', border: 'border-gray-200', value: 'text-gray-900', label: 'text-gray-600' },
  success: { iconBg: 'bg-green-100', iconText: 'text-green-600', border: 'border-gray-200', value: 'text-gray-900', label: 'text-gray-600' },
  warning: { iconBg: 'bg-amber-100', iconText: 'text-amber-600', border: 'border-gray-200', value: 'text-gray-900', label: 'text-gray-600' },
  danger:  { iconBg: 'bg-red-100', iconText: 'text-red-600', border: 'border-gray-200', value: 'text-gray-900', label: 'text-gray-600' },
}

export default function MetricCard({ icon, value, label, tone = 'default', size = 'md', onClick, className = '', children }: MetricCardProps) {
  const colors = toneClasses[tone]
  const isButton = typeof onClick === 'function'
  const Container: any = isButton ? 'button' : 'div'
  const valueSize = size === 'lg' ? 'text-3xl' : 'text-2xl'
  const iconSize = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'

  return (
    <Container
      onClick={onClick}
      className={`bg-white ${colors.border} border rounded-xl p-4 sm:p-5 text-left transition-shadow ${isButton ? 'hover:shadow-md' : ''} ${className}`}
    >
      <div className={`${iconSize} ${colors.iconBg} rounded-lg flex items-center justify-center mb-2`}>
        <div className={`${colors.iconText}`}>{icon}</div>
      </div>
      <p className={`${valueSize} font-bold ${colors.value}`}>{value}</p>
      <p className={`text-xs ${colors.label} mt-1`}>{label}</p>
      {children}
    </Container>
  )
}
