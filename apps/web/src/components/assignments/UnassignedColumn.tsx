import React from 'react'
import { AuditStatus, Branch } from '@trakr/shared'
import BranchCard from './BranchCard'

type Props = {
  branches: Branch[]
  dragging: boolean
  isHovering: boolean
  selectedBranchId: string | null
  auditStatusByBranchId?: Record<string, AuditStatus | undefined>
  onDragEnter: () => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragStart: (branchId: string) => (e: React.DragEvent) => void
  onDragEnd: () => void
  onDropOnCard: (e: React.DragEvent) => void
  onCardKeyDown: (branchId: string) => (e: React.KeyboardEvent<HTMLDivElement>) => void
}

const UnassignedColumn: React.FC<Props> = ({
  branches,
  dragging,
  isHovering,
  selectedBranchId,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onDropOnCard,
  onCardKeyDown,
  auditStatusByBranchId,
}) => {
  return (
    <div
      className={`border rounded-md ${dragging && isHovering ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200'}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="region"
      aria-label="Column Unassigned"
    >
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
        <div className="font-medium text-gray-900 truncate">Unassigned</div>
        <div className="text-xs text-gray-500">{branches.length} branches</div>
      </div>
      <div className="p-3 min-h-[180px]">
        {branches.map((b) => (
          <BranchCard
            key={b.id}
            branch={b}
            ownerName="Unassigned"
            badge="unassigned"
            selected={selectedBranchId===b.id}
            auditStatus={auditStatusByBranchId?.[b.id]}
            onDragStart={onDragStart(b.id)}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDropOnCard}
            onKeyDown={onCardKeyDown(b.id)}
          />
        ))}
        {branches.length === 0 && <p className="text-xs text-gray-400">No unassigned branches</p>}
      </div>
    </div>
  )
}

export default UnassignedColumn
