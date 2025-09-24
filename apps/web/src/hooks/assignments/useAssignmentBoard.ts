import React from 'react'
import type { Branch, User } from '@trakr/shared'
import type { ToastOptions } from '@/components/ToastProvider'

export type HoverTarget = string | 'unassigned' | null

export function useAssignmentBoard(params: {
  auditors: User[]
  branches: Branch[]
  manualAssignedByBranch: Record<string, string>
  effectiveBranchesByUser: Record<string, Branch[]>
  getEffectiveOwnerId: (branchId: string) => string | 'unassigned'
  onAssignBranch: (auditorId: string, branchId: string) => Promise<void>
  onClearManual: (branchId: string) => Promise<void>
  showToast: (opts: ToastOptions) => void
  branchHasLockedAudit: (branchId: string) => boolean
  branchHasReassignableOpenAudit: (branchId: string) => boolean
  requestManualConfirm: (branchId: string, targetUserId: string, via: 'mouse' | 'keyboard') => void
}) {
  const {
    auditors,
    branches,
    manualAssignedByBranch,
    getEffectiveOwnerId,
    onAssignBranch,
    onClearManual,
    showToast,
    branchHasLockedAudit,
    branchHasReassignableOpenAudit,
    requestManualConfirm,
  } = params

  const [dragging, setDragging] = React.useState(false)
  const [hoverTarget, setHoverTarget] = React.useState<HoverTarget>(null)
  const dragBranchIdRef = React.useRef<string | null>(null)

  const onDragStart = (branchId: string) => (e: React.DragEvent) => {
    dragBranchIdRef.current = branchId
    try { e.dataTransfer.setData('text/plain', branchId) } catch { /* noop */ }
    e.dataTransfer.effectAllowed = 'move'
    setDragging(true)
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  const onDragEnd = () => {
    dragBranchIdRef.current = null
    setDragging(false)
    setHoverTarget(null)
  }

  const onDropToAuditor = (auditorId: string) => async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    let dataBranchId = ''
    try { dataBranchId = e.dataTransfer.getData('text/plain') || '' } catch { /* noop */ }
    const branchId = dragBranchIdRef.current || dataBranchId
    dragBranchIdRef.current = null
    if (!branchId) return
    const currentOwner = getEffectiveOwnerId(branchId)
    if (currentOwner === auditorId) {
      setDragging(false); setHoverTarget(null)
      showToast({ message: 'No changes — branch already in this column.', variant: 'info' })
      return
    }
    if (branchHasLockedAudit(branchId)) {
      setDragging(false); setHoverTarget(null)
      showToast({ message: 'Cannot reassign — branch has an audit awaiting approval or already approved.', variant: 'info' })
      return
    }
    if (branchHasReassignableOpenAudit(branchId)) {
      requestManualConfirm(branchId, auditorId, 'mouse')
      return
    }
    await onAssignBranch(auditorId, branchId)
    setDragging(false); setHoverTarget(null)
  }

  const onDropToUnassigned = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    let dataBranchId = ''
    try { dataBranchId = e.dataTransfer.getData('text/plain') || '' } catch { /* noop */ }
    const branchId = dragBranchIdRef.current || dataBranchId
    dragBranchIdRef.current = null
    if (!branchId) return
    const currentOwner = getEffectiveOwnerId(branchId)
    const manualOwner = manualAssignedByBranch[branchId]
    if (!manualOwner) {
      showToast({ message: currentOwner === 'unassigned' ? 'No changes — branch is already unassigned.' : 'Branch is assigned via zone. Remove it from the zone to unassign.', variant: 'info' })
      setDragging(false); setHoverTarget(null)
      return
    }
    if (branchHasLockedAudit(branchId)) {
      showToast({ message: 'Cannot unassign — branch has an audit awaiting approval or already approved.', variant: 'info' })
      setDragging(false); setHoverTarget(null)
      return
    }
    await onClearManual(branchId)
    setDragging(false); setHoverTarget(null)
  }

  const onGridDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    let dataBranchId = ''
    try { dataBranchId = e.dataTransfer.getData('text/plain') || '' } catch { /* noop */ }
    const branchId = dragBranchIdRef.current || dataBranchId
    dragBranchIdRef.current = null
    if (!branchId || !hoverTarget) return
    const currentOwner = getEffectiveOwnerId(branchId)
    if (hoverTarget === currentOwner) {
      setDragging(false); setHoverTarget(null)
      showToast({ message: 'No changes — branch already in this column.', variant: 'info' })
      return
    }
    if (hoverTarget === 'unassigned') {
      const manualOwner = manualAssignedByBranch[branchId]
      if (!manualOwner) {
        showToast({ message: currentOwner === 'unassigned' ? 'No changes — branch is already unassigned.' : 'Branch is assigned via zone. Remove it from the zone to unassign.', variant: 'info' })
        setDragging(false); setHoverTarget(null)
        return
      }
      await onClearManual(branchId)
    } else {
      await onAssignBranch(hoverTarget, branchId)
    }
    setDragging(false); setHoverTarget(null)
  }

  // Keyboard DnD
  const [selectedBranchId, setSelectedBranchId] = React.useState<string | null>(null)
  const [kbdTarget, setKbdTarget] = React.useState<string | 'unassigned' | null>(null)
  const [liveMsg, setLiveMsg] = React.useState('')
  const columnOrder = React.useMemo<(string | 'unassigned')[]>(() => ['unassigned', ...auditors.map(a => a.id)], [auditors])

  const startKeyboardPick = (branchId: string) => {
    setSelectedBranchId(branchId)
    const current = getEffectiveOwnerId(branchId)
    setKbdTarget(current)
    setHoverTarget(current)
    setLiveMsg(`Selected ${branches.find(b => b.id === branchId)?.name || 'branch'}. Use left and right arrow keys to choose a column, then press Enter to drop. Press Escape to cancel.`)
  }

  const handleKeyboardDrop = async () => {
    if (!selectedBranchId || !kbdTarget) return
    const current = getEffectiveOwnerId(selectedBranchId)
    if (kbdTarget === current) {
      setSelectedBranchId(null); setHoverTarget(null); setKbdTarget(null)
      setLiveMsg('No changes. Branch already in the selected column.')
      showToast({ message: 'No changes — branch already in this column.', variant: 'info' })
      return
    }
    try {
      if (kbdTarget === 'unassigned') {
        const manualOwner = manualAssignedByBranch[selectedBranchId]
        if (!manualOwner) {
          setLiveMsg(current === 'unassigned' ? 'No changes. Branch is already unassigned.' : 'Branch is assigned via zone. Remove it from the zone to unassign.')
          showToast({ message: current === 'unassigned' ? 'No changes — branch is already unassigned.' : 'Branch is assigned via zone. Remove it from the zone to unassign.', variant: 'info' })
          return
        }
        if (branchHasLockedAudit(selectedBranchId)) {
          setLiveMsg('Cannot unassign. An audit for this branch is awaiting approval or already approved.')
          showToast({ message: 'Cannot unassign — branch has an audit awaiting approval or already approved.', variant: 'info' })
          return
        }
        await onClearManual(selectedBranchId)
        setLiveMsg('Cleared manual assignment. Branch moved to Unassigned.')
      } else {
        if (branchHasLockedAudit(selectedBranchId)) {
          setLiveMsg('Cannot reassign. An audit for this branch is awaiting approval or already approved.')
          showToast({ message: 'Cannot reassign — branch has an audit awaiting approval or already approved.', variant: 'info' })
          return
        }
        if (branchHasReassignableOpenAudit(selectedBranchId)) {
          requestManualConfirm(selectedBranchId, kbdTarget, 'keyboard')
          return
        }
        await onAssignBranch(kbdTarget, selectedBranchId)
        const name = auditors.find(a => a.id === kbdTarget)?.name || 'auditor'
        setLiveMsg(`Assigned branch to ${name}.`)
      }
    } finally {
      setSelectedBranchId(null); setHoverTarget(null); setKbdTarget(null)
    }
  }

  const onCardKeyDown = (branchId: string) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (selectedBranchId === branchId) {
        void handleKeyboardDrop()
      } else {
        startKeyboardPick(branchId)
      }
      return
    }
    if (selectedBranchId !== branchId) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setSelectedBranchId(null); setHoverTarget(null); setKbdTarget(null)
      setLiveMsg('Cancelled selection.')
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const currentIndex = columnOrder.findIndex(id => id === (kbdTarget ?? getEffectiveOwnerId(branchId)))
      const nextIndex = e.key === 'ArrowLeft' ? Math.max(0, currentIndex - 1) : Math.min(columnOrder.length - 1, currentIndex + 1)
      const nextTarget = columnOrder[nextIndex]
      setKbdTarget(nextTarget)
      setHoverTarget(nextTarget)
      const colName = nextTarget === 'unassigned' ? 'Unassigned' : (auditors.find(a => a.id === nextTarget)?.name || 'column')
      setLiveMsg(`Target column: ${colName}. Press Enter to drop.`)
    }
  }

  return {
    dragging,
    hoverTarget,
    selectedBranchId,
    liveMsg,
    setLiveMsg,
    setHoverTarget,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDropToAuditor,
    onDropToUnassigned,
    onGridDrop,
    onCardKeyDown,
    clearSelection: () => { setSelectedBranchId(null); setHoverTarget(null); setKbdTarget(null) },
  }
}
