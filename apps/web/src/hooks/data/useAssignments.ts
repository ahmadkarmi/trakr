import { useQuery } from '@tanstack/react-query'
import { AuditorAssignment } from '@trakr/shared'
import { api } from '@/utils/api'
import { QK } from '@/utils/queryKeys'

export function useAssignments(orgId?: string) {
  return useQuery<AuditorAssignment[]>({
    queryKey: QK.ASSIGNMENTS(orgId),
    queryFn: () => api.getAuditorAssignments(orgId),
  })
}
