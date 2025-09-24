import React from 'react'

type Tone = 'gray' | 'warning' | 'danger' | 'primary' | 'success'
type Size = 'xs' | 'sm'

type Props = {
  label: React.ReactNode
  tone?: Tone
  size?: Size
  className?: string
  icon?: React.ReactNode
}

const toneClasses: Record<Tone, string> = {
  gray: 'bg-gray-200 text-gray-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-700',
}

const sizeClasses: Record<Size, string> = {
  xs: 'gap-1 px-1.5 py-0.5 rounded text-[10px]',
  sm: 'gap-1.5 px-2 py-0.5 rounded text-xs',
}

const InfoBadge: React.FC<Props> = ({ label, tone = 'gray', size = 'sm', className = '', icon }) => {
  const toneCls = toneClasses[tone] || toneClasses.gray
  const sizeCls = sizeClasses[size] || sizeClasses.sm
  return (
    <span className={`inline-flex items-center ${sizeCls} ${toneCls} ${className}`}>
      {icon}
      <span>{label}</span>
    </span>
  )
}

export default InfoBadge
