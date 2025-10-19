import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useOrganization } from '../contexts/OrganizationContext'
import { BuildingOfficeIcon, CheckCircleIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface BranchSelectorProps {
  selectedBranchIds: string[]
  onChange: (branchIds: string[]) => void
  label?: string
  description?: string
}

type SelectionMode = 'all' | 'specific'

const BranchSelector: React.FC<BranchSelectorProps> = ({ 
  selectedBranchIds, 
  onChange,
  label = 'Branch Selection',
  description = 'Choose which branches this survey applies to'
}) => {
  const { effectiveOrgId } = useOrganization()
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(
    selectedBranchIds.length === 0 ? 'all' : 'specific'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)

  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', effectiveOrgId],
    queryFn: () => api.getBranches(effectiveOrgId!),
    enabled: !!effectiveOrgId
  })

  // Fetch zones
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['zones', effectiveOrgId],
    queryFn: () => api.getZones(effectiveOrgId!),
    enabled: !!effectiveOrgId
  })

  const isLoading = branchesLoading || zonesLoading

  // Create map of branch -> zone for quick lookup
  const branchToZone = useMemo(() => {
    const map = new Map<string, string>()
    zones.forEach(zone => {
      zone.branchIds.forEach(branchId => {
        map.set(branchId, zone.id)
      })
    })
    return map
  }, [zones])

  // Group branches by zone
  const branchesByZone = useMemo(() => {
    const map = new Map<string | null, typeof branches>()
    branches.forEach(branch => {
      const zoneId = branchToZone.get(branch.id) || null
      if (!map.has(zoneId)) {
        map.set(zoneId, [])
      }
      map.get(zoneId)!.push(branch)
    })
    return map
  }, [branches, branchToZone])

  // Filter branches by search query and zone
  const filteredBranches = useMemo(() => {
    let result = branches

    // Filter by zone
    if (selectedZoneId) {
      result = result.filter(branch => branchToZone.get(branch.id) === selectedZoneId)
    }

    // Filter by search
    if (searchQuery) {
      result = result.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return result
  }, [branches, selectedZoneId, searchQuery, branchToZone])

  const handleModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode)
    if (mode === 'all') {
      onChange([]) // Empty array means "all branches"
    } else {
      // Start with all branches selected when switching to specific mode
      onChange(branches.map(b => b.id))
    }
  }

  const handleBranchToggle = (branchId: string) => {
    const isSelected = selectedBranchIds.includes(branchId)
    if (isSelected) {
      onChange(selectedBranchIds.filter(id => id !== branchId))
    } else {
      onChange([...selectedBranchIds, branchId])
    }
  }

  const handleSelectAll = () => {
    // If zone filter is active, only select branches in that zone
    if (selectedZoneId) {
      const branchesInZone = branches.filter(b => branchToZone.get(b.id) === selectedZoneId)
      const newSelection = [...new Set([...selectedBranchIds, ...branchesInZone.map(b => b.id)])]
      onChange(newSelection)
    } else {
      onChange(branches.map(b => b.id))
    }
  }

  const handleDeselectAll = () => {
    // If zone filter is active, only deselect branches in that zone
    if (selectedZoneId) {
      const branchesInZone = branches.filter(b => branchToZone.get(b.id) === selectedZoneId)
      const branchIdsInZone = new Set(branchesInZone.map(b => b.id))
      onChange(selectedBranchIds.filter(id => !branchIdsInZone.has(id)))
    } else {
      onChange([])
    }
  }

  const selectedCount = selectionMode === 'all' ? branches.length : selectedBranchIds.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      {/* Mode Selection */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => handleModeChange('all')}
          className={`w-full sm:flex-1 px-4 py-3 rounded-xl border-2 transition-all shadow-sm ${
            selectionMode === 'all'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5" />
            <span className="font-medium">All Branches</span>
          </div>
          <p className="text-xs mt-1 opacity-80">
            Apply to all {branches.length} branches
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('specific')}
          className={`w-full sm:flex-1 px-4 py-3 rounded-xl border-2 transition-all shadow-sm ${
            selectionMode === 'specific'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">Select Branches</span>
          </div>
          <p className="text-xs mt-1 opacity-80">
            Choose specific branches
          </p>
        </button>
      </div>

      {/* Specific Branch Selection */}
      {selectionMode === 'specific' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {/* Search and Actions */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search branches..."
                  className="input pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Zone Filter */}
            {zones.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-700">Filter by zone:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedZoneId(null)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedZoneId === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All Zones ({branches.length})
                  </button>
                  {zones.map(zone => {
                    const count = branchesByZone.get(zone.id)?.length || 0
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setSelectedZoneId(zone.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          selectedZoneId === zone.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {zone.name} ({count})
                      </button>
                    )
                  })}
                  {selectedZoneId && (
                    <button
                      type="button"
                      onClick={() => setSelectedZoneId(null)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Clear zone filter"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedCount} of {selectedZoneId ? filteredBranches.length : branches.length} selected
                {selectedZoneId && ` in ${zones.find(z => z.id === selectedZoneId)?.name}`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Branch List */}
          <div className="max-h-72 sm:max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading branches...
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">No branches found</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try a different search term' : 'Create branches first'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredBranches.map((branch) => {
                  const isSelected = selectedBranchIds.includes(branch.id)
                  return (
                    <label
                      key={branch.id}
                      className={`flex items-center gap-3 p-3 sm:p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleBranchToggle(branch.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {branch.name}
                          </span>
                        </div>
                        {branch.address && (
                          <p className="text-sm text-gray-600 truncate mt-0.5">
                            {branch.address}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900">
          <span className="font-medium">
            {selectionMode === 'all' 
              ? `This survey will apply to all branches (${branches.length} total)` 
              : `This survey will apply to ${selectedCount} selected branch${selectedCount !== 1 ? 'es' : ''}`
            }
          </span>
          {selectionMode === 'all' && (
            <span className="block text-xs text-blue-700 mt-1">
              Including any branches created in the future
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

export default BranchSelector
