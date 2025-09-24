import { useQuery } from '@tanstack/react-query'
import { Branch } from '@trakr/shared'
import { api } from '@/utils/api'
import { QK } from '@/utils/queryKeys'

export function useBranches(orgId?: string) {
  return useQuery<Branch[]>({
    queryKey: QK.BRANCHES(orgId),
    queryFn: () => api.getBranches(orgId),
    enabled: !!orgId,
  })
}
