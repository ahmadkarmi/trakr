import React, { useState } from 'react'
import clsx from 'clsx'
import DashboardLayout from '../components/DashboardLayout'
import { useAuthStore } from '../stores/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Organization, User, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useToast } from '../hooks/useToast'
import { useOrganization } from '../contexts/OrganizationContext'
import { DocumentTextIcon, BuildingOffice2Icon, MapIcon, UsersIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { OrgConfigPanel } from '../components/OrgConfigPanel'
import { useTheme, type ThemePreference } from '../contexts/ThemeContext'

type SettingsTab = 'profile' | 'organization' | 'notifications' | 'super-admin'

type ThemeOption = {
  value: ThemePreference
  title: string
  description: string
  preview: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const APPEARANCE_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    title: 'Light',
    description: 'Bright surfaces with crisp contrast for well-lit spaces.',
    preview: 'from-white via-slate-100 to-slate-200',
    icon: SunIcon,
  },
  {
    value: 'dark',
    title: 'Dark',
    description: 'Midnight workspace with #33334a primary chrome.',
    preview: 'from-[#0f172a] via-[#1d2034] to-[#33334a]',
    icon: MoonIcon,
  },
  {
    value: 'system',
    title: 'System',
    description: 'Automatically follows your device preference.',
    preview: 'from-white via-slate-100 to-[#33334a]',
    icon: ComputerDesktopIcon,
  },
]

const Settings: React.FC = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { currentOrg, availableOrgs, switchOrganization, isSuperAdmin, globalView, setGlobalView, effectiveOrgId } = useOrganization()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { preference: themePref, setPreference: setThemePref } = useTheme()
  
  const isAdmin = user?.role === UserRole.ADMIN || isSuperAdmin

  // Admin: Organization settings (timezone, week start, gating)
  const { data: orgs = [] } = useQuery<Organization[]>({ queryKey: QK.ORGANIZATIONS, queryFn: api.getOrganizations })
  const org = orgs[0]
  const [tz, setTz] = useState<string>('UTC')
  const [weekStart, setWeekStart] = useState<0 | 1>(1)
  const [gating, setGating] = useState<'any' | 'completed_approved'>('completed_approved')
  const [tzQuery, setTzQuery] = useState<string>('')
  const [tzOpen, setTzOpen] = useState<boolean>(false)
  const [tzActiveIndex, setTzActiveIndex] = useState<number>(0)
  const tzDropdownRef = React.useRef<HTMLDivElement | null>(null)
  const tzSearchRef = React.useRef<HTMLInputElement | null>(null)
  const deviceTz = React.useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
  }, [])
  const timeZones = React.useMemo<string[]>(() => {
    try {
      const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
      if (typeof anyIntl.supportedValuesOf === 'function') {
        const vals = anyIntl.supportedValuesOf('timeZone') || []
        if (Array.isArray(vals) && vals.length > 0) return vals
      }
    } catch { void 0 }
    // Fallback list of common IANA zones
    return [
      'UTC',
      'Europe/Athens', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo',
      'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
      'Australia/Sydney', 'Australia/Melbourne',
      'Africa/Johannesburg', 'Africa/Cairo',
      'Pacific/Auckland', 'Pacific/Honolulu'
    ]
  }, [])
  const tzOffsets = React.useMemo<Record<string, string>>(() => {
    const dt = new Date()
    const map: Record<string, string> = {}
    const normalize = (gmt: string) => {
      const m = gmt.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
      if (!m) return 'GMT'
      const sign = m[1]
      const hh = m[2].padStart(2, '0')
      const mm = (m[3] || '00').padStart(2, '0')
      return `GMT${sign}${hh}:${mm}`
    }
    timeZones.forEach((z) => {
      let label = 'GMT'
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'shortOffset' }).formatToParts(dt)
        const tzName = parts.find(p => p.type === 'timeZoneName')?.value
        if (tzName && tzName.startsWith('GMT')) label = normalize(tzName)
      } catch { void 0 }
      if (label === 'GMT') {
        try {
          const s = dt.toLocaleString('en-US', { timeZone: z, timeZoneName: 'shortOffset' })
          const match = s.match(/GMT[+-]\d{1,2}(?::\d{2})?/)
          if (match) label = normalize(match[0])
        } catch { void 0 }
      }
      if (label === 'GMT') {
        try {
          const s = dt.toLocaleString('en-US', { timeZone: z, timeZoneName: 'short' })
          const match = s.match(/GMT[+-]\d{1,2}(?::\d{2})?/)
          if (match) label = normalize(match[0])
        } catch { void 0 }
      }
      map[z] = label
    })
    return map
  }, [timeZones])

  const { data: dataAccessAudit = [], isFetching: auditLoading } = useQuery({
    queryKey: ['data-access-audit', effectiveOrgId, globalView],
    queryFn: () => api.getDataAccessAudit(globalView ? undefined : effectiveOrgId),
    enabled: Boolean(isSuperAdmin),
  })
  const filteredTimeZones = React.useMemo<string[]>(() => {
    const q = tzQuery.trim().toLowerCase()
    let list = timeZones
    if (q) {
      list = timeZones.filter(z => z.toLowerCase().includes(q) || (tzOffsets[z] || '').toLowerCase().includes(q))
    }
    // Ensure current selection is visible even if filtered out
    if (tz && !list.includes(tz)) list = [tz, ...list]
    return list
  }, [timeZones, tzOffsets, tzQuery, tz])

  // Close timezone dropdown on outside click
  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!tzOpen) return
      const target = e.target as Node
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(target)) {
        setTzOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [tzOpen])

  const openTzDropdown = () => {
    setTzOpen(true)
    setTimeout(() => tzSearchRef.current?.focus(), 0)
  }
  const selectTimezone = (value: string) => {
    setTz(value)
    setTzOpen(false)
  }
  React.useEffect(() => {
    if (org) {
      setTz(org.timeZone || deviceTz)
      setWeekStart((org.weekStartsOn ?? 1) as 0 | 1)
      setGating(org.gatingPolicy || 'completed_approved')
    }
  }, [org, deviceTz])
  const updateOrg = useMutation({
    mutationFn: async () => {
      const targetOrgId = currentOrg?.id || org?.id
      if (!targetOrgId) throw new Error('No organization selected')
      return api.updateOrganization(targetOrgId, { timeZone: tz, weekStartsOn: weekStart, gatingPolicy: gating })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.ORGANIZATIONS })
      showToast({ message: 'Organization settings updated successfully!', variant: 'success' })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to update organization settings.', 
        variant: 'error' 
      })
    },
  })

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [orgProfileForm, setOrgProfileForm] = useState({ name: '', address: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  React.useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', email: user.email || '' })
    }
  }, [user])

  // Initialize organization profile form
  React.useEffect(() => {
    const targetOrg = currentOrg || org
    if (targetOrg) {
      setOrgProfileForm({
        name: targetOrg.name || '',
        address: (targetOrg as any).address || ''
      })
      setLogoPreview((targetOrg as any).logoUrl || null)
    }
  }, [currentOrg, org])

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      return api.updateUser(user.id, { name: profileForm.name, email: profileForm.email })
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: QK.USERS })
      if (updatedUser) {
        // Note: Supabase email changes require verification. This updates local state optimistically.
        useAuthStore.getState().updateUser({ ...user, ...updatedUser } as User)
      }
      showToast({ message: 'Profile updated successfully!', variant: 'success' })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to update profile.', 
        variant: 'error' 
      })
    },
  })

  const updateOrgProfile = useMutation({
    mutationFn: async () => {
      const targetOrgId = currentOrg?.id || org?.id
      if (!targetOrgId) throw new Error('No organization selected')

      let logoUrl = logoPreview

      // Upload new logo if selected
      if (logoFile) {
        setIsUploadingLogo(true)
        try {
          // Delete old logo if exists
          if (logoPreview && logoPreview !== (currentOrg as any)?.logoUrl && logoPreview !== (org as any)?.logoUrl) {
            await (api as any).deleteOrganizationLogo(logoPreview)
          }
          // Upload new logo
          logoUrl = await (api as any).uploadOrganizationLogo(targetOrgId, logoFile)
        } finally {
          setIsUploadingLogo(false)
        }
      }

      return (api as any).updateOrganization(targetOrgId, {
        name: orgProfileForm.name,
        address: orgProfileForm.address,
        logoUrl
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.ORGANIZATIONS })
      setLogoFile(null)
      showToast({ message: 'Organization profile updated successfully!', variant: 'success' })
    },
    onError: (error) => {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to update organization profile.',
        variant: 'error'
      })
      setIsUploadingLogo(false)
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast({ message: 'Please select an image file', variant: 'error' })
        return
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showToast({ message: 'Image must be less than 2MB', variant: 'error' })
        return
      }
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = async () => {
    if (logoPreview) {
      // If it's uploaded logo, delete from storage
      const targetOrg = currentOrg || org
      if (targetOrg && (targetOrg as any).logoUrl === logoPreview) {
        try {
          await (api as any).deleteOrganizationLogo(logoPreview)
          const targetOrgId = currentOrg?.id || org?.id
          if (targetOrgId) {
            await (api as any).updateOrganization(targetOrgId, { logoUrl: '' })
            queryClient.invalidateQueries({ queryKey: QK.ORGANIZATIONS })
            showToast({ message: 'Logo removed successfully!', variant: 'success' })
          }
        } catch (error) {
          showToast({ 
            message: error instanceof Error ? error.message : 'Failed to remove logo',
            variant: 'error'
          })
        }
      }
    }
    setLogoFile(null)
    setLogoPreview(null)
  }

  if (!user) {
    return (
      <DashboardLayout title="Settings">
        <div className="card p-6">
          <p className="text-gray-600">You must be signed in to manage settings.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Settings tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('organization')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'organization'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Organization
              </button>
            )}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'notifications'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notifications
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('super-admin')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'super-admin'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Super Admin
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        
        {/* Super Admin Tab */}
        {activeTab === 'super-admin' && isSuperAdmin && (
        <>
        {/* Organization Switcher (Super Admin only) */}
        {isSuperAdmin ? (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 sm:p-5 text-white">
          {/* Header with badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">⚙️</span>
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white">Organization Context</h2>
            </div>
            <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full whitespace-nowrap">SUPER ADMIN</span>
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <p className="text-sm text-white/90">
              Switch between organizations for management and support.
            </p>
          </div>
          
          {/* Content */}
          <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Current Organization:
                  </label>
                  <select
                    value={currentOrg?.id || ''}
                    onChange={(e) => switchOrganization(e.target.value)}
                    className="w-full px-4 py-2.5 border border-white/30 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-white/50 disabled:opacity-60"
                    disabled={globalView}
                  >
                    <option value="">{globalView ? 'Global view enabled' : (availableOrgs.length === 0 ? 'No organizations available' : 'Select Organization...')}</option>
                    {availableOrgs.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} (…{org.id.slice(-6)})
                      </option>
                    ))}
                  </select>
                </div>
                {currentOrg && (
                  <div className="text-sm text-white bg-white/10 rounded-lg px-3 py-2">
                    <strong className="font-semibold">{globalView ? 'All Organizations' : currentOrg.name}</strong>
                    {availableOrgs.length > 0 && (
                      <span className="ml-2 opacity-75">({availableOrgs.length} total)</span>
                    )}
                  </div>
                )}
              </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                id="toggle-global-view"
                type="checkbox"
                className="w-4 h-4 text-white rounded focus:ring-white/50 bg-white/20 border-white/30"
                checked={globalView}
                onChange={(e) => setGlobalView(e.target.checked)}
              />
              <label htmlFor="toggle-global-view" className="text-sm text-white cursor-pointer">
                View as Super Admin (All organizations)
              </label>
            </div>
          </div>
        </div>
        ) : null}

        {/* Super Admin: Organization Management Panel */}
        {isSuperAdmin && availableOrgs.length > 0 ? (
          <div className="card p-4 sm:p-6">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="heading-section-title">Manage Organizations</h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
                  {availableOrgs.length} {availableOrgs.length === 1 ? 'Org' : 'Orgs'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Access management tools for each organization
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableOrgs.map((org) => (
                <div key={org.id} className="card p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {(org as any).subscription_status || 'Active'} • {org.timeZone || 'UTC'}
                      </p>
                    </div>
                    {currentOrg?.id === org.id && (
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/manage/surveys"
                      onClick={() => currentOrg?.id !== org.id && switchOrganization(org.id)}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      Surveys
                    </Link>
                    <Link
                      to="/manage/branches"
                      onClick={() => currentOrg?.id !== org.id && switchOrganization(org.id)}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <BuildingOffice2Icon className="w-4 h-4" />
                      Branches
                    </Link>
                    <Link
                      to="/manage/zones"
                      onClick={() => currentOrg?.id !== org.id && switchOrganization(org.id)}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <MapIcon className="w-4 h-4" />
                      Zones
                    </Link>
                    <Link
                      to="/manage/users"
                      onClick={() => currentOrg?.id !== org.id && switchOrganization(org.id)}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <UsersIcon className="w-4 h-4" />
                      Users
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Super Admin: Fallback when no organizations found */}
        {(isSuperAdmin && availableOrgs.length === 0) ? (
          <div className="card p-6 bg-yellow-50 border border-yellow-200">
            <h2 className="text-lg font-semibold text-yellow-900">No Organizations Found</h2>
            <p className="text-sm text-yellow-800 mt-1">
              You are in Super Admin mode but there are no organizations available yet.
            </p>
            <ul className="text-sm text-yellow-800 list-disc ml-5 mt-2 space-y-1">
              <li>Create an organization in the database (SQL) or via onboarding.</li>
              <li>Or switch your role to ADMIN to manage your own org settings.</li>
            </ul>
          </div>
        ) : null}

        <OrgConfigPanel />

        <div className="card">
          <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
            <div>
              <p className="heading-micro mb-1">Recent Data Access</p>
              <h3 className="heading-section-title">Config + Export Trail</h3>
              <p className="heading-subtitle mt-1">Exports and config changes scoped to this view.</p>
            </div>
            {auditLoading && <span className="text-xs text-gray-500">Refreshing…</span>}
          </div>
          <div className="px-6 py-6">
            {dataAccessAudit.length === 0 ? (
              <div className="card-section text-sm text-gray-500">No recent audit entries.</div>
            ) : (
              <div className="overflow-hidden border border-gray-100 rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">When</th>
                        <th className="px-4 py-3 text-left">Action</th>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-left">Reason</th>
                        <th className="px-4 py-3 text-left">Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dataAccessAudit.map((entry: { id: string; createdAt: string | Date; action: string; userId?: string; reason?: string; exportScope?: Record<string, any> & { tables?: string[] } }) => (
                        <tr key={entry.id} className="hover:bg-gray-50/70">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs font-medium">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-medium capitalize">
                            {entry.action.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {entry.userId ? entry.userId.slice(0, 8) : 'System'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {entry.reason || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {Array.isArray(entry.exportScope?.tables)
                              ? entry.exportScope.tables.join(', ')
                              : (entry.exportScope && Object.keys(entry.exportScope).length > 0
                                  ? JSON.stringify(entry.exportScope)
                                  : '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* Organization Tab */}
        {activeTab === 'organization' && isAdmin && (
        <>
        {/* Organization Profile (visible when not in global view) */}
        {!globalView && (currentOrg || org) && (
          <div className="card p-6">
            <h2 className="heading-section-title">Organization Profile</h2>
            <p className="heading-subtitle mt-1">Manage your organization's information and branding</p>
            
            <div className="mt-6 space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="label">Organization Logo</label>
                <div className="mt-3 flex items-center gap-5">
                  <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Organization logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-gray-400 text-xs px-3">
                        <p className="font-medium text-gray-500">No Logo</p>
                        <p>Drop or upload</p>
                      </div>
                    )}
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-gray-600 shadow hover:text-red-600 hover:bg-white"
                        title="Remove logo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition cursor-pointer">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v11" />
                      </svg>
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG or GIF • max 2MB</p>
                    {logoPreview && (
                      <button type="button" className="text-xs text-gray-500 underline mt-1" onClick={handleRemoveLogo}>
                        Remove current logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Organization Name */}
              <div>
                <label className="label">Organization Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={orgProfileForm.name}
                  onChange={(e) => setOrgProfileForm({ ...orgProfileForm, name: e.target.value })}
                  placeholder="Enter organization name"
                />
              </div>

              {/* Organization Address */}
              <div>
                <label className="label">Address</label>
                <textarea
                  className="input mt-1"
                  rows={3}
                  value={orgProfileForm.address}
                  onChange={(e) => setOrgProfileForm({ ...orgProfileForm, address: e.target.value })}
                  placeholder="Enter organization address"
                />
              </div>

              {/* Save Button */}
              <div>
                <button
                  className="btn btn-primary btn-md"
                  disabled={updateOrgProfile.isPending || isUploadingLogo || !orgProfileForm.name}
                  onClick={() => updateOrgProfile.mutate()}
                >
                  {isUploadingLogo ? 'Uploading Logo...' : updateOrgProfile.isPending ? 'Saving...' : 'Save Organization Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin-only: Organization Settings (Super Admin acts as Admin when not in global view and an org is selected) */}
        {(user?.role === UserRole.ADMIN || (isSuperAdmin && !globalView && currentOrg)) ? (
          <div className="card p-6">
            <h2 className="heading-section-title">Organization Settings</h2>
            <p className="heading-subtitle mt-1">Timezone and scheduling policies affect due dates and period boundaries. Gating controls whether starting a new audit is blocked by any audit in the period or only by Completed/Approved.</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Timezone (IANA)</label>
                <div className="relative" ref={tzDropdownRef}>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={tzOpen}
                    className="input mt-1 flex items-center justify-between"
                    onClick={() => (tzOpen ? setTzOpen(false) : openTzDropdown())}
                  >
                    <span className="truncate">{tz} ({tzOffsets[tz] || 'GMT'})</span>
                    <svg className={`w-4 h-4 ml-2 transition-transform ${tzOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd"/></svg>
                  </button>
                  {tzOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                      <div className="p-2 border-b">
                        <input
                          ref={tzSearchRef}
                          className="input"
                          placeholder="Search timezones…"
                          value={tzQuery}
                          onChange={(e) => { setTzQuery(e.target.value); setTzActiveIndex(0) }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') { e.preventDefault(); setTzActiveIndex(i => Math.min(i + 1, filteredTimeZones.length - 1)) }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); setTzActiveIndex(i => Math.max(i - 1, 0)) }
                            else if (e.key === 'Enter') { e.preventDefault(); const val = filteredTimeZones[tzActiveIndex]; if (val) selectTimezone(val) }
                            else if (e.key === 'Escape') { e.preventDefault(); setTzOpen(false) }
                          }}
                        />
                      </div>
                      <ul role="listbox" className="max-h-64 overflow-auto py-1">
                        {filteredTimeZones.map((z, idx) => (
                          <li
                            key={z}
                            role="option"
                            aria-selected={z === tz}
                            className={`px-3 py-2 cursor-pointer text-sm flex justify-between ${idx === tzActiveIndex ? 'bg-primary-50' : ''} ${z === tz ? 'font-medium' : ''}`}
                            onMouseEnter={() => setTzActiveIndex(idx)}
                            onClick={() => selectTimezone(z)}
                          >
                            <span className="truncate">{z}</span>
                            <span className="ml-2 text-gray-500">{tzOffsets[z] || 'GMT'}</span>
                          </li>
                        ))}
                        {filteredTimeZones.length === 0 && (
                          <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Device timezone detected: {deviceTz}</p>
              </div>
              <div>
                <label className="label">Week Starts On</label>
                <select className="input mt-1" value={weekStart} onChange={(e) => setWeekStart(Number(e.target.value) as 0 | 1)}>
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                </select>
              </div>
              <div>
                <label className="label">Gating Policy</label>
                <select className="input mt-1" value={gating} onChange={(e) => setGating(e.target.value as 'any' | 'completed_approved')}>
                  <option value="any">Block new if any audit exists in period</option>
                  <option value="completed_approved">Block new only if a Completed/Approved audit exists</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button className="btn btn-primary btn-md" disabled={!(currentOrg?.id || org?.id) || updateOrg.isPending} onClick={() => updateOrg.mutate()}>
                {updateOrg.isPending ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        ) : null}
        </>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
        <>
        {/* Profile Settings */}
        <div className="card p-6">
          <h2 className="heading-section-title">Profile Settings</h2>
          <p className="heading-subtitle mt-1">Update your name and email address.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input mt-1"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input mt-1"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              className="btn btn-primary btn-md"
              disabled={updateProfile.isPending || !profileForm.name || !profileForm.email}
              onClick={() => updateProfile.mutate()}
            >
              {updateProfile.isPending ? 'Saving Profile…' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Appearance Preferences */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="heading-section-title">Appearance</h2>
              <p className="heading-subtitle mt-1">Choose how Trakr looks on your device.</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-card-muted)', color: 'var(--color-text-muted)' }}>
              Active: {themePref === 'system' ? 'System Default' : themePref === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {APPEARANCE_OPTIONS.map(option => {
              const Icon = option.icon
              const active = themePref === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setThemePref(option.value)}
                  className={clsx('text-left theme-option focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500', active && 'theme-option--active')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-500/5">
                        <Icon className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                      </span>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{option.title}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{option.description}</p>
                      </div>
                    </div>
                    {active && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                        Selected
                      </span>
                    )}
                  </div>
                  <div className={clsx('mt-4 h-24 rounded-xl border overflow-hidden bg-gradient-to-br shadow-inner', option.preview)} />
                </button>
              )
            })}
          </div>

          <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
            “System” keeps Trakr in sync with your OS preference, automatically switching between light and dark as your device changes modes.
          </p>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-900 text-xs p-3 dark:border-white/10 dark:bg-white/5 dark:text-amber-200">
            <strong>Heads up:</strong> dark mode is still experimental and a work in progress. Expect occasional UI gaps while we finish the polish.
          </div>
        </div>

        {/* Signature quick access */}
        <div className="card p-6">
          <h2 className="heading-section-title">Signature</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your saved signature for approvals in your profile.</p>
          <div className="mt-3">
            <Link to="/profile/signature" className="btn btn-outline btn-sm">Open Profile · Signature</Link>
          </div>
        </div>
        </>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
        <>
        {/* Notification Preferences */}
        <div className="card p-6">
          <h2 className="heading-section-title">Notification Preferences</h2>
          <p className="heading-subtitle mt-1">Choose how you want to be notified</p>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Audit Submissions</h3>
                <p className="text-xs text-gray-500 mt-0.5">Email when audits are submitted for review</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Approvals & Rejections</h3>
                <p className="text-xs text-gray-500 mt-0.5">Email when your audits are approved or rejected</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Due Date Reminders</h3>
                <p className="text-xs text-gray-500 mt-0.5">Email reminders when audits are coming due</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Weekly Digest</h3>
                <p className="text-xs text-gray-500 mt-0.5">Weekly summary of audit activity</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Browser Notifications</h3>
                <p className="text-xs text-gray-500 mt-0.5">Show desktop notifications in your browser</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> Notification preferences are currently for display only. Full email notification control will be available soon.
            </p>
          </div>
        </div>
        </>
        )}

      </div>
    </DashboardLayout>
  )
}

export default Settings
