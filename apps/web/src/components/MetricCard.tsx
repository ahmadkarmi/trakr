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
      className={`group relative bg-white ${colors.border} border rounded-xl p-4 sm:p-5 text-left shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 ${isButton ? 'hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.12)] hover:-translate-y-1 cursor-pointer active:scale-95' : 'hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.1)]'} ${className}`}
    >
      <div className="relative mb-2">
        <div className={`absolute inset-0 ${colors.iconBg} rounded-lg blur-md opacity-0 group-hover:opacity-20 transition-opacity`} />
        <div className={`relative ${iconSize} ${colors.iconBg} rounded-lg flex items-center justify-center`}>
          <div className={`${colors.iconText}`}>{icon}</div>
        </div>
      </div>
      <p className={`${valueSize} font-bold ${colors.value} tabular-nums`}>{value}</p>
      <p className={`text-xs font-semibold ${colors.label} uppercase tracking-wide mt-1`}>{label}</p>
      {children}
    </Container>
  )
}
