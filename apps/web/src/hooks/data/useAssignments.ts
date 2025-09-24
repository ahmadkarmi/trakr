import { useQuery } from '@tanstack/react-query'
import { AuditorAssignment } from '@trakr/shared'
import { api } from '@/utils/api'
import { QK } from '@/utils/queryKeys'

export function useAssignments() {
  return useQuery<AuditorAssignment[]>({
    queryKey: QK.ASSIGNMENTS,
    queryFn: api.getAuditorAssignments,
  })
}
