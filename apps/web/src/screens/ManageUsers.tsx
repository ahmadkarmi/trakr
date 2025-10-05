import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '../components/DashboardLayout'
import ResponsiveTable from '../components/ResponsiveTable'
import { api } from '../utils/api'
import { User, UserRole, USER_ROLE_LABELS } from '@trakr/shared'
import { PlusIcon, PencilIcon, TrashIcon, EnvelopeIcon, ShieldCheckIcon, UserIcon, UserPlusIcon, UserGroupIcon, CheckCircleIcon, PencilSquareIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import StatCard from '../components/StatCard'
import { useToast } from '../hooks/useToast'

const ManageUsers: React.FC = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: UserRole.AUDITOR
  })
  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers()
  })

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: UserRole }) => {
      // TODO: Implement inviteUser API method
      console.log('Inviting user:', data)
      return Promise.resolve({} as User)
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowInviteModal(false)
      setInviteForm({ email: '', name: '', role: UserRole.AUDITOR })
      showToast({ 
        message: `Invitation sent to ${variables.email}!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to send invitation.', 
        variant: 'error' 
      })
    }
  })

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
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to update user.', 
        variant: 'error' 
      })
    }
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => {
      // TODO: Implement deleteUser API method
      console.log('Deleting user:', userId)
      return Promise.resolve()
    },
    onSuccess: (_result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const user = users.find((u: User) => u.id === userId)
      showToast({ 
        message: `User "${user?.name || 'User'}" deleted successfully!`, 
        variant: 'success' 
      })
    },
    onError: (error) => {
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to delete user.', 
        variant: 'error' 
      })
    }
  })

  // Resend invitation mutation
  const resendInviteMutation = useMutation({
    mutationFn: (userId: string) => {
      // TODO: Implement resendInvitation API method
      console.log('Resending invitation for user:', userId)
      return Promise.resolve()
    },
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

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteForm.email && inviteForm.name) {
      inviteUserMutation.mutate(inviteForm)
    }
  }

  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    updateUserMutation.mutate({ userId, updates })
  }

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId)
    }
  }

  const handleResendInvite = (userId: string) => {
    resendInviteMutation.mutate(userId)
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
      <div className="mobile-container breathing-room">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-600 mt-1">{users.length} team members</p>
          </div>
          <button 
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors inline-flex items-center gap-2"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlusIcon className="w-5 h-5" />
            Invite User
          </button>
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

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-[92vw] max-w-md mx-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Invite New User</h3>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setShowInviteModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input mt-1"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  className="input mt-1"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                >
                  <option value={UserRole.AUDITOR}>{USER_ROLE_LABELS[UserRole.AUDITOR]}</option>
                  <option value={UserRole.BRANCH_MANAGER}>{USER_ROLE_LABELS[UserRole.BRANCH_MANAGER]}</option>
                  <option value={UserRole.ADMIN}>{USER_ROLE_LABELS[UserRole.ADMIN]}</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  className="btn btn-outline btn-md"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-md"
                  disabled={inviteUserMutation.isPending}
                >
                  {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
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
                  className="btn btn-outline btn-md"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-md"
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
