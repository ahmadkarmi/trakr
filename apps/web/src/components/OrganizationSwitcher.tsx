import { useOrganization } from '../contexts/OrganizationContext'

export const OrganizationSwitcher = () => {
  const { currentOrg, availableOrgs, switchOrganization, isSuperAdmin } = useOrganization()
  
  // Debug logging
  console.log('[OrganizationSwitcher] DEBUG:', {
    isSuperAdmin,
    availableOrgsCount: availableOrgs.length,
    currentOrg: currentOrg?.name,
    availableOrgs: availableOrgs.map(o => o.name)
  })
  
  // TEMPORARILY SHOW ALWAYS FOR DEBUGGING
  // Remove this after testing
  const FORCE_SHOW = true
  
  if (!FORCE_SHOW) {
    // Only show for super admins
    if (!isSuperAdmin) {
      console.log('[OrganizationSwitcher] Hidden: Not super admin')
      return null
    }
    
    // Show if we have any organizations
    if (availableOrgs.length === 0) {
      console.log('[OrganizationSwitcher] Hidden: No organizations')
      return null
    }
  }

  return (
    <div className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-100 px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md">
            <span className="text-base">⚙️</span>
            ADMIN MODE
          </span>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 hidden sm:block">
              Organization:
            </label>
            <select
              value={currentOrg?.id || ''}
              onChange={(e) => switchOrganization(e.target.value)}
              className="input text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Organization...</option>
              {availableOrgs.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({(org as any).subscription_status || 'active'})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-700 flex items-center gap-2">
          <span className="text-gray-500">Current:</span>
          <strong className="text-blue-700 font-semibold">
            {currentOrg?.name || 'Loading...'}
          </strong>
          {availableOrgs.length > 1 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {availableOrgs.length} orgs
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrganizationSwitcher
