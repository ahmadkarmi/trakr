import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AuditorAssignment } from '@trakr/shared'
import { useToast } from '../hooks/useToast'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

export type ApplyZoneInput = {
  targetUserId: string
  zoneId: string
  resetBranchIds: string[]
}

function produceNextAssignments(prev: AuditorAssignment[] | undefined, input: ApplyZoneInput): AuditorAssignment[] {
  const base = prev ? prev.map(a => ({ userId: a.userId, branchIds: [...(a.branchIds || [])], zoneIds: [...(a.zoneIds || [])] })) : []
  const map = new Map<string, AuditorAssignment>(base.map(a => [a.userId, { ...a, branchIds: [...(a.branchIds || [])], zoneIds: [...(a.zoneIds || [])] }]))
  const ensure = (uid: string) => {
    if (!map.has(uid)) map.set(uid, { userId: uid, branchIds: [], zoneIds: [] })
    return map.get(uid)!
  }
  const target = ensure(input.targetUserId)
  // Ensure zone included
  if (!target.zoneIds.includes(input.zoneId)) target.zoneIds = [...target.zoneIds, input.zoneId]
  // Reassign branches to target and remove from others
  input.resetBranchIds.forEach((bid) => {
    if (!target.branchIds.includes(bid)) target.branchIds.push(bid)
    map.forEach((a, uid) => {
      if (uid === input.targetUserId) return
      if (a.branchIds?.includes(bid)) a.branchIds = a.branchIds.filter(x => x !== bid)
    })
  })
  return Array.from(map.values())
}

export function useApplyZoneWithSafeReset() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: async (input: ApplyZoneInput) => {
      // Server updates: ensure zone on target
      const current = await api.getAuditorAssignments()
      const map = new Map<string, AuditorAssignment>(current.map(a => [a.userId, a]))
      const target = map.get(input.targetUserId) || { userId: input.targetUserId, branchIds: [], zoneIds: [] }
      if (!target.zoneIds.includes(input.zoneId)) {
        await api.setAuditorAssignment(input.targetUserId, { branchIds: target.branchIds || [], zoneIds: [...(target.zoneIds || []), input.zoneId] })
      }
      // For each branch to reset: add to target and remove from others
      // Add to target (dedupe)
      const latestTarget = map.get(input.targetUserId) || target
      const finalTargetBranches = new Set([...(latestTarget.branchIds || [])])
      input.resetBranchIds.forEach(b => finalTargetBranches.add(b))
      await api.setAuditorAssignment(input.targetUserId, { branchIds: Array.from(finalTargetBranches), zoneIds: (latestTarget.zoneIds || []).includes(input.zoneId) ? (latestTarget.zoneIds || []) : [...(latestTarget.zoneIds || []), input.zoneId] })
      // Remove from other users
      const others = current.filter(a => a.userId !== input.targetUserId)
      await Promise.all(others.map(async (a) => {
        const nextBranches = (a.branchIds || []).filter(bid => !input.resetBranchIds.includes(bid))
        if (nextBranches.length !== (a.branchIds || []).length) {
          await api.setAuditorAssignment(a.userId, { branchIds: nextBranches, zoneIds: a.zoneIds || [] })
        }
      }))
      return { ok: true }
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: QK.ASSIGNMENTS })
      const previous = qc.getQueryData<AuditorAssignment[]>(QK.ASSIGNMENTS)
      qc.setQueryData<AuditorAssignment[]>(QK.ASSIGNMENTS, (prev) => produceNextAssignments(prev, input))
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(QK.ASSIGNMENTS, ctx.previous)
      // Global MutationCache will surface the error; provide an informational toast here.
      showToast({ message: 'Restored previous view after failed zone apply.', variant: 'info' })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.ASSIGNMENTS })
    },
  })
}

export type AssignBranchInput = { targetUserId: string; branchId: string }
function produceAssignBranchNext(prev: AuditorAssignment[] | undefined, input: AssignBranchInput): AuditorAssignment[] {
  const base = prev ? prev.map(a => ({ userId: a.userId, branchIds: [...(a.branchIds || [])], zoneIds: [...(a.zoneIds || [])] })) : []
  const map = new Map<string, AuditorAssignment>(base.map(a => [a.userId, { ...a, branchIds: [...(a.branchIds || [])], zoneIds: [...(a.zoneIds || [])] }]))
  const ensure = (uid: string) => {
    if (!map.has(uid)) map.set(uid, { userId: uid, branchIds: [], zoneIds: [] })
    return map.get(uid)!
  }
  const target = ensure(input.targetUserId)
  if (!target.branchIds.includes(input.branchId)) target.branchIds.push(input.branchId)
  map.forEach((a, uid) => {
    if (uid === input.targetUserId) return
    if (a.branchIds?.includes(input.branchId)) a.branchIds = a.branchIds.filter(b => b !== input.branchId)
  })
  return Array.from(map.values())
}

export function useAssignBranchToAuditor() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: async (input: AssignBranchInput) => {
      const current = await api.getAuditorAssignments()
      const map = new Map<string, AuditorAssignment>(current.map(a => [a.userId, a]))
      const target = map.get(input.targetUserId) || { userId: input.targetUserId, branchIds: [], zoneIds: [] }
      const nextTarget = { ...target, branchIds: Array.from(new Set([...(target.branchIds || []), input.branchId])) }
      await api.setAuditorAssignment(input.targetUserId, nextTarget)
      const others = current.filter(a => a.userId !== input.targetUserId)
      await Promise.all(others.map(async (a) => {
        if ((a.branchIds || []).includes(input.branchId)) {
          const next = { ...a, branchIds: (a.branchIds || []).filter(b => b !== input.branchId) }
          await api.setAuditorAssignment(a.userId, next)
        }
      }))
      return { ok: true }
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: QK.ASSIGNMENTS })
      const previous = qc.getQueryData<AuditorAssignment[]>(QK.ASSIGNMENTS)
      qc.setQueryData<AuditorAssignment[]>(QK.ASSIGNMENTS, (prev) => produceAssignBranchNext(prev, input))
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(QK.ASSIGNMENTS, ctx.previous)
      showToast({ message: 'Restored previous view after failed branch assign.', variant: 'info' })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.ASSIGNMENTS })
    },
  })
}

export type ClearManualInput = { branchId: string }
function produceClearManualNext(prev: AuditorAssignment[] | undefined, input: ClearManualInput): AuditorAssignment[] {
  const base = prev ? prev.map(a => ({ userId: a.userId, branchIds: [...(a.branchIds || [])], zoneIds: [...(a.zoneIds || [])] })) : []
  base.forEach(a => {
    if (a.branchIds?.includes(input.branchId)) a.branchIds = a.branchIds.filter(b => b !== input.branchId)
  })
  return base
}

export function useClearManualAssignment() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: async (input: ClearManualInput) => {
      const current = await api.getAuditorAssignments()
      await Promise.all(current.map(async (a) => {
        if ((a.branchIds || []).includes(input.branchId)) {
          const next = { ...a, branchIds: (a.branchIds || []).filter(b => b !== input.branchId) }
          await api.setAuditorAssignment(a.userId, next)
        }
      }))
      return { ok: true }
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: QK.ASSIGNMENTS })
      const previous = qc.getQueryData<AuditorAssignment[]>(QK.ASSIGNMENTS)
      qc.setQueryData<AuditorAssignment[]>(QK.ASSIGNMENTS, (prev) => produceClearManualNext(prev, input))
      return { previous }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(QK.ASSIGNMENTS, ctx.previous)
      showToast({ message: 'Restored previous view after failed clear.', variant: 'info' })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.ASSIGNMENTS })
    },
  })
}
