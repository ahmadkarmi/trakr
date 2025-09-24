import { useQuery } from '@tanstack/react-query'
import { Organization } from '@trakr/shared'
import { QK } from '../utils/queryKeys'
import { api } from '../utils/api'

export function useOrgTimeZone(): string | undefined {
  const { data: orgs = [] } = useQuery<Organization[]>({ queryKey: QK.ORGANIZATIONS, queryFn: api.getOrganizations })
  return orgs[0]?.timeZone
}
