import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, UserRole, BranchManagerAssignment } from '@trakr/shared'
import { api } from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { PlusIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline'

interface BranchManagerAssignmentsProps {
  branchId: string
  branchName: string
}

export function BranchManagerAssignments({ branchId, branchName }: BranchManagerAssignmentsProps) {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAddManager, setShowAddManager] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState('')

  // Get current assignments for this branch
  const { data: assignments = [] } = useQuery<BranchManagerAssignment[]>({
    queryKey: ['branch-manager-assignments', branchId],
    queryFn: () => api.getBranchManagerAssignments(branchId),
  })

  // Get all branch managers
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  })

  const branchManagers = allUsers.filter(user => user.role === UserRole.BRANCH_MANAGER)
  const assignedManagerIds = assignments.map(assignment => assignment.managerId)
  const availableManagers = branchManagers.filter(manager => !assignedManagerIds.includes(manager.id))

  // Get assigned managers details
  const assignedManagers = branchManagers.filter(manager => assignedManagerIds.includes(manager.id))

  const assignMutation = useMutation({
    mutationFn: ({ managerId }: { managerId: string }) =>
      api.assignBranchManager(branchId, managerId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-manager-assignments'] })
      setShowAddManager(false)
      setSelectedManagerId('')
    },
  })

  const unassignMutation = useMutation({
    mutationFn: ({ managerId }: { managerId: string }) =>
      api.unassignBranchManager(branchId, managerId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-manager-assignments'] })
    },
  })

  const handleAssignManager = () => {
    if (selectedManagerId) {
      assignMutation.mutate({ managerId: selectedManagerId })
    }
  }

  const handleUnassignManager = (managerId: string) => {
    unassignMutation.mutate({ managerId })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Branch Managers - {branchName}
        </h3>
        <button
          onClick={() => setShowAddManager(true)}
          disabled={availableManagers.length === 0}
          className="btn-primary btn-sm flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Add Manager
        </button>
      </div>

      {/* Current Assignments */}
      <div className="space-y-3">
        {assignedManagers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No managers assigned to this branch</p>
            <p className="text-sm">Admins can approve audits for unassigned branches</p>
          </div>
        ) : (
          assignedManagers.map(manager => (
            <div
              key={manager.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{manager.name}</p>
                  <p className="text-sm text-gray-500">{manager.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleUnassignManager(manager.id)}
                disabled={unassignMutation.isPending}
                className="text-red-600 hover:text-red-700 p-1"
                title="Remove manager"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Manager Modal */}
      {showAddManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium">Add Branch Manager</h4>
              <button
                onClick={() => setShowAddManager(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Manager
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Choose a manager...</option>
                  {availableManagers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>

              {availableManagers.length === 0 && (
                <p className="text-sm text-gray-500">
                  All available branch managers are already assigned to this branch.
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddManager(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignManager}
                  disabled={!selectedManagerId || assignMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign Manager'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchManagerAssignments
