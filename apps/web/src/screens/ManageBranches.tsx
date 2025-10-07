import React, { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Branch, Organization, User, UserRole, Zone } from '@trakr/shared'
import ResponsiveTable from '../components/ResponsiveTable'
import BranchManagerAssignments from '../components/BranchManagerAssignments'
import BranchAuditorAssignments from '../components/BranchAuditorAssignments'
import ZoneBulkAuditorAssignment from '../components/ZoneBulkAuditorAssignment'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { UserGroupIcon, UsersIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '../hooks/useToast'
import { useOrganization } from '../contexts/OrganizationContext'

const ManageBranches: React.FC = () => {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  
  const { data: branches = [] } = useQuery<Branch[]>({ 
    queryKey: ['branches', effectiveOrgId], 
    queryFn: () => api.getBranches(effectiveOrgId), 
    enabled: !!effectiveOrgId || isSuperAdmin 
  })
  const { data: users = [] } = useQuery<User[]>({ 
    queryKey: ['users', effectiveOrgId], 
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  const { data: zones = [] } = useQuery<Zone[]>({ 
    queryKey: ['zones', effectiveOrgId], 
    queryFn: () => api.getZones(effectiveOrgId), 
    enabled: !!effectiveOrgId || isSuperAdmin 
  })

  const managers = useMemo(() => users.filter(u => u.role === UserRole.BRANCH_MANAGER), [users])
  
  // Fetch all branch manager assignments
  // NOTE: RLS policies automatically filter by org, no need to pass orgId
  const { data: branchManagerAssignments = [] } = useQuery({
    queryKey: ['branch-manager-assignments', effectiveOrgId],
    queryFn: () => (api as any).getAllBranchManagerAssignments(),
    enabled: !!effectiveOrgId || isSuperAdmin
  })

  // Fetch all auditor assignments (org-scoped)
  const { data: auditorAssignments = [] } = useQuery({
    queryKey: ['assignments', effectiveOrgId],
    queryFn: () => (api as any).getAuditorAssignments(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })
  
  // Calculate manager counts per branch
  const branchManagerCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    branchManagerAssignments.forEach((assignment: any) => {
      counts[assignment.branchId] = (counts[assignment.branchId] || 0) + 1
    })
    return counts
  }, [branchManagerAssignments])

  // Calculate auditor counts per branch (manual assignments + zone assignments)
  const branchAuditorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const assignedAuditors = new Set<string>()
    
    auditorAssignments.forEach(assignment => {
      assignedAuditors.add(assignment.userId)
      // Count manual branch assignments
      ;(assignment.branchIds || []).forEach(branchId => {
        counts[branchId] = (counts[branchId] || 0) + 1
      })
      
      // Count zone-based assignments
      ;(assignment.zoneIds || []).forEach(zoneId => {
        const zone = zones.find(z => z.id === zoneId)
        zone?.branchIds.forEach(branchId => {
          // Only count if not already manually assigned to this branch
          const isManuallyAssigned = assignment.branchIds?.includes(branchId)
          if (!isManuallyAssigned) {
            counts[branchId] = (counts[branchId] || 0) + 1
          }
        })
      })
    })
    
    return counts
  }, [auditorAssignments, zones])

  const [form, setForm] = useState<{ name: string; address: string; managerId: string | ''; zoneId: string | '' }>(
    { name: '', address: '', managerId: '', zoneId: '' }
  )
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [selectedAuditorBranchId, setSelectedAuditorBranchId] = useState<string | null>(null)
  const [showZoneBulkAssignment, setShowZoneBulkAssignment] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')

  const createBranch = useMutation({
    mutationFn: async (payload: { name: string; address: string; managerId?: string; zoneId?: string }) => {
      if (!effectiveOrgId) throw new Error('No organization')
      const created = await api.createBranch({ orgId: effectiveOrgId, name: payload.name, address: payload.address, managerId: payload.managerId })
      if (payload.zoneId) {
        const z = zones.find(zz => zz.id === payload.zoneId)
        const nextBranchIds = Array.from(new Set([...(z?.branchIds || []), created.id]))
        await api.updateZone(payload.zoneId, { branchIds: nextBranchIds })
      }
      return created
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: QK.BRANCHES(effectiveOrgId) })
      qc.invalidateQueries({ queryKey: QK.ZONES(effectiveOrgId) })
      setForm({ name: '', address: '', managerId: '', zoneId: '' })
      setActiveTab('list') // Switch to list tab to show the created branch
      showToast({ 
        message: `Branch "${created.name}" created successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to create branch. Please try again.', 
        variant: 'error' 
      })
    },
  })

  // Manager assignments now handled through BranchManagerAssignments component

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => api.deleteBranch(id),
    onSuccess: (_result, id) => {
      qc.invalidateQueries({ queryKey: QK.BRANCHES(effectiveOrgId) })
      const branch = branches.find(b => b.id === id)
      showToast({ 
        message: `Branch "${branch?.name || 'Branch'}" deleted successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to delete branch. Please try again.', 
        variant: 'error' 
      })
    },
  })

  // Loading state handled by query enabled flags

  // Show helpful message if no organization
  if (!effectiveOrgId) {
    return (
      <DashboardLayout title="Manage Branches">
        <div className="card p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Found</h3>
            <p className="text-gray-600 mb-4">
              You need to have an organization set up before managing branches.
            </p>
            <p className="text-sm text-gray-500">
              Please run the database seeding script: <code className="bg-gray-100 px-2 py-1 rounded">npm run seed:db</code>
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Manage Branches">
      <div className="mobile-container breathing-room">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Branches</h1>
            <p className="text-gray-600 mt-1">{branches.length} branch{branches.length !== 1 ? 'es' : ''} in your organization</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Manage Branches
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                {branches.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'create'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ✨ Create New Branch
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' && (
          /* Create New Branch */
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Create New Branch</h2>
            <p className="text-sm text-gray-600 mt-1">Add a new branch location to your organization</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
              <input 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                placeholder="Enter branch name" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                value={form.address} 
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                placeholder="Enter branch address" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Manager</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                value={form.managerId} 
                onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
              >
                <option value="">Select manager (optional)</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone Assignment</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                value={form.zoneId} 
                onChange={e => setForm(f => ({ ...f, zoneId: e.target.value }))}
              >
                <option value="">No zone assigned</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button 
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50" 
              onClick={() => createBranch.mutate({ name: form.name.trim(), address: form.address.trim(), managerId: form.managerId || undefined, zoneId: form.zoneId || undefined })} 
              disabled={!form.name.trim() || createBranch.isPending}
            >
              {createBranch.isPending ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating Branch...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">🏢</span>
                  <span>Create Branch</span>
                </div>
              )}
            </button>
          </div>
        </div>
        )}

        {activeTab === 'list' && (
        <>
        {/* Zone Bulk Assignment Card */}
        {zones.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🗺️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Bulk Assign Auditors by Zone</h3>
                <p className="text-sm opacity-90 mb-3">
                  Quickly assign auditors to all branches in a zone at once
                </p>
                <button
                  onClick={() => setShowZoneBulkAssignment(true)}
                  className="bg-white text-primary-600 hover:bg-gray-100 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Bulk Assign by Zone
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Branches</h2>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveTable<Branch>
              items={branches}
              keyField={(b) => b.id}
              empty={<p className="text-gray-500 text-center py-8">No branches found.</p>}
              mobileItem={(b) => {
                const branchZone = zones.find(z => z.branchIds?.includes(b.id))
                return (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    {/* Card Header */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-base truncate">{b.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{b.address || 'No address'}</p>
                          {branchZone && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                🗺️ {branchZone.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Quick Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <UserGroupIcon className="w-4 h-4" />
                          <span>{(branchManagerCounts[b.id] || 0) > 0 ? `${branchManagerCounts[b.id]} Manager${branchManagerCounts[b.id] !== 1 ? 's' : ''}` : 'No managers'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="w-4 h-4" />
                          <span>{(branchAuditorCounts[b.id] || 0) > 0 ? `${branchAuditorCounts[b.id]} Auditor${branchAuditorCounts[b.id] !== 1 ? 's' : ''}` : 'No auditors'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex flex-col gap-2">
                        <button 
                          className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          onClick={() => setSelectedBranchId(b.id)}
                        >
                          <UserGroupIcon className="w-5 h-5" />
                          <span>Manage Managers</span>
                        </button>
                        <button 
                          className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          onClick={() => setSelectedAuditorBranchId(b.id)}
                        >
                          <UsersIcon className="w-5 h-5" />
                          <span>Manage Auditors</span>
                        </button>
                        <button 
                          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          onClick={() => { if (window.confirm('Delete this branch?')) deleteBranch.mutate(b.id) }}
                        >
                          <TrashIcon className="w-5 h-5" />
                          <span>Delete Branch</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }}
              columns={[
                { 
                  key: 'name', 
                  header: 'Branch', 
                  render: (b) => {
                    const branchZone = zones.find(z => z.branchIds?.includes(b.id))
                    return (
                      <div>
                        <div className="font-medium text-gray-900">{b.name}</div>
                        <div className="text-sm text-gray-600 mt-0.5">{b.address || 'No address'}</div>
                        {branchZone && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 mt-1">
                            🗺️ {branchZone.name}
                          </span>
                        )}
                      </div>
                    )
                  }
                },
                { 
                  key: 'managers', 
                  header: 'Branch Managers', 
                  render: (b) => (
                    <div className="flex items-center gap-2">
                      <button 
                        className="text-left hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors group"
                        onClick={() => setSelectedBranchId(b.id)}
                      >
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {(branchManagerCounts[b.id] || 0) > 0 
                                ? `${branchManagerCounts[b.id]} Manager${branchManagerCounts[b.id] !== 1 ? 's' : ''}`
                                : 'No managers'}
                            </div>
                            <div className="text-xs text-gray-500 group-hover:text-primary-600">Click to manage →</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  ) 
                },
                { 
                  key: 'auditors', 
                  header: 'Auditors', 
                  render: (b) => (
                    <div className="flex items-center gap-2">
                      <button 
                        className="text-left hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors group"
                        onClick={() => setSelectedAuditorBranchId(b.id)}
                      >
                        <div className="flex items-center gap-2">
                          <UsersIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {(branchAuditorCounts[b.id] || 0) > 0 
                                ? `${branchAuditorCounts[b.id]} Auditor${branchAuditorCounts[b.id] !== 1 ? 's' : ''}`
                                : 'No auditors'}
                            </div>
                            <div className="text-xs text-gray-500 group-hover:text-primary-600">Click to manage →</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  ) 
                },
                { 
                  key: 'actions', 
                  header: '', 
                  className: 'text-right', 
                  render: (b) => (
                    <button 
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors group" 
                      onClick={() => { if (window.confirm(`Delete "${b.name}"?`)) deleteBranch.mutate(b.id) }}
                      title="Delete branch"
                    >
                      <TrashIcon className="w-5 h-5 text-gray-400 group-hover:text-red-600" />
                    </button>
                  )
                },
              ]}
            />
          </div>
        </div>
        </>
        )}

        {/* Branch Manager Assignments Bottom Sheet */}
        {selectedBranchId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedBranchId(null)}
            />
            
            {/* Bottom Sheet */}
            <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-lg animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
              {/* Drag Handle (Mobile Only) */}
              <div className="sm:hidden flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">Branch Manager Assignments</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{branches.find(b => b.id === selectedBranchId)?.name}</p>
                </div>
                <button
                  onClick={() => setSelectedBranchId(null)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <BranchManagerAssignments
                  branchId={selectedBranchId}
                  branchName={branches.find(b => b.id === selectedBranchId)?.name || 'Unknown Branch'}
                />
              </div>
              
              {/* Sticky Footer with Action Button */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="p-4 sm:p-6">
                  <button
                    onClick={() => {
                      // Trigger the add manager action in the component
                      const event = new CustomEvent('openAddManager', { detail: { branchId: selectedBranchId } })
                      window.dispatchEvent(event)
                    }}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Branch Manager</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auditor Assignments Bottom Sheet */}
        {selectedAuditorBranchId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedAuditorBranchId(null)}
            />
            
            {/* Bottom Sheet */}
            <div className="relative bg-white w-full sm:max-w-3xl sm:rounded-lg shadow-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-lg animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
              {/* Drag Handle (Mobile Only) */}
              <div className="sm:hidden flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">Auditor Assignments</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{branches.find(b => b.id === selectedAuditorBranchId)?.name}</p>
                </div>
                <button
                  onClick={() => setSelectedAuditorBranchId(null)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <BranchAuditorAssignments
                  branchId={selectedAuditorBranchId}
                  branchName={branches.find(b => b.id === selectedAuditorBranchId)?.name || 'Unknown Branch'}
                />
              </div>
              
              {/* Sticky Footer with Action Button */}
              <div className="flex-shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="p-4 sm:p-6">
                  <button
                    onClick={() => {
                      // Trigger the add auditor action in the component
                      const event = new CustomEvent('openAddAuditor', { detail: { branchId: selectedAuditorBranchId } })
                      window.dispatchEvent(event)
                    }}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Auditors</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zone Bulk Assignment Modal */}
        {showZoneBulkAssignment && effectiveOrgId && (
          <ZoneBulkAuditorAssignment
            orgId={effectiveOrgId}
            onClose={() => setShowZoneBulkAssignment(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

export default ManageBranches
