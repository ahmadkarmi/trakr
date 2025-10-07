import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth'
import { UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

/**
 * Prefetch dashboard data and component chunks while user is signing in
 * Warms up React Query cache and preloads lazy chunks so dashboard renders faster
 */
export function useDashboardPrefetch() {
  const queryClient = useQueryClient()
  const { isLoading, user } = useAuthStore()

  useEffect(() => {
    // Only prefetch while signing in (not on initial app load)
    if (!isLoading || user) return

    // Prefetch common data needed by all dashboards
    const prefetch = async () => {
      try {
        // Prefetch organizations (not org-scoped)
        // Note: Users and Surveys are org-scoped, so they'll be fetched
        // on dashboard mount with proper effectiveOrgId
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: QK.ORGANIZATIONS,
            queryFn: api.getOrganizations,
            staleTime: 1000 * 60 * 5, // 5 minutes
          }),
        ])
      } catch (error) {
        // Prefetch failures are non-critical; dashboard will fetch on mount
        console.log('[Prefetch] Background data fetch completed')
      }
    }

    prefetch()
  }, [isLoading, user, queryClient])
}

/**
 * Preload dashboard component chunks based on user role
 * Call this during login to download the dashboard JS before navigation
 */
export function preloadDashboardChunk(role: UserRole) {
  // Preload the appropriate dashboard component chunk
  switch (role) {
    case UserRole.ADMIN:
    case UserRole.SUPER_ADMIN:
      // Preload admin dashboard chunk
      import('../screens/DashboardAdmin').catch(() => {
        // Preload failure is non-critical
      })
      break
    case UserRole.BRANCH_MANAGER:
      // Preload branch manager dashboard chunk
      import('../screens/DashboardBranchManager').catch(() => {})
      break
    case UserRole.AUDITOR:
      // Preload auditor dashboard chunk
      import('../screens/DashboardAuditor').catch(() => {})
      break
  }
}
