import React from 'react'
import { AuditStatus, Branch, User } from '@trakr/shared'
import BranchCard from './BranchCard'

type Props = {
  auditor: User
  branches: Branch[]
  manualAssignedByBranch: Record<string, string>
  selectedBranchId: string | null
  dragging: boolean
  isHovering: boolean
  auditStatusByBranchId?: Record<string, AuditStatus | undefined>
  // Column drag/hover events
  onDragEnter: () => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  // Card events
  onDragStart: (branchId: string) => (e: React.DragEvent) => void
  onDragEnd: () => void
  onDropOnCard: (e: React.DragEvent) => void
  onCardKeyDown: (branchId: string) => (e: React.KeyboardEvent<HTMLDivElement>) => void
}

const AuditorColumn: React.FC<Props> = ({
  auditor,
  branches,
  manualAssignedByBranch,
  selectedBranchId,
  dragging,
  isHovering,
  auditStatusByBranchId,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onDropOnCard,
  onCardKeyDown,
}) => {
  return (
    <div
      className={`border rounded-md ${dragging && isHovering ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200'}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="region"
      aria-label={`Column ${auditor.name}`}
    >
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
        <div className="font-medium text-gray-900 truncate">{auditor.name}</div>
        <div className="text-xs text-gray-500">{branches.length} branches</div>
      </div>
      <div className="p-3 min-h-[180px]">
        {branches.map((b) => (
          <BranchCard
            key={b.id}
            branch={b}
            ownerName={auditor.name}
            badge={manualAssignedByBranch[b.id] === auditor.id ? 'manual' : 'zone'}
            selected={selectedBranchId===b.id}
            auditStatus={auditStatusByBranchId?.[b.id]}
            onDragStart={onDragStart(b.id)}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDropOnCard}
            onKeyDown={onCardKeyDown(b.id)}
          />
        ))}
        {branches.length === 0 && (
          <p className="text-xs text-gray-400">Drop branches here</p>
        )}
      </div>
    </div>
  )
}

export default AuditorColumn
