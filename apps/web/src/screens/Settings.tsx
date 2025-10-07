import React, { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuthStore } from '../stores/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Organization, User, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { useToast } from '../hooks/useToast'
import { useOrganization } from '../contexts/OrganizationContext'
import { DocumentTextIcon, BuildingOffice2Icon, MapIcon, UsersIcon } from '@heroicons/react/24/outline'

const Settings: React.FC = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { currentOrg, availableOrgs, switchOrganization, isSuperAdmin, globalView, setGlobalView } = useOrganization()

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

  React.useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', email: user.email || '' })
    }
  }, [user])

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
      <div className="mobile-container breathing-room">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your organization preferences</p>
        </div>

        {/* Organization Switcher (Super Admin only) */}
        {isSuperAdmin ? (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-5 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">⚙️</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-white">Organization Context</h2>
                <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">SUPER ADMIN</span>
              </div>
              <p className="text-sm text-white/90 mb-4">
                Switch between organizations for management and support.
              </p>
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
                        {org.name} ({(org as any).subscription_status || 'active'})
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

              {(
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
              )}

              {/* Dev override removed */}
            </div>
          </div>
        </div>
        ) : null}

        {/* Super Admin: Organization Management Panel */}
        {isSuperAdmin && availableOrgs.length > 0 ? (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Manage Organizations</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Access management tools for each organization
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                {availableOrgs.length} {availableOrgs.length === 1 ? 'Organization' : 'Organizations'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableOrgs.map((org) => (
                <div key={org.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all">
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
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      Surveys
                    </Link>
                    <Link
                      to="/manage/branches"
                      onClick={() => currentOrg?.id !== org.id && switchOrganization(org.id)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <BuildingOffice2Icon className="w-4 h-4" />
                      Branches
                    </Link>
                    <Link
                      to="/manage/zones"
                      onClick={() => currentOrg?.id !== org.id && switchOrganization(org.id)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MapIcon className="w-4 h-4" />
                      Zones
                    </Link>
                    <Link
                      to="/manage/users"
                      onClick={() => currentOrg?.id !== org.id && switchOrganization(org.id)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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

        {/* Admin-only: Organization Settings (Super Admin acts as Admin when not in global view and an org is selected) */}
        {(user?.role === UserRole.ADMIN || (isSuperAdmin && !globalView && currentOrg)) ? (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
            <p className="text-gray-600 mt-1">Timezone and scheduling policies affect due dates and period boundaries. Gating controls whether starting a new audit is blocked by any audit in the period or only by Completed/Approved.</p>
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

        {/* Profile Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
          <p className="text-gray-600 mt-1">Update your name and email address.</p>
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

        {/* Notification Preferences */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-gray-600 mt-1">Choose how you want to be notified</p>
          
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

        {/* Signature quick access */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Signature</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your saved signature for approvals in your profile.</p>
          <div className="mt-3">
            <Link to="/profile/signature" className="btn btn-outline btn-sm">Open Profile · Signature</Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Settings
