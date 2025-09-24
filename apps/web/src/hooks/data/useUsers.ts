import { useQuery } from '@tanstack/react-query'
import { User } from '@trakr/shared'
import { api } from '@/utils/api'
import { QK } from '@/utils/queryKeys'

export function useUsers() {
  return useQuery<User[]>({
    queryKey: QK.USERS,
    queryFn: api.getUsers,
    staleTime: 10 * 60 * 1000,
  })
}
