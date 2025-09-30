import React, { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuthStore } from '../stores/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Organization, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

const Settings: React.FC = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  

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
    mutationFn: () => api.updateOrganization(org!.id, { timeZone: tz, weekStartsOn: weekStart, gatingPolicy: gating }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.ORGANIZATIONS }),
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

  // Signature management moved to dedicated Profile page

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Admin-only: Organization Settings */}
        {user?.role === UserRole.ADMIN && (
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
              <button className="btn btn-primary btn-md" disabled={!org || updateOrg.isPending} onClick={() => updateOrg.mutate()}>
                {updateOrg.isPending ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
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
