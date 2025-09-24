import { useQuery } from '@tanstack/react-query'
import { Organization } from '@trakr/shared'
import { api } from '@/utils/api'
import { QK } from '@/utils/queryKeys'

export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: QK.ORGANIZATIONS,
    queryFn: api.getOrganizations,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
