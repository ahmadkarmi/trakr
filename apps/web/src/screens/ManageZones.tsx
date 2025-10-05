import React, { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Branch, Organization, Zone } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import Tabs from '../components/Tabs'
import ResponsiveTable from '../components/ResponsiveTable'
import { PencilIcon, TrashIcon, MapIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useToast } from '../hooks/useToast'

const ManageZones: React.FC = () => {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { data: orgs = [] } = useQuery<Organization[]>({ queryKey: QK.ORGANIZATIONS, queryFn: api.getOrganizations })
  const orgId = orgs[0]?.id
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: QK.BRANCHES(orgId), queryFn: () => api.getBranches(orgId), enabled: !!orgId })
  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: QK.ZONES(orgId), queryFn: () => api.getZones(orgId), enabled: !!orgId })

  const [form, setForm] = useState<{ name: string; description: string; branchIds: string[] }>({ name: '', description: '', branchIds: [] })

  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage')
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)

  const createZone = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization')
      return api.createZone({ orgId, name: form.name.trim(), description: form.description.trim(), branchIds: form.branchIds })
    },
    onSuccess: (createdZone) => {
      qc.invalidateQueries({ queryKey: QK.ZONES(orgId) })
      setForm({ name: '', description: '', branchIds: [] })
      setActiveTab('manage') // Switch to manage tab to see the created zone
      showToast({ 
        message: `Zone "${createdZone.name}" created successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to create zone. Please try again.', 
        variant: 'error' 
      })
    },
  })

  const updateZone = useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<Pick<Zone, 'name' | 'description' | 'branchIds'>> }) =>
      api.updateZone(payload.id, payload.updates),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: QK.ZONES(orgId) })
      const zone = zones.find(z => z.id === variables.id)
      showToast({ 
        message: `Zone "${zone?.name || 'Zone'}" updated successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to update zone. Please try again.', 
        variant: 'error' 
      })
    },
  })

  const deleteZone = useMutation({
    mutationFn: async (id: string) => api.deleteZone(id),
    onSuccess: (_result, id) => {
      qc.invalidateQueries({ queryKey: QK.ZONES(orgId) })
      const zone = zones.find(z => z.id === id)
      showToast({ 
        message: `Zone "${zone?.name || 'Zone'}" deleted successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to delete zone. Please try again.', 
        variant: 'error' 
      })
    },
  })

  const branchName = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b.name])), [branches])

  const toggleFormBranch = (id: string) => {
    setForm(f => ({ ...f, branchIds: f.branchIds.includes(id) ? f.branchIds.filter(x => x !== id) : [...f.branchIds, id] }))
  }

  const tabs = [
    { id: 'manage', label: 'Manage Zones', icon: '📋', badge: zones.length },
    { id: 'create', label: 'Create New Zone', icon: '✨' },
  ]

  return (
    <DashboardLayout title="Manage Zones">
      <div className="mobile-container breathing-room">
        <Tabs tabs={tabs} defaultTab="manage" onChange={(tabId) => setActiveTab(tabId as 'manage' | 'create')}>

        {/* Manage Zones Tab */}
        <div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Zones</h2>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveTable<Zone>
              items={zones}
              keyField={(z) => z.id}
              empty={<p className="text-gray-500 text-center py-8">No zones found.</p>}
              mobileItem={(z) => (
                <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">🗺️</span>
                          <h4 className="font-semibold text-gray-900 text-base truncate">{z.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{z.description || 'No description'}</p>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {z.branchIds.length} {z.branchIds.length === 1 ? 'branch' : 'branches'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {z.branchIds.length > 0 && (
                      <div className="mt-3">
                        <label className="text-xs font-medium text-gray-500">Branches:</label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {z.branchIds.slice(0, 3).map(bid => (
                            <span key={bid} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                              {branchName[bid] || bid}
                            </span>
                          ))}
                          {z.branchIds.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                              +{z.branchIds.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex flex-col gap-2">
                      <button 
                        className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        onClick={() => {
                          const newName = prompt('Rename zone', z.name)
                          if (newName && newName.trim()) {
                            updateZone.mutate({ id: z.id, updates: { name: newName.trim() } })
                          }
                        }}
                      >
                        <PencilIcon className="w-5 h-5" />
                        <span>Edit Zone</span>
                      </button>
                      <button 
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        onClick={() => { 
                          if (window.confirm(`Delete zone "${z.name}"? This will not delete the branches.`)) {
                            deleteZone.mutate(z.id)
                          }
                        }}
                      >
                        <TrashIcon className="w-5 h-5" />
                        <span>Delete Zone</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              columns={[
                { 
                  key: 'zone', 
                  header: 'Zone', 
                  render: (z) => (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🗺️</span>
                        <div className="font-medium text-gray-900">{z.name}</div>
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">{z.description || 'No description'}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 mt-1">
                        {z.branchIds.length} {z.branchIds.length === 1 ? 'branch' : 'branches'}
                      </span>
                    </div>
                  )
                },
                { 
                  key: 'branches', 
                  header: 'Branches', 
                  render: (z) => (
                    <button
                      className="text-left hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors group"
                      onClick={() => setEditingZoneId(z.id)}
                    >
                      <div className="flex items-center gap-2">
                        <MapIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {z.branchIds.length === 0 ? 'No branches' : `${z.branchIds.length} ${z.branchIds.length === 1 ? 'branch' : 'branches'}`}
                          </div>
                          <div className="text-xs text-gray-500 group-hover:text-primary-600">Click to manage →</div>
                        </div>
                      </div>
                    </button>
                  ) 
                },
                { 
                  key: 'actions', 
                  header: '', 
                  className: 'text-right', 
                  render: (z) => (
                    <div className="flex gap-2 justify-end">
                      <button 
                        className="p-2 hover:bg-gray-50 rounded-lg transition-colors group" 
                        onClick={() => {
                          const newName = prompt('Rename zone', z.name)
                          if (newName && newName.trim()) {
                            updateZone.mutate({ id: z.id, updates: { name: newName.trim() } })
                          }
                        }}
                        title="Edit zone"
                      >
                        <PencilIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group" 
                        onClick={() => { 
                          if (window.confirm(`Delete "${z.name}"?`)) {
                            deleteZone.mutate(z.id)
                          }
                        }}
                        title="Delete zone"
                      >
                        <TrashIcon className="w-5 h-5 text-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  )
                },
              ]}
            />
          </div>
        </div>
        </div>

        {/* Create New Zone Tab */}
        <div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Create New Zone</h2>
            <p className="text-sm text-gray-600 mt-1">Group branches together for easier auditor assignments</p>
          </div>
          
          <div className="p-4 sm:p-6 space-y-6">
            {/* Zone Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Zone Name *</label>
                <input 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  value={form.name} 
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} 
                  placeholder="e.g., North Region, Downtown Area"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
                <input 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                  value={form.description} 
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} 
                  placeholder="Describe this zone"
                />
              </div>
            </div>
            
            {/* Branch Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Assign Branches</label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {form.branchIds.length === 0 ? 'No branches selected' : `${form.branchIds.length} ${form.branchIds.length === 1 ? 'branch' : 'branches'} selected`}
                  </p>
                </div>
                {form.branchIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, branchIds: [] }))}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              {branches.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-600">No branches available</p>
                  <p className="text-xs text-gray-500 mt-1">Create branches first to assign them to zones</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {branches.map(b => (
                    <label
                      key={b.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        form.branchIds.includes(b.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.branchIds.includes(b.id)}
                        onChange={() => toggleFormBranch(b.id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{b.name}</p>
                        {b.address && (
                          <p className="text-xs text-gray-500 truncate">{b.address}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={() => createZone.mutate()}
                disabled={!form.name.trim() || createZone.isPending}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createZone.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating Zone...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🗺️</span>
                    <span>Create Zone</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </div>

        </Tabs>

        {/* Branch Management Modal */}
        {editingZoneId && (() => {
          const zone = zones.find(z => z.id === editingZoneId)
          if (!zone) return null
          
          const assignedBranches = branches.filter(b => zone.branchIds.includes(b.id))
          const availableBranches = branches.filter(b => !zone.branchIds.includes(b.id))
          
          const handleAddBranches = (branchIds: string[]) => {
            const next = [...new Set([...zone.branchIds, ...branchIds])]
            updateZone.mutate({ id: zone.id, updates: { branchIds: next } })
          }
          
          const handleRemoveBranch = (branchId: string) => {
            const next = zone.branchIds.filter(id => id !== branchId)
            updateZone.mutate({ id: zone.id, updates: { branchIds: next } })
          }
          
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
              <div 
                className="absolute inset-0" 
                onClick={() => setEditingZoneId(null)}
              />
              
              <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-lg animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
                {/* Drag Handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
                
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">Manage Branches</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{zone.name}</p>
                  </div>
                  <button
                    onClick={() => setEditingZoneId(null)}
                    className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Assigned Branches */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Assigned Branches ({assignedBranches.length})</h4>
                    {assignedBranches.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <MapIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-600 font-medium">No branches assigned</p>
                        <p className="text-sm text-gray-500">Add branches from the list below</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {assignedBranches.map(branch => (
                          <div
                            key={branch.id}
                            className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <MapIcon className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{branch.name}</p>
                                <p className="text-xs text-gray-600 truncate">{branch.address || 'No address'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveBranch(branch.id)}
                              className="text-red-600 hover:text-red-700 p-1 flex-shrink-0"
                              title="Remove branch"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Available Branches */}
                  {availableBranches.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Branches ({availableBranches.length})</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {availableBranches.map(branch => (
                          <button
                            key={branch.id}
                            onClick={() => handleAddBranches([branch.id])}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
                          >
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <MapIcon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">{branch.name}</p>
                              <p className="text-xs text-gray-600 truncate">{branch.address || 'No address'}</p>
                            </div>
                            <span className="text-xs text-primary-600 font-medium flex-shrink-0">Add +</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-4">
                  <button
                    onClick={() => setEditingZoneId(null)}
                    className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </DashboardLayout>
  )
}

export default ManageZones
