import React from 'react'
import { Branch, AuditStatus } from '@trakr/shared'
import StatusBadge from '@/components/StatusBadge'

type Props = {
  branch: Branch
  ownerName: string
  badge: 'manual' | 'zone' | 'unassigned'
  selected?: boolean
  auditStatus?: AuditStatus
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

const BranchCard: React.FC<Props> = ({
  branch,
  ownerName,
  badge,
  selected = false,
  auditStatus,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onKeyDown,
}) => {
  const badgeNode = badge === 'manual'
    ? <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700">Manual</span>
    : badge === 'zone'
      ? <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700">Via Zone</span>
      : <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700">Unassigned</span>

  const showStatus = typeof auditStatus !== 'undefined'

  return (
    <div
      className={`mb-2 p-2 rounded border bg-white shadow-sm cursor-move select-none ${selected ? 'ring-2 ring-primary-300' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      tabIndex={0}
      role="button"
      aria-grabbed={selected}
      aria-label={`${branch.name}. ${ownerName}. Press Enter to pick up, arrows to choose a column, Enter to drop.`}
      onKeyDown={onKeyDown}
    >
      <div className="text-sm text-gray-900">{branch.name}</div>
      <div className="text-xs text-gray-500">{branch.address || '—'}</div>
      <div className="mt-1 flex gap-2 flex-wrap">
        {showStatus && auditStatus !== undefined && (
          <StatusBadge status={auditStatus} />
        )}
        {badgeNode}
      </div>
    </div>
  )
}

export default BranchCard
