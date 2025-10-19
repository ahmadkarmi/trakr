import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '../components/DashboardLayout'
import ResponsiveTable from '../components/ResponsiveTable'
import InvitationManager from '../components/InvitationManager'
import { api } from '../utils/api'
import { User, UserRole, USER_ROLE_LABELS } from '@trakr/shared'
import { TrashIcon, EnvelopeIcon, ShieldCheckIcon, UserGroupIcon, CheckCircleIcon, PencilSquareIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useToast } from '../hooks/useToast'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuthStore } from '../stores/auth'

const ManageUsers: React.FC = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const { user: _currentUser } = useAuthStore()
  const navigate = useNavigate()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [coverageBlock, setCoverageBlock] = useState<{ title: string; message: string; branchNames?: string[]; branchIds?: string[]; userId?: string; action?: 'update' | 'delete'; updates?: Partial<User> } | null>(null)
  const [currentActionUserId, setCurrentActionUserId] = useState<string | null>(null)
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([])
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  // InvitationManager handles invite UX; header modal removed per request
  // Fetch users (org-scoped)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', effectiveOrgId],
    queryFn: () => (api as any).getUsers(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })

  // Header invite modal intentionally removed


  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: { userId: string; updates: Partial<User> }) =>
      api.updateUser(data.userId, data.updates),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
      const user = users.find((u: User) => u.id === variables.userId)
      showToast({ 
        message: `User "${user?.name || 'User'}" updated successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error, variables) => {
      const msg = error instanceof Error ? error.message : 'Failed to update user.'
      if (msg.includes('leave these active branches without auditors')) {
        if (currentActionUserId) {
          api.getUncoveredActiveBranchesIfAuditorRemoved(currentActionUserId).then((res: { ids: string[]; names: string[] }) => {
            setCoverageBlock({ title: 'Action blocked: Uncovered active branches', message: msg, branchNames: res.names, branchIds: res.ids, userId: currentActionUserId, action: 'update', updates: variables?.updates })
            setSelectedBranchIds(res.ids)
          }).catch(() => setCoverageBlock({ title: 'Action blocked: Uncovered active branches', message: msg }))
        } else {
          setCoverageBlock({ title: 'Action blocked: Uncovered active branches', message: msg })
        }
      } else {
        showToast({ message: msg, variant: 'error' })
      }
    }
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: (_result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const user = users.find((u: User) => u.id === userId)
      showToast({ 
        message: `User "${user?.name || 'User'}" deleted successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error, userId) => {
      const msg = error instanceof Error ? error.message : 'Failed to delete user.'
      if (msg.includes('leave these active branches without auditors')) {
        setCoverageBlock({ title: 'Deletion blocked: Uncovered active branches', message: msg, userId: String(userId), action: 'delete' })
        if (userId) {
          api.getUncoveredActiveBranchesIfAuditorRemoved(String(userId)).then((res: { ids: string[]; names: string[] }) => {
            setCoverageBlock({ title: 'Deletion blocked: Uncovered active branches', message: msg, userId: String(userId), action: 'delete', branchIds: res.ids, branchNames: res.names })
            setSelectedBranchIds(res.ids)
          }).catch(() => {})
        }
      } else {
        showToast({ message: msg, variant: 'error' })
      }
    }
  })

  // Resend invitation mutation
  const resendInviteMutation = useMutation({
    mutationFn: (userId: string) => api.resendInvitation(userId),
    onSuccess: (_result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const user = users.find((u: User) => u.id === userId)
      showToast({ 
        message: `Invitation resent to ${user?.email || 'user'}!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to resend invitation.', 
        variant: 'error' 
      })
    }
  })

  // no-op: header invite removed; InvitationManager provides invites

  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    setCurrentActionUserId(userId)
    updateUserMutation.mutate({ userId, updates })
  }

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setCurrentActionUserId(userId)
      deleteUserMutation.mutate(userId)
    }
  }

  const handleResendInvite = (userId: string) => {
    resendInviteMutation.mutate(userId)
  }

  const auditors = users.filter((u: User) => u.role === UserRole.AUDITOR)

  const toggleAuditorSel = (id: string) => {
    setSelectedAuditorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleBranchSel = (id: string) => {
    setSelectedBranchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleInlineAssign = async () => {
    if (!coverageBlock?.branchIds || selectedAuditorIds.length === 0) return
    setAssigning(true)
    try {
      for (const auditorId of selectedAuditorIds) {
        const existing = await api.getAuditorAssignment(auditorId)
        const currentBranchIds = existing?.branchIds || []
        const merged = Array.from(new Set([...currentBranchIds, ...selectedBranchIds]))
        await api.assignAuditor(auditorId, merged, existing?.zoneIds || [])
      }
      showToast({ message: 'Auditors assigned successfully.', variant: 'success' })
      // Recheck coverage
      if (coverageBlock.userId) {
        const res = await api.getUncoveredActiveBranchesIfAuditorRemoved(coverageBlock.userId)
        if (res.ids.length === 0) {
          // Auto-retry original action
          if (coverageBlock.action === 'update' && coverageBlock.updates) {
            updateUserMutation.mutate({ userId: coverageBlock.userId, updates: coverageBlock.updates })
          } else if (coverageBlock.action === 'delete') {
            deleteUserMutation.mutate(coverageBlock.userId)
          }
          setCoverageBlock(null)
          setSelectedAuditorIds([])
          setSelectedBranchIds([])
        } else {
          setCoverageBlock(prev => prev ? { ...prev, branchIds: res.ids, branchNames: res.names } : prev)
          showToast({ message: 'Some branches still uncovered. Please assign more auditors.', variant: 'info' })
        }
      }
    } catch (err: any) {
      showToast({ message: err?.message || 'Failed to assign auditors.', variant: 'error' })
    } finally {
      setAssigning(false)
    }
  }

  // Calculate stats
  const activeUsers = users.filter((u: User) => u.isActive !== false).length
  const pendingInvites = users.filter((u: User) => !u.emailVerified).length
  const adminUsers = users.filter((u: User) => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length

  if (isLoading) {
    return (
      <DashboardLayout title="Manage Users">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading users...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Manage Users">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-600 mt-1">{users.length} team members</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
              <UserGroupIcon className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-xs text-gray-600 mt-1">Total Users</p>
          </div>
          {/* Header invite modal intentionally removed; InvitationManager provides invites */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
            <p className="text-xs text-gray-600 mt-1">Active</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
              <EnvelopeIcon className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingInvites}</p>
            <p className="text-xs text-gray-600 mt-1">Pending</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{adminUsers}</p>
            <p className="text-xs text-gray-600 mt-1">Admins</p>
          </div>
        </div>

        {/* Invitation Manager */}
        <InvitationManager />

        {/* Users table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            <p className="text-sm text-gray-600 mt-1">Manage user roles, permissions, and account status.</p>
          </div>
          
          <ResponsiveTable
            items={users}
            keyField={(user: User) => user.id}
            empty={<p className="text-gray-500 py-8">No users found.</p>}
            mobileItem={(user: User) => (
              <div className="card-compact bg-white border border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium border">
                        {user.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === UserRole.BRANCH_MANAGER
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {USER_ROLE_LABELS[user.role]}
                        </span>
                        {!user.emailVerified && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                        {!user.isActive && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => setEditingUser(user)}
                  >
                    <PencilSquareIcon className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  {!user.emailVerified && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleResendInvite(user.id)}
                      disabled={resendInviteMutation.isPending}
                    >
                      <EnvelopeIcon className="w-4 h-4 mr-1" />
                      Resend
                    </button>
                  )}
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={deleteUserMutation.isPending}
                  >
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            )}
            columns={[
              { 
                key: 'user', 
                header: 'User', 
                render: (user: User) => (
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium border">
                        {user.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                )
              },
              { 
                key: 'role', 
                header: 'Role', 
                render: (user: User) => (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === UserRole.BRANCH_MANAGER
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                )
              },
              { 
                key: 'status', 
                header: 'Status', 
                render: (user: User) => (
                  <div className="flex flex-col gap-1">
                    {user.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircleIcon className="w-3 h-3 mr-1" />
                        Inactive
                      </span>
                    )}
                    {!user.emailVerified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </div>
                )
              },
              { 
                key: 'lastSeen', 
                header: 'Last Seen', 
                render: (user: User) => (
                  <div className="text-sm text-gray-500">
                    {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleDateString() : 'Never'}
                  </div>
                )
              },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (user: User) => (
                  <div className="flex items-center gap-2">
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingUser(user)}
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    {!user.emailVerified && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResendInvite(user.id)}
                        disabled={resendInviteMutation.isPending}
                        title="Resend invitation"
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={deleteUserMutation.isPending}
                      title="Delete user"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>

      {/* Coverage Blocking Modal */}
      {coverageBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCoverageBlock(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-[92vw] max-w-lg mx-auto p-6" role="dialog" aria-modal="true">
            <h3 className="text-lg font-semibold text-gray-900">{coverageBlock.title}</h3>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{coverageBlock.message}</p>
            {coverageBlock.branchNames && coverageBlock.branchNames.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-900 mb-2">Affected active branches:</p>
                <div className="flex flex-wrap gap-2">
                  {coverageBlock.branchNames.map((name, idx) => (
                    <label key={name + idx} className={`btn btn-outline btn-xs ${selectedBranchIds.includes(coverageBlock.branchIds?.[idx] || '') ? 'bg-gray-50' : ''}`}>
                      <input type="checkbox" className="mr-1" checked={selectedBranchIds.includes(coverageBlock.branchIds?.[idx] || '')} onChange={() => toggleBranchSel(coverageBlock.branchIds?.[idx] || '')} />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {/* Auditor selection */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Select auditors to assign</p>
              {auditors.length === 0 ? (
                <p className="text-sm text-gray-500">No auditors found. Invite or create auditor users first.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {auditors.map((a: User) => (
                    <label key={a.id} className={`flex items-center gap-2 p-2 rounded-lg border ${selectedAuditorIds.includes(a.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={selectedAuditorIds.includes(a.id)} onChange={() => toggleAuditorSel(a.id)} />
                      <span className="text-sm text-gray-900 truncate">{a.name}</span>
                      <span className="text-xs text-gray-500 truncate">{a.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-2">
              <button
                type="button"
                className="btn btn-outline btn-md"
                onClick={() => setCoverageBlock(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                disabled={assigning || selectedAuditorIds.length === 0 || selectedBranchIds.length === 0}
                onClick={handleInlineAssign}
              >
                {assigning ? 'Assigning…' : 'Assign Auditors'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => navigate('/manage/branches')}
              >
                Go to Manage Branches
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingUser(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-[92vw] max-w-md mx-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Edit User</h3>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setEditingUser(null)}
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="label">Role</label>
                <select
                  className="input mt-1"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as UserRole } : null)}
                >
                  <option value={UserRole.AUDITOR}>{USER_ROLE_LABELS[UserRole.AUDITOR]}</option>
                  <option value={UserRole.BRANCH_MANAGER}>{USER_ROLE_LABELS[UserRole.BRANCH_MANAGER]}</option>
                  <option value={UserRole.ADMIN}>{USER_ROLE_LABELS[UserRole.ADMIN]}</option>
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  className="input mt-1"
                  value={editingUser.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, isActive: e.target.value === 'active' } : null)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  className="btn btn-outline btn-lg rounded-xl"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-lg rounded-xl"
                  onClick={() => handleUpdateUser(editingUser.id, { role: editingUser.role, isActive: editingUser.isActive })}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default ManageUsers
