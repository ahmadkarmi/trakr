import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, UserRole, Zone, Branch, AuditorAssignment } from '@trakr/shared'
import { api } from '../utils/api'
import { XMarkIcon, UserIcon, MapIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'

interface ZoneBulkAuditorAssignmentProps {
  orgId: string
  onClose: () => void
}

export function ZoneBulkAuditorAssignment({ orgId, onClose }: ZoneBulkAuditorAssignmentProps) {
  const queryClient = useQueryClient()
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([])

  // Fetch data
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ['zones', orgId],
    queryFn: () => api.getZones(orgId),
  })

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches', orgId],
    queryFn: () => api.getBranches(orgId),
  })

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users', orgId],
    queryFn: () => (api as any).getUsers(orgId),
    enabled: !!orgId,
  })

  const auditors = allUsers.filter(user => user.role === UserRole.AUDITOR)

  // Get selected zone details
  const selectedZone = zones.find(z => z.id === selectedZoneId)
  const zoneBranches = selectedZone
    ? branches.filter(b => selectedZone.branchIds.includes(b.id))
    : []

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ zoneId, auditorIds }: { zoneId: string; auditorIds: string[] }) => {
      const zone = zones.find(z => z.id === zoneId)
      if (!zone) throw new Error('Zone not found')

      // For each selected auditor
      for (const auditorId of auditorIds) {
        // Get current assignment
        const existingAssignment = await api.getAuditorAssignment(auditorId)
        const currentBranchIds = existingAssignment?.branchIds || []
        const currentZoneIds = existingAssignment?.zoneIds || []

        // Add all branches in this zone to their assignments
        const newBranchIds = [...new Set([...currentBranchIds, ...zone.branchIds])]
        
        // Add this zone to their zone assignments
        const newZoneIds = currentZoneIds.includes(zoneId)
          ? currentZoneIds
          : [...currentZoneIds, zoneId]

        await api.assignAuditor(auditorId, newBranchIds, newZoneIds)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditor-assignments'] })
      onClose()
    },
  })

  const handleBulkAssign = () => {
    if (selectedZoneId && selectedAuditorIds.length > 0) {
      bulkAssignMutation.mutate({ zoneId: selectedZoneId, auditorIds: selectedAuditorIds })
    }
  }

  const toggleAuditorSelection = (auditorId: string) => {
    setSelectedAuditorIds(prev =>
      prev.includes(auditorId)
        ? prev.filter(id => id !== auditorId)
        : [...prev, auditorId]
    )
  }

  const selectAllAuditors = () => {
    setSelectedAuditorIds(auditors.map(a => a.id))
  }

  const deselectAllAuditors = () => {
    setSelectedAuditorIds([])
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MapIcon className="w-6 h-6 text-blue-600" />
                Bulk Assign Auditors by Zone
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Assign multiple auditors to all branches in a zone at once
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Select Zone */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                1
              </div>
              <h4 className="text-lg font-medium text-gray-900">Select Zone</h4>
            </div>

            {zones.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  No zones found. Please create zones first before bulk assigning.
                </p>
              </div>
            ) : (
              <select
                value={selectedZoneId}
                onChange={(e) => {
                  setSelectedZoneId(e.target.value)
                  setSelectedAuditorIds([]) // Reset auditor selection when zone changes
                }}
                className="input w-full"
              >
                <option value="">Choose a zone...</option>
                {zones.map(zone => {
                  const branchCount = zone.branchIds.length
                  return (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} ({branchCount} branch{branchCount !== 1 ? 'es' : ''})
                    </option>
                  )
                })}
              </select>
            )}

            {/* Show zone details */}
            {selectedZone && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      {zoneBranches.length} branch{zoneBranches.length !== 1 ? 'es' : ''} in this zone:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {zoneBranches.map(branch => (
                        <span
                          key={branch.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          {branch.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Select Auditors */}
          {selectedZoneId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    2
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Select Auditors</h4>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllAuditors}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAllAuditors}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {auditors.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    No auditors found. Please create auditor users first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                  {auditors.map(auditor => (
                    <label
                      key={auditor.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAuditorIds.includes(auditor.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAuditorIds.includes(auditor.id)}
                        onChange={() => toggleAuditorSelection(auditor.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{auditor.name}</p>
                        <p className="text-xs text-gray-500 truncate">{auditor.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedAuditorIds.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    ✓ {selectedAuditorIds.length} auditor{selectedAuditorIds.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {selectedAuditorIds.length > 1 ? 'They' : 'This auditor'} will be assigned to all {zoneBranches.length} branches in "{selectedZone?.name}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn-outline"
              disabled={bulkAssignMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAssign}
              disabled={!selectedZoneId || selectedAuditorIds.length === 0 || bulkAssignMutation.isPending}
              className="flex-1 btn-primary"
            >
              {bulkAssignMutation.isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Assigning...</span>
                </div>
              ) : (
                `Assign ${selectedAuditorIds.length > 0 ? selectedAuditorIds.length : ''} to Zone`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ZoneBulkAuditorAssignment
