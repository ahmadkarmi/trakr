import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Organization, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { useAuthStore } from '../stores/auth'

interface OrganizationContextType {
  currentOrg: Organization | null
  availableOrgs: Organization[]
  switchOrganization: (orgId: string) => Promise<void>
  isLoading: boolean
  isSuperAdmin: boolean
  refreshOrganizations: () => Promise<void>
  // Super admin global view (all organizations)
  globalView: boolean
  setGlobalView: (on: boolean) => Promise<void>
  // Computed effective org id for queries (undefined when globalView)
  effectiveOrgId: string | undefined
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore()
  const isSuperAdmin = (user?.role === UserRole.SUPER_ADMIN)
  
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [globalView, setGlobalViewState] = useState<boolean>(false)

  const loadOrganizations = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      
      if (isSuperAdmin) {
        // Super admins can see all organizations
        const orgs = await api.getOrganizations()
        setAvailableOrgs(orgs)
        
        // Load view scope and active org
        const viewScope = localStorage.getItem('super_admin_view_scope') || 'ORG'
        const allView = viewScope === 'ALL'
        setGlobalViewState(allView)

        if (allView) {
          // Global view: no currentOrg (queries should use undefined orgId)
          setCurrentOrg(null)
        } else {
          // Org-scoped view: pick stored org or first
          const storedOrgId = localStorage.getItem('super_admin_active_org')
          const activeOrg = storedOrgId 
            ? orgs.find(o => o.id === storedOrgId) || orgs[0]
            : orgs[0]
          setCurrentOrg(activeOrg || null)
        }
        
        // (audit trail omitted in web client)
      } else {
        // Regular users see only their organization
        const orgs = await api.getOrganizations()
        const userOrg = orgs.find(o => o.id === user.orgId)
        setCurrentOrg(userOrg || null)
        setAvailableOrgs(userOrg ? [userOrg] : [])
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
      setCurrentOrg(null)
      setAvailableOrgs([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [user, isSuperAdmin])

  const switchOrganization = async (orgId: string) => {
    if (!isSuperAdmin) {
      console.warn('Only super admins can switch organizations')
      return
    }
    
    const org = availableOrgs.find(o => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem('super_admin_active_org', orgId)
      // Ensure we are in ORG scope when selecting a specific org
      localStorage.setItem('super_admin_view_scope', 'ORG')
      setGlobalViewState(false)
      
      // (audit trail omitted in web client)
      
      // Invalidate React Query cache to reload data for new org
      // This ensures all data refreshes for the new organization
      window.location.reload()
    }
  }

  const setGlobalView = async (on: boolean) => {
    if (!isSuperAdmin) return
    setGlobalViewState(on)
    localStorage.setItem('super_admin_view_scope', on ? 'ALL' : 'ORG')
    // When switching to ALL, clear currentOrg to avoid confusion
    if (on) {
      setCurrentOrg(null)
    }
    window.location.reload()
  }

  const effectiveOrgId: string | undefined = (isSuperAdmin && globalView)
    ? undefined
    : (currentOrg?.id || user?.orgId || undefined)

  const refreshOrganizations = async () => {
    await loadOrganizations()
  }

  return (
    <OrganizationContext.Provider 
      value={{ 
        currentOrg, 
        availableOrgs, 
        switchOrganization, 
        isLoading, 
        isSuperAdmin,
        refreshOrganizations,
        globalView,
        setGlobalView,
        effectiveOrgId,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}
