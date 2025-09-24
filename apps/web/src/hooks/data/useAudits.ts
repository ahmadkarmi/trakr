import { useQuery } from '@tanstack/react-query'
import { Audit, AuditStatus } from '@trakr/shared'
import { api } from '@/utils/api'
import { QK } from '@/utils/queryKeys'

export function useAudits(scope?: string | AuditStatus) {
  return useQuery<Audit[]>({
    queryKey: QK.AUDITS(scope),
    queryFn: () => api.getAudits(),
  })
}
