import React, { useMemo, useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Branch, User, UserRole, Zone } from '@trakr/shared'
import ResponsiveTable from '../components/ResponsiveTable'
import BranchManagerAssignments from '../components/BranchManagerAssignments'
import BranchAuditorAssignments from '../components/BranchAuditorAssignments'
import ZoneBulkAuditorAssignment from '../components/ZoneBulkAuditorAssignment'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'
import { UserGroupIcon, UsersIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '../hooks/useToast'
import { useOrganization } from '../contexts/OrganizationContext'
import { useSearchParams } from 'react-router-dom'

const ManageBranches: React.FC = () => {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  
  const { data: branches = [] } = useQuery<Branch[]>({ 
    queryKey: ['branches', effectiveOrgId], 
    queryFn: () => api.getBranches(effectiveOrgId), 
    enabled: !!effectiveOrgId || isSuperAdmin 
  })
  const [edit, setEdit] = useState<{ id: string; name: string; address: string } | null>(null)
  const updateBranchMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; address: string }) => {
      return api.updateBranch(payload.id, { name: payload.name, address: payload.address })
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: QK.BRANCHES(effectiveOrgId) })
      showToast({ message: `Branch "${updated.name}" updated successfully!`, variant: 'success' })
      setEdit(null)
    },
    onError: (error: any) => {
      showToast({ message: error?.message || 'Failed to update branch. Please try again.', variant: 'error' })
    }
  })

  // Toggle branch active status (enforced by API to require at least one auditor)
  const setBranchActive = useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) => {
      return api.updateBranch(payload.id, { isActive: payload.isActive })
    },
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: QK.BRANCHES(effectiveOrgId) })
      showToast({ message: `Branch "${updated.name}" ${vars.isActive ? 'activated' : 'deactivated'} successfully!`, variant: 'success' })
    },
    onError: (error: any) => {
      const msg = error?.message || 'Failed to update branch status. Ensure at least one auditor is assigned to this branch or via its zone.'
      showToast({ message: msg, variant: 'error' })
    }
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
  // Fetch all branch manager assignments (org-scoped)
  const { data: branchManagerAssignments = [] } = useQuery({
    queryKey: ['branch-manager-assignments', effectiveOrgId],
    queryFn: () => (api as any).getAllBranchManagerAssignments(),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
  // Fetch all auditor assignments (org-scoped)
  const { data: auditorAssignments = [] } = useQuery({
    queryKey: ['auditor-assignments', effectiveOrgId],
    queryFn: () => (api as any).getAuditorAssignments(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  const managers = useMemo(() => users.filter(u => u.role === UserRole.BRANCH_MANAGER), [users])
  
  // (assignment queries defined above)
  
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
    
    auditorAssignments.forEach((assignment: any) => {
      assignedAuditors.add(assignment.userId)
      // Count manual branch assignments
      ;(assignment.branchIds || []).forEach((branchId: string) => {
        counts[branchId] = (counts[branchId] || 0) + 1
      })
      
      // Count zone-based assignments
      ;(assignment.zoneIds || []).forEach((zoneId: string) => {
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
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const openId = searchParams.get('openAuditorsFor')
    if (openId && branches.find(b => b.id === openId)) {
      setSelectedAuditorBranchId(openId)
    }
  }, [searchParams, branches])
  const eligibleToActivate = useMemo(() =>
    branches.filter(b => !b.isActive && (branchAuditorCounts[b.id] || 0) > 0).map(b => b.id),
    [branches, branchAuditorCounts]
  )
  const bulkActivate = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map(id => api.updateBranch(id, { isActive: true })))
      return results
    },
    onSuccess: (results) => {
      qc.invalidateQueries({ queryKey: QK.BRANCHES(effectiveOrgId) })
      const fulfilled = results.filter(r => r.status === 'fulfilled').length
      const rejected = results.length - fulfilled
      showToast({ message: `Activated ${fulfilled} branch${fulfilled !== 1 ? 'es' : ''}. ${rejected > 0 ? rejected + ' failed.' : ''}`, variant: rejected ? 'info' : 'success' })
    },
    onError: () => {
      showToast({ message: 'Bulk activation failed. Please try again.', variant: 'error' })
    }
  })

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
              Please run the database seeding script: <code className="bg-gray-100 px-2 py-1 rounded-sm">npm run seed:db</code>
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Manage Branches">
      <div className="space-y-6">
        {/* Header - No heading duplication, only show subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-base text-gray-500 font-medium">{branches.length} branch{branches.length !== 1 ? 'es' : ''} in your organization</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav
            className="flex flex-nowrap gap-4 sm:gap-8 overflow-x-auto whitespace-nowrap"
            aria-label="Tabs"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              onClick={() => setActiveTab('list')}
              className={`inline-flex items-center gap-2 whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>📋 Manage Branches</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                {branches.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`inline-flex items-center gap-2 whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'create'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>✨ Create New Branch</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' && (
          /* Create New Branch */
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Create New Branch</h2>
            <p className="text-sm text-gray-600 mt-1">Add a new branch location to your organization</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
              <input 
                className="input" 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                placeholder="Enter branch name" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input 
                className="input" 
                value={form.address} 
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                placeholder="Enter branch address" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Manager</label>
              <select 
                className="input" 
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
                className="input" 
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
              className="btn btn-primary btn-md" 
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
          <div className="bg-linear-to-r from-blue-500 to-indigo-600 rounded-lg p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-2xl">🗺️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Bulk Assign Auditors by Zone</h3>
                <p className="text-sm opacity-90 mb-3">
                  Quickly assign auditors to all branches in a zone at once
                </p>
                <button
                  onClick={() => setShowZoneBulkAssignment(true)}
                  className="bg-white dark:bg-white/90 text-primary-600 hover:bg-gray-100 dark:hover:bg-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Bulk Assign by Zone
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-gray-900">Branches</h2>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => bulkActivate.mutate(eligibleToActivate)}
                disabled={eligibleToActivate.length === 0 || bulkActivate.isPending}
                aria-disabled={eligibleToActivate.length === 0 || bulkActivate.isPending}
                aria-label={eligibleToActivate.length === 0 ? 'No eligible branches to activate' : `Activate ${eligibleToActivate.length} eligible branches`}
                title={eligibleToActivate.length === 0 ? 'Assign at least one auditor before activating' : `Activate ${eligibleToActivate.length} eligible branches`}
              >
                {bulkActivate.isPending ? 'Activating…' : 'Activate All Eligible'}
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveTable<Branch>
              items={branches}
              keyField={(b) => b.id}
              empty={<p className="text-gray-500 text-center py-8">No branches found.</p>}
              mobileItem={(b) => {
                const branchZone = zones.find(z => z.branchIds?.includes(b.id))
                return (
                  <div className="card p-5 hover:shadow-md transition-shadow">
                    {/* Card Header */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-base truncate">{b.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{b.address || 'No address'}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                              {b.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {branchZone && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                🗺️ {branchZone.name}
                              </span>
                            )}
                          </div>
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
                          {(branchAuditorCounts[b.id] || 0) > 0 ? (
                            <span>{`${branchAuditorCounts[b.id]} Auditor${branchAuditorCounts[b.id] !== 1 ? 's' : ''}`}</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">No auditors</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex flex-col gap-2">
                        <button 
                          className="w-full btn btn-outline btn-md flex items-center justify-center gap-2"
                          onClick={() => setEdit({ id: b.id, name: b.name, address: b.address || '' })}
                        >
                          <span>Edit Details</span>
                        </button>
                        <button 
                          className="w-full btn btn-outline btn-md flex items-center justify-center gap-2"
                          onClick={() => setSelectedBranchId(b.id)}
                        >
                          <UserGroupIcon className="w-5 h-5" />
                          <span>Manage Managers</span>
                        </button>
                        <button 
                          className="w-full btn btn-primary btn-md flex items-center justify-center gap-2"
                          onClick={() => setSelectedAuditorBranchId(b.id)}
                        >
                          <UsersIcon className="w-5 h-5" />
                          <span>Manage Auditors</span>
                        </button>
                        <button
                          className={`w-full ${b.isActive ? 'btn btn-danger btn-md' : 'btn btn-primary btn-md'}`}
                          onClick={() => setBranchActive.mutate({ id: b.id, isActive: !b.isActive })}
                          disabled={setBranchActive.isPending || (!b.isActive && (branchAuditorCounts[b.id] || 0) === 0)}
                          title={!b.isActive && (branchAuditorCounts[b.id] || 0) === 0 ? 'Assign at least one auditor before activating' : (b.isActive ? 'Deactivate branch' : 'Activate branch')}
                          aria-disabled={setBranchActive.isPending || (!b.isActive && (branchAuditorCounts[b.id] || 0) === 0)}
                          aria-label={!b.isActive && (branchAuditorCounts[b.id] || 0) === 0 ? 'Activate is disabled until at least one auditor is assigned' : (b.isActive ? 'Deactivate branch' : 'Activate branch')}
                        >
                          <span>{b.isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                        <button 
                          className="w-full btn btn-danger btn-md flex items-center justify-center gap-2"
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
                        <div className="mt-1 flex items-center gap-2">
                          {branchZone && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              🗺️ {branchZone.name}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  }
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (b) => (
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )
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
                            {(branchAuditorCounts[b.id] || 0) > 0 ? (
                              <div className="text-sm font-medium text-gray-900">
                                {`${branchAuditorCounts[b.id]} Auditor${branchAuditorCounts[b.id] !== 1 ? 's' : ''}`}
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">No auditors assigned</div>
                            )}
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
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEdit({ id: b.id, name: b.name, address: b.address || '' })}
                        title="Edit branch"
                      >
                        Edit
                      </button>
                      <button
                        className={`${b.isActive ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm'}`}
                        onClick={() => setBranchActive.mutate({ id: b.id, isActive: !b.isActive })}
                        disabled={setBranchActive.isPending || (!b.isActive && (branchAuditorCounts[b.id] || 0) === 0)}
                        title={!b.isActive && (branchAuditorCounts[b.id] || 0) === 0 ? 'Assign at least one auditor before activating' : (b.isActive ? 'Deactivate branch' : 'Activate branch')}
                        aria-disabled={setBranchActive.isPending || (!b.isActive && (branchAuditorCounts[b.id] || 0) === 0)}
                        aria-label={!b.isActive && (branchAuditorCounts[b.id] || 0) === 0 ? 'Activate is disabled until at least one auditor is assigned' : (b.isActive ? 'Deactivate branch' : 'Activate branch')}
                      >
                        {b.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => { if (window.confirm(`Delete "${b.name}"?`)) deleteBranch.mutate(b.id) }}
                        title="Delete branch"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedBranchId(null)}
            />
            
            {/* Bottom Sheet */}
            <div className="relative bg-white dark:bg-(--color-card) w-full sm:max-w-2xl sm:rounded-lg shadow-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-lg animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
              {/* Drag Handle (Mobile Only) */}
              <div className="sm:hidden flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-500 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Branch Manager Assignments</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{branches.find(b => b.id === selectedBranchId)?.name}</p>
                </div>
                <button
                  onClick={() => setSelectedBranchId(null)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg shrink-0"
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
              <div className="shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="p-4 sm:p-6">
                  <button
                    onClick={() => {
                      // Trigger the add manager action in the component
                      const event = new CustomEvent('openAddManager', { detail: { branchId: selectedBranchId } })
                      window.dispatchEvent(event)
                    }}
                    className="w-full btn btn-primary btn-md flex items-center justify-center gap-2"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedAuditorBranchId(null)}
            />
            
            {/* Bottom Sheet */}
            <div className="relative bg-white dark:bg-(--color-card) w-full sm:max-w-3xl sm:rounded-lg shadow-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-lg animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
              {/* Drag Handle (Mobile Only) */}
              <div className="sm:hidden flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-500 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Auditor Assignments</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{branches.find(b => b.id === selectedAuditorBranchId)?.name}</p>
                </div>
                <button
                  onClick={() => setSelectedAuditorBranchId(null)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg shrink-0"
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
                  isBranchActive={!!branches.find(b => b.id === selectedAuditorBranchId)?.isActive}
                />
              </div>
              
              {/* Sticky Footer with Action Button */}
              <div className="shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="p-4 sm:p-6">
                  <button
                    onClick={() => {
                      // Trigger the add auditor action in the component
                      const event = new CustomEvent('openAddAuditor', { detail: { branchId: selectedAuditorBranchId } })
                      window.dispatchEvent(event)
                    }}
                    className="w-full btn btn-primary btn-md flex items-center justify-center gap-2"
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

        {edit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setEdit(null)} />
            <div className="relative bg-white dark:bg-(--color-card) w-full sm:max-w-lg sm:rounded-lg shadow-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-lg animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Branch</h3>
                <button onClick={() => setEdit(null)} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Branch Name</label>
                  <input className="input" value={edit.name} onChange={(e) => setEdit(v => v ? { ...v, name: e.target.value } : v)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Address</label>
                  <input className="input" value={edit.address} onChange={(e) => setEdit(v => v ? { ...v, address: e.target.value } : v)} />
                </div>
              </div>
              <div className="shrink-0 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-(--color-card)">
                <div className="p-4 sm:p-6 flex items-center justify-end gap-2">
                  <button className="btn btn-outline btn-md" onClick={() => setEdit(null)}>Cancel</button>
                  <button className="btn btn-primary btn-md disabled:opacity-50" disabled={updateBranchMutation.isPending || !edit.name.trim()} onClick={() => edit && updateBranchMutation.mutate({ id: edit.id, name: edit.name.trim(), address: edit.address.trim() })}>
                    {updateBranchMutation.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default ManageBranches
