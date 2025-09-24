import React, { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Branch, Organization, Zone } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

const ManageZones: React.FC = () => {
  const qc = useQueryClient()
  const { data: orgs = [] } = useQuery<Organization[]>({ queryKey: QK.ORGANIZATIONS, queryFn: api.getOrganizations })
  const orgId = orgs[0]?.id
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: QK.BRANCHES(orgId), queryFn: () => api.getBranches(orgId), enabled: !!orgId })
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: QK.ZONES(orgId), queryFn: () => api.getZones(orgId), enabled: !!orgId })

  const [form, setForm] = useState<{ name: string; description: string; branchIds: string[] }>({ name: '', description: '', branchIds: [] })

  const createZone = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization')
      return api.createZone({ orgId, name: form.name.trim(), description: form.description.trim(), branchIds: form.branchIds })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ZONES(orgId) })
      setForm({ name: '', description: '', branchIds: [] })
    },
  })

  const updateZone = useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<Pick<Zone, 'name' | 'description' | 'branchIds'>> }) =>
      api.updateZone(payload.id, payload.updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.ZONES(orgId) }),
  })

  const deleteZone = useMutation({
    mutationFn: async (id: string) => api.deleteZone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.ZONES(orgId) }),
  })

  const branchName = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b.name])), [branches])

  const toggleFormBranch = (id: string) => {
    setForm(f => ({ ...f, branchIds: f.branchIds.includes(id) ? f.branchIds.filter(x => x !== id) : [...f.branchIds, id] }))
  }

  return (
    <DashboardLayout title="Manage Zones">
      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Create Zone</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Name</label>
              <input className="input mt-1" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <input className="input mt-1" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Include Branches</label>
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {branches.map(b => (
                <label key={b.id} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.branchIds.includes(b.id)} onChange={() => toggleFormBranch(b.id)} />
                  <span>{b.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <button className="btn-primary" onClick={() => createZone.mutate()} disabled={!form.name.trim() || createZone.isPending}>
              {createZone.isPending ? 'Creating…' : 'Create Zone'}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Zones</h2>
          {zones.length === 0 ? (
            <p className="text-gray-500 mt-3">No zones created.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {zones.map(z => (
                <div key={z.id} className="border border-gray-200 rounded p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900">{z.name}</div>
                      <div className="text-sm text-gray-600">{z.description || '—'}</div>
                      <div className="text-xs text-gray-500">{z.branchIds.length} branches</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-outline btn-sm" onClick={() => updateZone.mutate({ id: z.id, updates: { name: prompt('Rename zone', z.name) || z.name } })}>Rename</button>
                      <button className="btn-outline btn-sm" onClick={() => updateZone.mutate({ id: z.id, updates: { description: prompt('Update description', z.description || '') || '' } })}>Edit Description</button>
                      <button className="btn-outline btn-sm" onClick={() => { if (confirm('Delete this zone?')) deleteZone.mutate(z.id) }}>Delete</button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-gray-700 mb-1">Branches in zone</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {branches.map(b => (
                        <label key={b.id} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={z.branchIds.includes(b.id)}
                            onChange={() => {
                              const next = z.branchIds.includes(b.id) ? z.branchIds.filter(x => x !== b.id) : [...z.branchIds, b.id]
                              updateZone.mutate({ id: z.id, updates: { branchIds: next } })
                            }}
                          />
                          <span>{branchName[b.id]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ManageZones
