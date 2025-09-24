import { useQueryClient } from '@tanstack/react-query'
import { QK } from './queryKeys'

export function useInvalidate() {
  const qc = useQueryClient()
  return {
    invalidateAssignments: () => qc.invalidateQueries({ queryKey: QK.ASSIGNMENTS }),
    invalidateAudits: (scope?: string) => qc.invalidateQueries({ queryKey: QK.AUDITS(scope) }),
    invalidateAudit: (id?: string) => qc.invalidateQueries({ queryKey: QK.AUDIT(id) }),
    invalidateBranches: (orgId?: string) => qc.invalidateQueries({ queryKey: QK.BRANCHES(orgId) }),
    invalidateZones: (orgId?: string) => qc.invalidateQueries({ queryKey: QK.ZONES(orgId) }),
    invalidateUsers: () => qc.invalidateQueries({ queryKey: QK.USERS }),
  }
}
