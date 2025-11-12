import React from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/20/solid'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
export type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: React.ReactNode | 'auto'
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  danger: 'bg-danger-50 text-danger-700 ring-danger-600/20',
  info: 'bg-primary-50 text-primary-700 ring-primary-600/20',
  neutral: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  primary: 'bg-primary-50 text-primary-700 ring-primary-600/20',
}

const variantIcons: Record<BadgeVariant, React.ReactNode> = {
  success: <CheckCircleIcon className="w-3 h-3" />,
  warning: <ExclamationTriangleIcon className="w-3 h-3" />,
  danger: <XCircleIcon className="w-3 h-3" />,
  info: <InformationCircleIcon className="w-3 h-3" />,
  neutral: null,
  primary: null,
}

const sizeStyles: Record<BadgeSize, { container: string, text: string }> = {
  sm: {
    container: 'px-2 py-0.5',
    text: 'text-xs'
  },
  md: {
    container: 'px-2.5 py-1',
    text: 'text-xs'
  },
  lg: {
    container: 'px-3 py-1.5',
    text: 'text-sm'
  }
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'neutral',
  size = 'md',
  icon,
  children,
  className = '',
  dot = false
}) => {
  const showIcon = icon === 'auto' ? variantIcons[variant] : icon
  const { container, text } = sizeStyles[size]

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${variantStyles[variant]} ${container} ${text} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {showIcon && <span className="flex-shrink-0">{showIcon}</span>}
      {children}
    </span>
  )
}

// Specialized badge variants for common use cases
export const StatusBadge: React.FC<{ status: 'active' | 'inactive' | 'pending', size?: BadgeSize }> = ({ 
  status, 
  size = 'md' 
}) => {
  const variants = {
    active: { variant: 'success' as BadgeVariant, label: 'Active' },
    inactive: { variant: 'neutral' as BadgeVariant, label: 'Inactive' },
    pending: { variant: 'warning' as BadgeVariant, label: 'Pending' }
  }
  
  const { variant, label } = variants[status]
  
  return (
    <Badge variant={variant} icon="auto" size={size}>
      {label}
    </Badge>
  )
}

export const AuditStatusBadge: React.FC<{ 
  status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected', 
  size?: BadgeSize 
}> = ({ status, size = 'md' }) => {
  const variants: Record<string, { variant: BadgeVariant, label: string, dot?: boolean }> = {
    draft: { variant: 'neutral', label: 'Draft' },
    in_progress: { variant: 'info', label: 'In Progress', dot: true },
    submitted: { variant: 'warning', label: 'Submitted' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'danger', label: 'Rejected' }
  }
  
  const { variant, label, dot } = variants[status]
  
  return (
    <Badge variant={variant} icon="auto" size={size} dot={dot}>
      {label}
    </Badge>
  )
}

export const CountBadge: React.FC<{ count: number, variant?: BadgeVariant, size?: BadgeSize }> = ({ 
  count, 
  variant = 'primary',
  size = 'sm'
}) => {
  if (count === 0) return null
  
  const displayCount = count > 99 ? '99+' : count.toString()
  
  return (
    <Badge variant={variant} size={size} className="tabular-nums">
      {displayCount}
    </Badge>
  )
}

export const RoleBadge: React.FC<{ 
  role: 'admin' | 'branch_manager' | 'auditor' | 'super_admin',
  size?: BadgeSize 
}> = ({ role, size = 'md' }) => {
  const variants = {
    admin: { variant: 'primary' as BadgeVariant, label: 'Admin' },
    super_admin: { variant: 'danger' as BadgeVariant, label: 'Super Admin' },
    branch_manager: { variant: 'info' as BadgeVariant, label: 'Branch Manager' },
    auditor: { variant: 'success' as BadgeVariant, label: 'Auditor' }
  }
  
  const { variant, label } = variants[role]
  
  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  )
}
