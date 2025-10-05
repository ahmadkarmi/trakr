import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, UserRole, AuditorAssignment } from '@trakr/shared'
import { api } from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline'

interface BranchAuditorAssignmentsProps {
  branchId: string
  branchName: string
}

export function BranchAuditorAssignments({ branchId, branchName }: BranchAuditorAssignmentsProps) {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAddAuditor, setShowAddAuditor] = useState(false)
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([])
  
  // Listen for custom event from sticky footer button
  useEffect(() => {
    const handleOpenAddAuditor = (event: CustomEvent) => {
      if (event.detail?.branchId === branchId) {
        setShowAddAuditor(true)
      }
    }
    
    window.addEventListener('openAddAuditor' as any, handleOpenAddAuditor as any)
    return () => window.removeEventListener('openAddAuditor' as any, handleOpenAddAuditor as any)
  }, [branchId])

  // Get current auditor assignments for this branch
  const { data: assignments = [] } = useQuery<AuditorAssignment[]>({
    queryKey: ['auditor-assignments', branchId],
    queryFn: () => api.getAuditorAssignmentsByBranch(branchId),
  })

  // Get all users
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  })

  const auditors = allUsers.filter(user => user.role === UserRole.AUDITOR)
  const assignedAuditorIds = [...new Set(assignments.map(assignment => assignment.userId))]
  const availableAuditors = auditors.filter(auditor => !assignedAuditorIds.includes(auditor.id))

  // Get assigned auditors details
  const assignedAuditors = auditors.filter(auditor => assignedAuditorIds.includes(auditor.id))

  const assignMutation = useMutation({
    mutationFn: async (auditorIds: string[]) => {
      // Assign multiple auditors to this branch
      for (const auditorId of auditorIds) {
        const auditor = auditors.find(a => a.id === auditorId)
        if (auditor) {
          const existingAssignment = await api.getAuditorAssignment(auditorId)
          const currentBranchIds = existingAssignment?.branchIds || []
          
          // Add this branch to their assignments if not already present
          if (!currentBranchIds.includes(branchId)) {
            await api.assignAuditor(auditorId, [...currentBranchIds, branchId], [])
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditor-assignments'] })
      setShowAddAuditor(false)
      setSelectedAuditorIds([])
    },
  })

  const unassignMutation = useMutation({
    mutationFn: async (auditorId: string) => {
      const assignment = await api.getAuditorAssignment(auditorId)
      if (assignment) {
        const updatedBranchIds = assignment.branchIds.filter(id => id !== branchId)
        await api.assignAuditor(auditorId, updatedBranchIds, assignment.zoneIds)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditor-assignments'] })
    },
  })

  const handleAssignAuditors = () => {
    if (selectedAuditorIds.length > 0) {
      assignMutation.mutate(selectedAuditorIds)
    }
  }

  const handleUnassignAuditor = (auditorId: string) => {
    if (window.confirm('Remove this auditor from this branch?')) {
      unassignMutation.mutate(auditorId)
    }
  }

  const toggleAuditorSelection = (auditorId: string) => {
    setSelectedAuditorIds(prev =>
      prev.includes(auditorId)
        ? prev.filter(id => id !== auditorId)
        : [...prev, auditorId]
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Assigned Auditors</h3>
        <p className="text-sm text-gray-500 mt-1">Auditors who can conduct audits at {branchName}</p>
      </div>

      {/* Current Assignments */}
      <div className="space-y-2">
        {assignedAuditors.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-600 font-medium">No auditors assigned to this branch</p>
            <p className="text-sm text-gray-500">Use the button at the bottom to assign auditors</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assignedAuditors.map(auditor => (
              <div
                key={auditor.id}
                className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{auditor.name}</p>
                    <p className="text-xs text-gray-600 truncate">{auditor.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnassignAuditor(auditor.id)}
                  disabled={unassignMutation.isPending}
                  className="text-red-600 hover:text-red-700 p-1 flex-shrink-0"
                  title="Remove auditor"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Auditor Modal */}
      {showAddAuditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium">Add Auditors to {branchName}</h4>
                <p className="text-sm text-gray-500">Select one or more auditors to assign</p>
              </div>
              <button
                onClick={() => {
                  setShowAddAuditor(false)
                  setSelectedAuditorIds([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {availableAuditors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>All available auditors are already assigned to this branch.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableAuditors.map(auditor => (
                    <label
                      key={auditor.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAuditorIds.includes(auditor.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAuditorIds.includes(auditor.id)}
                        onChange={() => toggleAuditorSelection(auditor.id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{auditor.name}</p>
                        <p className="text-sm text-gray-500 truncate">{auditor.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedAuditorIds.length > 0 && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                  <p className="text-sm text-primary-800 font-medium">
                    {selectedAuditorIds.length} auditor{selectedAuditorIds.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddAuditor(false)
                    setSelectedAuditorIds([])
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignAuditors}
                  disabled={selectedAuditorIds.length === 0 || assignMutation.isPending}
                  className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Assigning...</span>
                    </div>
                  ) : (
                    `Assign ${selectedAuditorIds.length > 0 ? selectedAuditorIds.length : ''} Auditor${selectedAuditorIds.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchAuditorAssignments
