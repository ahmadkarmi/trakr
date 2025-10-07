import { useQuery } from '@tanstack/react-query'
import { User } from '@trakr/shared'
import { api } from '@/utils/api'
import { useOrganization } from '@/contexts/OrganizationContext'

export function useUsers() {
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  
  return useQuery<User[]>({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    staleTime: 10 * 60 * 1000,
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
}
