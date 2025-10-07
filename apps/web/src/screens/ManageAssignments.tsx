import React from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Branch, UserRole, AuditorAssignment, AuditStatus } from '@trakr/shared'
import ConfirmationModal from '../components/ConfirmationModal'
import ZoneAssignPanel from '../components/assignments/ZoneAssignPanel'
import AuditorColumn from '../components/assignments/AuditorColumn'
import UnassignedColumn from '../components/assignments/UnassignedColumn'
import { useToast } from '../hooks/useToast'
import { useApplyZoneWithSafeReset, useAssignBranchToAuditor, useClearManualAssignment } from '../services/assignments'
import { QK } from '../utils/queryKeys'
import { api } from '../utils/api'
import { useAssignmentBoard } from '@/hooks/assignments/useAssignmentBoard'
import { useInvalidate } from '@/utils/query'
import { apiErrorMessage } from '../utils/apiError'
import { useUsers } from '@/hooks/data/useUsers'
import { useBranches } from '@/hooks/data/useBranches'
import { useZones } from '@/hooks/data/useZones'
import { useAudits } from '@/hooks/data/useAudits'
import { useAssignments } from '@/hooks/data/useAssignments'
import InfoBadge from '@/components/InfoBadge'
import { useOrganization } from '../contexts/OrganizationContext'

const ManageAssignments: React.FC = () => {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { invalidateAssignments, invalidateAudits } = useInvalidate()
  const applyZoneWithReset = useApplyZoneWithSafeReset()
  const assignBranchMut = useAssignBranchToAuditor()
  const clearManualMut = useClearManualAssignment()
  const { effectiveOrgId } = useOrganization()
  const { data: branches = [] } = useBranches(effectiveOrgId)
  const { data: zones = [] } = useZones(effectiveOrgId)
  const { data: users = [] } = useUsers()
  const { data: assignments = [] } = useAssignments()
  const { data: audits = [] } = useAudits('assignments')

  const auditors = React.useMemo(() => users.filter(u => u.role === UserRole.AUDITOR), [users])
  const auditStatusByBranchId = React.useMemo<Record<string, AuditStatus | undefined>>(() => {
    // Choose the most relevant status per branch.
    // Prefer active open statuses: IN_PROGRESS > DRAFT > REJECTED (by latest updatedAt within same status)
    // If none open, fallback to latest closed/locked status by updatedAt.
    const byBranch: Record<string, AuditStatus | undefined> = {}
    const groups: Record<string, AuditStatus[]> = {}
    const latestTs: Record<string, number> = {}
    const latestByStatusTs: Record<string, Record<AuditStatus, number>> = {}

    audits.forEach(a => {
      if (a.isArchived) return
      const bid = a.branchId
      groups[bid] = groups[bid] || []
      groups[bid].push(a.status)
      const ts = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      latestTs[bid] = Math.max(latestTs[bid] || 0, ts)
      if (!latestByStatusTs[bid]) {
        latestByStatusTs[bid] = {} as Record<AuditStatus, number>
      }
      latestByStatusTs[bid][a.status] = Math.max(latestByStatusTs[bid][a.status] || 0, ts)
    })

    const openPriority: AuditStatus[] = [AuditStatus.IN_PROGRESS, AuditStatus.DRAFT, AuditStatus.REJECTED]
    Object.keys(groups).forEach(bid => {
      // If any open status exists, pick the highest-priority one (by latest timestamp within that status)
      for (const s of openPriority) {
        const sTs = latestByStatusTs[bid]?.[s]
        if (sTs) { byBranch[bid] = s; return }
      }
      // Otherwise pick the status of the latest updated audit for that branch
      let chosen: AuditStatus | undefined
      let bestTs = -1
      audits.forEach(a => {
        if (a.isArchived || a.branchId !== bid) return
        const ts = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        if (ts >= bestTs) { bestTs = ts; chosen = a.status }
      })
      byBranch[bid] = chosen
    })
    return byBranch
  }, [audits])
  const byUser: Record<string, AuditorAssignment> = React.useMemo(() => {
    const map: Record<string, AuditorAssignment> = {}
    assignments.forEach(a => { map[a.userId] = a })
    return map
  }, [assignments])

  // No local shadow copy needed; we update server and re-fetch live

  // Kanban board data (manual map first so other logic can reference it)
  const manualAssignedByBranch = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    assignments.forEach(a => {
      (a.branchIds || []).forEach((bid) => { if (bid) map[bid] = a.userId })
    })
    return map
  }, [assignments])

  // Quick Zone Assignment
  const [zoneAssignUserId, setZoneAssignUserId] = React.useState<string>('')
  const [zoneAssignZoneId, setZoneAssignZoneId] = React.useState<string>('')
  const assignZoneMutation = useMutation({
    mutationFn: async () => {
      if (!zoneAssignUserId || !zoneAssignZoneId) return
      const current = byUser[zoneAssignUserId] || { userId: zoneAssignUserId, branchIds: [], zoneIds: [] }
      if (!current.zoneIds.includes(zoneAssignZoneId)) {
        const next = { branchIds: current.branchIds, zoneIds: [...current.zoneIds, zoneAssignZoneId] }
        await api.setAuditorAssignment(zoneAssignUserId, next)
      }
    },
    onSuccess: () => {
      invalidateAssignments()
      setZoneAssignZoneId('')
    },
    onError: (e) => {
      showToast({ message: apiErrorMessage(e, 'Failed to update zone assignment'), variant: 'error' })
    }
  })

  // Manual reassignment confirmation (for DnD / keyboard)
  const [manualConfirm, setManualConfirm] = React.useState<{ open: boolean; branchId: string | null; targetUserId: string | null; via: 'mouse' | 'keyboard' | null }>({ open: false, branchId: null, targetUserId: null, via: null })
  const confirmManualReassign = async () => {
    if (!manualConfirm.branchId || !manualConfirm.targetUserId) { setManualConfirm({ open: false, branchId: null, targetUserId: null, via: null }); return }
    try {
      // Snapshot open audit assignees for this branch before changing
      const prevAudits: Record<string, string> = {}
      audits.forEach(a => {
        if (a.branchId === manualConfirm.branchId && !a.isArchived && (a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS || a.status === AuditStatus.REJECTED)) {
          prevAudits[a.id] = a.assignedTo
        }
      })
      // Also snapshot assignments if not already captured (preserve last snapshot wins)
      const prevAssignments: AuditorAssignment[] = assignments.map(a => ({ userId: a.userId, branchIds: [...(a.branchIds || [])], zoneIds: [...(a.zoneIds || [])] }))
      setUndoData({ prevAssignments, prevAudits })
      await assignBranchToAuditor(manualConfirm.targetUserId, manualConfirm.branchId)
      // Carry over progress: update open audits to the new auditor
      await api.reassignOpenAuditsForBranch(manualConfirm.branchId, manualConfirm.targetUserId)
      invalidateAudits('assignments')
      const name = auditors.find(a => a.id === manualConfirm.targetUserId)?.name || 'auditor'
      board.setLiveMsg(`Assigned branch to ${name}.`)
    } finally {
      setManualConfirm({ open: false, branchId: null, targetUserId: null, via: null })
      if (manualConfirm.via === 'mouse') board.onDragEnd()
      board.clearSelection()
    }
  }

  // Confirmation modal state for zone assignment overrides
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmBranches, setConfirmBranches] = React.useState<{ reset: Branch[]; locked: Branch[] }>({ reset: [], locked: [] })
  const [confirming, setConfirming] = React.useState(false)
  const targetAuditor = React.useMemo(() => auditors.find(a => a.id === zoneAssignUserId) || null, [auditors, zoneAssignUserId])
  const targetZone = React.useMemo(() => zones.find(z => z.id === zoneAssignZoneId) || null, [zones, zoneAssignZoneId])

  const branchHasLockedAudit = React.useCallback((branchId: string) => {
    // Zone apply: consider any non-archived, non-draft audit as locked to avoid disrupting ongoing or decided work
    return audits.some(a => a.branchId === branchId && !a.isArchived && (
      a.status === AuditStatus.IN_PROGRESS ||
      a.status === AuditStatus.REJECTED ||
      a.status === AuditStatus.SUBMITTED ||
      a.status === AuditStatus.APPROVED ||
      a.status === AuditStatus.COMPLETED
    ))
  }, [audits])

  // DnD rule: block only when pending approval or approved
  const branchHasDnDLockedAudit = React.useCallback((branchId: string) => {
    return audits.some(a => a.branchId === branchId && !a.isArchived && (
      a.status === AuditStatus.SUBMITTED ||
      a.status === AuditStatus.APPROVED
    ))
  }, [audits])

  const branchHasReassignableOpenAudit = React.useCallback((branchId: string) => {
    // Allow reassignment (with confirmation) for Draft, In Progress, or Rejected audits
    return audits.some(a => a.branchId === branchId && !a.isArchived && (
      a.status === AuditStatus.DRAFT ||
      a.status === AuditStatus.IN_PROGRESS ||
      a.status === AuditStatus.REJECTED
    ))
  }, [audits])

  const handleAssignZoneClick = React.useCallback(() => {
    if (!zoneAssignUserId || !zoneAssignZoneId) return
    const z = zones.find(zz => zz.id === zoneAssignZoneId)
    if (!z) { assignZoneMutation.mutate(); return }
    const zoneBranchIds = z.branchIds || []
    // Identify manual overrides within this zone
    const manualInZone = zoneBranchIds.filter(bid => !!manualAssignedByBranch[bid])
    // Build lists of branches to reset vs locked
    const reset: Branch[] = []
    const locked: Branch[] = []
    manualInZone.forEach((bid) => {
      const b = branches.find(bb => bb.id === bid)
      if (!b) return
      if (branchHasLockedAudit(bid)) locked.push(b)
      else reset.push(b)
    })
    setConfirmBranches({ reset, locked })
    setConfirmOpen(true)
  }, [zoneAssignUserId, zoneAssignZoneId, zones, branches, manualAssignedByBranch, assignZoneMutation, branchHasLockedAudit])

  // Optimistic cache helper (placed before any usage)
  const applyLocalAssignments = React.useCallback((updater: (prev: AuditorAssignment[]) => AuditorAssignment[]) => {
    qc.setQueryData<AuditorAssignment[]>(QK.ASSIGNMENTS, (prev) => {
      const base = prev ?? assignments
      return updater(base)
    })
  }, [qc, assignments])

  // Undo snapshot state (for toast action)
  const [undoData, setUndoData] = React.useState<{ prevAssignments: AuditorAssignment[]; prevAudits: Record<string, string> } | null>(null)

  const confirmZoneAssign = async () => {
    if (!targetAuditor || !targetZone) { setConfirmOpen(false); return }
    setConfirming(true)
    // Snapshot assignments for undo
    const prevAssignments: AuditorAssignment[] = assignments.map(a => ({ userId: a.userId, branchIds: [...(a.branchIds || [])], zoneIds: [...(a.zoneIds || [])] }))
    // Fetch latest audits to avoid relying on possibly stale query cache
    const latestAudits = await api.getAudits()
    // Snapshot audit assignees for relevant branches (open audits only)
    // Include: branches to reset (manual overrides) + ALL zone branches (since we redistribute Drafts zone-wide)
    const prevAudits: Record<string, string> = {}
    const zoneBranchIds = new Set<string>([...(targetZone.branchIds || [])])
    confirmBranches.reset.forEach(b => zoneBranchIds.add(b.id))
    zoneBranchIds.forEach((bid) => {
      latestAudits.forEach(a => {
        if (a.branchId === bid && !a.isArchived && (a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS || a.status === AuditStatus.REJECTED)) {
          prevAudits[a.id] = a.assignedTo
        }
      })
    })
    setUndoData({ prevAssignments, prevAudits })
    try {
      await applyZoneWithReset.mutateAsync({
        targetUserId: targetAuditor.id,
        zoneId: targetZone.id,
        resetBranchIds: confirmBranches.reset.map(b => b.id),
      })
      // Zone distribution: redistribute NOT-STARTED (Draft) audits across ALL branches in the selected zone
      const zoneBranchIds = (targetZone.branchIds || [])
      if (zoneBranchIds.length > 0) {
        await api.reassignUnstartedAuditsForBranches(zoneBranchIds, targetAuditor.id)
        invalidateAudits('assignments')
      }
      setConfirmOpen(false)
      setZoneAssignZoneId('')
      showToast({ message: 'Zone assigned. Manual overrides updated.', actionLabel: 'Undo', onAction: handleUndoAssignments, variant: 'success' })
    } catch (e) {
      showToast({ message: apiErrorMessage(e, 'Failed to assign zone. Changes were not applied.'), variant: 'error' })
    } finally {
      setConfirming(false)
    }
  }

  const handleUndoAssignments = React.useCallback(async () => {
    if (!undoData) return
    const prev = undoData.prevAssignments
    // Optimistic revert
    applyLocalAssignments(() => prev.map(p => ({ userId: p.userId, branchIds: [...(p.branchIds || [])], zoneIds: [...(p.zoneIds || [])] })))
    try {
      // Union of user IDs from current and previous
      const currentIds = new Set((assignments || []).map(a => a.userId))
      const prevIds = new Set(prev.map(a => a.userId))
      const unionIds = new Set<string>([...Array.from(currentIds), ...Array.from(prevIds)])
      await Promise.all(Array.from(unionIds).map(async (uid) => {
        const p = prev.find(a => a.userId === uid)
        const payload = p ? { branchIds: p.branchIds || [], zoneIds: p.zoneIds || [] } : { branchIds: [], zoneIds: [] }
        await api.setAuditorAssignment(uid, payload)
      }))
      // Restore audit assignees for open audits
      const prevAudits = undoData.prevAudits || {}
      await Promise.all(Object.entries(prevAudits).map(([auditId, userId]) => api.setAuditAssignedTo(auditId, userId)))
      invalidateAudits('assignments')
      invalidateAssignments()
      setUndoData(null)
      showToast({ message: 'Assignments restored.', variant: 'success' })
    } catch (e) {
      showToast({ message: apiErrorMessage(e, 'Failed to restore assignments'), variant: 'error' })
    }
  }, [undoData, assignments, applyLocalAssignments, invalidateAudits, invalidateAssignments, showToast])

  const effectiveBranchesByUser = React.useMemo<Record<string, Branch[]>>(() => {
    const result: Record<string, Branch[]> = {}
    auditors.forEach(aud => { result[aud.id] = [] })
    // 1) Manual assignments take precedence
    Object.entries(manualAssignedByBranch).forEach(([bid, uid]) => {
      const b = branches.find(bb => bb.id === bid)
      if (b && result[uid]) {
        if (!result[uid].some(x => x.id === b.id)) result[uid].push(b)
      }
    })
    // 2) Add zone-derived branches where not manually assigned
    auditors.forEach(aud => {
      const a = byUser[aud.id]
      if (!a) return
      ;(a.zoneIds || []).forEach((zid) => {
        const z = zones.find(zz => zz.id === zid)
        z?.branchIds.forEach((bid) => {
          if (!manualAssignedByBranch[bid]) {
            const b = branches.find(bb => bb.id === bid)
            if (b && !result[aud.id].some(x => x.id === b.id)) result[aud.id].push(b)
          }
        })
      })
    })
    // Stable sort by name
    Object.keys(result).forEach(uid => { result[uid] = result[uid].slice().sort((a, b) => a.name.localeCompare(b.name)) })
    return result
  }, [auditors, byUser, branches, zones, manualAssignedByBranch])

  // Core helpers used by all drop handlers
  const assignBranchToAuditor = React.useCallback(async (auditorId: string, branchId: string) => {
    await assignBranchMut.mutateAsync({ targetUserId: auditorId, branchId })
  }, [assignBranchMut])

  const clearManualAssignment = React.useCallback(async (branchId: string) => {
    await clearManualMut.mutateAsync({ branchId })
  }, [clearManualMut])
  // Assignment board interactions

  // Backlog of unassigned branches (not in any effective list)
  const allEffectiveAssignedIds = React.useMemo(() => {
    const set = new Set<string>()
    Object.values(effectiveBranchesByUser).forEach(arr => arr.forEach(b => set.add(b.id)))
    return set
  }, [effectiveBranchesByUser])
  const backlogBranches = React.useMemo(() => branches.filter(b => !allEffectiveAssignedIds.has(b.id)), [branches, allEffectiveAssignedIds])

  // Accessibility: keyboard DnD fallback and announcements
  const getEffectiveOwnerId = React.useCallback((branchId: string): string | 'unassigned' => {
    const manualUid = manualAssignedByBranch[branchId]
    if (manualUid) return manualUid
    const ownerAud = auditors.find(a => (effectiveBranchesByUser[a.id] || []).some(b => b.id === branchId))
    return ownerAud ? ownerAud.id : 'unassigned'
  }, [manualAssignedByBranch, auditors, effectiveBranchesByUser])
  const board = useAssignmentBoard({
    auditors,
    branches,
    manualAssignedByBranch,
    effectiveBranchesByUser,
    getEffectiveOwnerId,
    onAssignBranch: assignBranchToAuditor,
    onClearManual: clearManualAssignment,
    showToast,
    branchHasLockedAudit: branchHasDnDLockedAudit,
    branchHasReassignableOpenAudit,
    requestManualConfirm: (branchId, targetUserId, via) => setManualConfirm({ open: true, branchId, targetUserId, via }),
  })

  return (
    <DashboardLayout title="Assign Auditors">
      <div className="space-y-6">
        <ZoneAssignPanel
          auditors={auditors}
          zones={zones}
          userId={zoneAssignUserId}
          zoneId={zoneAssignZoneId}
          onChangeUser={setZoneAssignUserId}
          onChangeZone={setZoneAssignZoneId}
          onAssign={handleAssignZoneClick}
          disabled={!zoneAssignUserId || !zoneAssignZoneId}
          pending={assignZoneMutation.isPending}
          confirming={confirming}
        />

        <ConfirmationModal
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmZoneAssign}
          title="Confirm zone assignment"
          loading={confirming}
          confirmLabel={confirming ? 'Applying…' : 'Confirm'}
        >
          <p>
            You are assigning zone <span className="font-medium">{targetZone?.name}</span> to auditor <span className="font-medium">{targetAuditor?.name}</span>.
          </p>
          {confirmBranches.reset.length === 0 && confirmBranches.locked.length === 0 ? (
            <p>No manual overrides were detected in this zone. Proceeding will add the zone to the auditor. Do you want to continue?</p>
          ) : (
            <>
              <p>Proceeding will:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Reassign <span className="font-medium">{confirmBranches.reset.length}</span> branch(es) to <span className="font-medium">{targetAuditor?.name}</span>. Only not‑started (Draft) audits will be redistributed; in‑progress or rejected work remains with the current auditor.</li>
                {confirmBranches.locked.length > 0 && (
                  <li>Skip <span className="font-medium">{confirmBranches.locked.length}</span> branch(es) with in‑progress, rejected, submitted (awaiting approval), approved, or completed audits.</li>
                )}
              </ul>
              <p className="text-sm text-gray-600 mt-2">On zone apply, only not‑started (Draft) audits move to the selected auditor. In‑progress or rejected audits remain assigned so ongoing work isn’t disrupted.</p>
              {confirmBranches.reset.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-600 mb-1">Will be reassigned:</div>
                  <div className="flex flex-wrap gap-2">
                    {confirmBranches.reset.map(b => (
                      <div key={b.id} className="inline-flex items-center gap-1.5">
                        <InfoBadge label={b.name} tone="gray" size="xs" />
                        <span className="text-[10px] text-gray-600">
                          from {auditors.find(a => a.id === manualAssignedByBranch[b.id])?.name || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {confirmBranches.locked.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-600 mb-1">Skipped (in‑progress/rejected/submitted/approved/completed):</div>
                  <div className="flex flex-wrap gap-2">
                    {confirmBranches.locked.map(b => (
                      <InfoBadge key={b.id} label={b.name} tone="gray" size="xs" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </ConfirmationModal>

        {/* Manual reassignment confirmation */}
        <ConfirmationModal
          open={manualConfirm.open}
          onCancel={() => setManualConfirm({ open: false, branchId: null, targetUserId: null, via: null })}
          onConfirm={confirmManualReassign}
          title="Confirm reassignment"
        >
          <p>
            You are about to reassign <span className="font-medium">{branches.find(b => b.id === manualConfirm.branchId)?.name || 'this branch'}</span>
            {manualConfirm.targetUserId ? <> to <span className="font-medium">{auditors.find(a => a.id === manualConfirm.targetUserId)?.name}</span></> : null}.
          </p>
          <p className="mt-2">This branch has an ongoing draft/in‑progress/rejected audit. Reassigning will carry the existing progress to the new auditor so they can continue the work. Are you sure you want to proceed?</p>
        </ConfirmationModal>

        {/* Kanban Board for Manual Distribution */}
        <div className="card p-6">
          {/* Screen reader announcements */}
          <div aria-live="polite" role="status" className="sr-only">{board.liveMsg}</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Manual Distribution (Drag branches between auditors)</h2>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
            onDragOver={board.onDragOver}
            onDrop={board.onGridDrop}
          >
            {/* Unassigned backlog */}
            <UnassignedColumn
              branches={backlogBranches}
              dragging={board.dragging}
              isHovering={board.hoverTarget==='unassigned'}
              selectedBranchId={board.selectedBranchId}
              auditStatusByBranchId={auditStatusByBranchId}
              onDragEnter={() => board.dragging && board.setHoverTarget('unassigned')}
              onDragLeave={(e) => { if (board.dragging && (e.currentTarget === e.target)) board.setHoverTarget(null) }}
              onDragOver={board.onDragOver}
              onDrop={board.onDropToUnassigned}
              onDragStart={board.onDragStart}
              onDragEnd={board.onDragEnd}
              onDropOnCard={board.onDropToUnassigned}
              onCardKeyDown={board.onCardKeyDown}
            />
            {auditors.map((aud) => (
              <AuditorColumn
                key={aud.id}
                auditor={aud}
                branches={effectiveBranchesByUser[aud.id] || []}
                manualAssignedByBranch={manualAssignedByBranch}
                selectedBranchId={board.selectedBranchId}
                dragging={board.dragging}
                isHovering={board.hoverTarget===aud.id}
                auditStatusByBranchId={auditStatusByBranchId}
                onDragEnter={() => board.dragging && board.setHoverTarget(aud.id)}
                onDragLeave={(e) => { if (board.dragging && (e.currentTarget === e.target)) board.setHoverTarget(null) }}
                onDragOver={board.onDragOver}
                onDrop={board.onDropToAuditor(aud.id)}
                onDragStart={board.onDragStart}
                onDragEnd={board.onDragEnd}
                onDropOnCard={board.onDropToAuditor(aud.id)}
                onCardKeyDown={board.onCardKeyDown}
              />
            ))}
          </div>
        </div>
      </div>

    </DashboardLayout>
  )
}

export default ManageAssignments
