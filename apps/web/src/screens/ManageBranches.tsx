import React, { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Branch, Organization, User, UserRole, Zone } from '@trakr/shared'
import ResponsiveTable from '../components/ResponsiveTable'
import BranchManagerAssignments from '../components/BranchManagerAssignments'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

const ManageBranches: React.FC = () => {
  const qc = useQueryClient()
  const { data: orgs = [] } = useQuery<Organization[]>({ queryKey: QK.ORGANIZATIONS, queryFn: api.getOrganizations })
  const orgId = orgs[0]?.id
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: QK.BRANCHES(orgId), queryFn: () => api.getBranches(orgId), enabled: !!orgId })
  const { data: users = [] } = useQuery<User[]>({ queryKey: QK.USERS, queryFn: api.getUsers })
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: QK.ZONES(orgId), queryFn: () => api.getZones(orgId), enabled: !!orgId })

  const managers = useMemo(() => users.filter(u => u.role === UserRole.BRANCH_MANAGER), [users])

  const [form, setForm] = useState<{ name: string; address: string; managerId: string | ''; zoneId: string | '' }>(
    { name: '', address: '', managerId: '', zoneId: '' }
  )
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)

  const createBranch = useMutation({
    mutationFn: async (payload: { name: string; address: string; managerId?: string; zoneId?: string }) => {
      if (!orgId) throw new Error('No organization')
      const created = await api.createBranch({ orgId, name: payload.name, address: payload.address, managerId: payload.managerId })
      if (payload.zoneId) {
        const z = zones.find(zz => zz.id === payload.zoneId)
        const nextBranchIds = Array.from(new Set([...(z?.branchIds || []), created.id]))
        await api.updateZone(payload.zoneId, { branchIds: nextBranchIds })
      }
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.BRANCHES(orgId) })
      qc.invalidateQueries({ queryKey: QK.ZONES(orgId) })
      setForm({ name: '', address: '', managerId: '', zoneId: '' })
    },
  })

  const updateManager = useMutation({
    mutationFn: async (payload: { branchId: string; managerId: string | null }) => api.setBranchManager(payload.branchId, payload.managerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.BRANCHES(orgId) }),
  })

  // frequency now lives on Survey, not Branch

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => api.deleteBranch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.BRANCHES(orgId) }),
  })

  return (
    <DashboardLayout title="Manage Branches">
      <div className="mobile-container space-y-6">
        {zones.length === 0 && (
          <div className="card-mobile border border-warning-200 bg-warning-50">
            <p className="text-mobile-body text-warning-800">
              No zones found. Create zones first, then add branches into those zones. This ensures assignments by zone work as expected.
            </p>
          </div>
        )}
        <div className="card-mobile">
          <div className="mobile-section">
            <h2 className="heading-mobile-md text-gray-900">Create Branch</h2>
          </div>
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input-mobile sm:input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Branch name" />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input-mobile sm:input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" />
            </div>
            <div>
              <label className="label">Manager</label>
              <select className="input-mobile sm:input" value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}>
                <option value="">Unassigned</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Zone</label>
              <select className="input-mobile sm:input" value={form.zoneId} onChange={e => setForm(f => ({ ...f, zoneId: e.target.value }))}>
                <option value="">No Zone</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-6">
            <button 
              className="btn-mobile-primary sm:btn-primary sm:w-auto" 
              onClick={() => createBranch.mutate({ name: form.name.trim(), address: form.address.trim(), managerId: form.managerId || undefined, zoneId: form.zoneId || undefined })} 
              disabled={!form.name.trim() || createBranch.isPending}
            >
              {createBranch.isPending ? 'Creating…' : 'Create Branch'}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
          <div className="mt-4">
            <ResponsiveTable<Branch>
              items={branches}
              keyField={(b) => b.id}
              empty={<p className="text-gray-500 py-8">No branches found.</p>}
              mobileItem={(b) => (
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.address || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="label">Manager</label>
                    <select className="input mt-1" value={b.managerId || ''} onChange={(e) => updateManager.mutate({ branchId: b.id, managerId: e.target.value || null })}>
                      <option value="">Unassigned</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button 
                      className="btn-outline btn-sm" 
                      onClick={() => setSelectedBranchId(b.id)}
                    >
                      Manage Managers
                    </button>
                    <button className="btn-outline btn-sm" onClick={() => { if (window.confirm('Delete this branch?')) deleteBranch.mutate(b.id) }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
              columns={[
                { key: 'name', header: 'Name', render: (b) => <span className="text-sm text-gray-900">{b.name}</span> },
                { key: 'address', header: 'Address', render: (b) => <span className="text-sm text-gray-700">{b.address || '—'}</span> },
                { key: 'manager', header: 'Manager', render: (b) => (
                  <select className="input" value={b.managerId || ''} onChange={(e) => updateManager.mutate({ branchId: b.id, managerId: e.target.value || null })}>
                    <option value="">Unassigned</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                ) },
                { key: 'actions', header: '', className: 'text-right', render: (b) => (
                  <div className="flex gap-2 justify-end">
                    <button 
                      className="btn-outline btn-sm" 
                      onClick={() => setSelectedBranchId(b.id)}
                    >
                      Manage Managers
                    </button>
                    <button className="btn-outline btn-sm" onClick={() => { if (window.confirm('Delete this branch?')) deleteBranch.mutate(b.id) }}>
                      Delete
                    </button>
                  </div>
                )},
              ]}
            />
          </div>
        </div>

        {/* Branch Manager Assignments Modal */}
        {selectedBranchId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium">Branch Manager Assignments</h3>
                <button
                  onClick={() => setSelectedBranchId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <BranchManagerAssignments
                  branchId={selectedBranchId}
                  branchName={branches.find(b => b.id === selectedBranchId)?.name || 'Unknown Branch'}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default ManageBranches
