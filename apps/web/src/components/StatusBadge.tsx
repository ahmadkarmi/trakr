import React from 'react'
import { AuditStatus } from '@trakr/shared'
import { CheckCircleIcon, CheckBadgeIcon, XCircleIcon, PaperAirplaneIcon, PencilSquareIcon, PlayCircleIcon } from '@heroicons/react/20/solid'

type Props = {
  status: AuditStatus
  className?: string
}

const StatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  const cfg = React.useMemo(() => {
    switch (status) {
      case AuditStatus.DRAFT:
        return { label: 'Draft', cls: 'bg-gray-100 text-gray-700', icon: <PencilSquareIcon className="h-3.5 w-3.5" aria-hidden /> }
      case AuditStatus.IN_PROGRESS:
        return { label: 'In Progress', cls: 'bg-primary-50 text-primary-700', icon: <PlayCircleIcon className="h-3.5 w-3.5" aria-hidden /> }
      case AuditStatus.REJECTED:
        return { label: 'Rejected', cls: 'bg-danger-50 text-danger-700', icon: <XCircleIcon className="h-3.5 w-3.5" aria-hidden /> }
      case AuditStatus.SUBMITTED:
        return { label: 'Submitted', cls: 'bg-warning-50 text-warning-700', icon: <PaperAirplaneIcon className="h-3.5 w-3.5" aria-hidden /> }
      case AuditStatus.APPROVED:
        return { label: 'Approved', cls: 'bg-success-50 text-success-700', icon: <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden /> }
      case AuditStatus.COMPLETED:
        return { label: 'Completed', cls: 'bg-primary-50 text-primary-700', icon: <CheckBadgeIcon className="h-3.5 w-3.5" aria-hidden /> }
      default:
        return { label: String(status), cls: 'bg-gray-100 text-gray-700', icon: null as React.ReactNode }
    }
  }, [status])

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] ${cfg.cls} ${className}`}
      aria-label={`Audit status: ${cfg.label}`}>
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  )
}

export default StatusBadge
