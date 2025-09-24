import { useQuery } from '@tanstack/react-query'
import { Zone } from '@trakr/shared'
import { api } from '@/utils/api'
import { QK } from '@/utils/queryKeys'

export function useZones(orgId?: string) {
  return useQuery<Zone[]>({
    queryKey: QK.ZONES(orgId),
    queryFn: () => api.getZones(orgId),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  })
}
