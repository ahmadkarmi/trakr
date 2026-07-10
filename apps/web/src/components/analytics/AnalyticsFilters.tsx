import React, { useState } from 'react'
import { DateRange } from 'react-date-range'
import { AuditStatus } from '@trakr/shared'
import { AnalyticsFilters as FiltersType } from '../../types/analytics'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'

interface AnalyticsFiltersProps {
  filters: FiltersType
  onChange: (filters: FiltersType) => void
  branches?: Array<{ id: string; name: string }>
  zones?: Array<{ id: string; name: string }>
  auditors?: Array<{ id: string; name: string }>
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onChange,
  branches = [],
  zones = []
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleDateChange = (ranges: any) => {
    onChange({
      ...filters,
      dateRange: {
        start: ranges.selection.startDate,
        end: ranges.selection.endDate
      }
    })
  }

  const handleStatusToggle = (status: AuditStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    onChange({ ...filters, statuses: newStatuses })
  }

  const clearFilters = () => {
    onChange({
      dateRange: {
        start: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        end: new Date()
      },
      zoneIds: [],
      branchIds: [],
      auditorIds: [],
      statuses: [AuditStatus.APPROVED, AuditStatus.COMPLETED],
      minScore: undefined,
      maxScore: undefined
    })
  }

  const activeFilterCount = 
    filters.branchIds.length +
    filters.zoneIds.length +
    filters.auditorIds.length +
    (filters.minScore !== undefined ? 1 : 0) +
    (filters.maxScore !== undefined ? 1 : 0)

  return (
    <div className="card p-4 sm:p-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="btn btn-link btn-sm flex items-center gap-1"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="input text-left"
            >
              {filters.dateRange.start.toLocaleDateString()} - {filters.dateRange.end.toLocaleDateString()}
            </button>
            {showDatePicker && (
              <div className="absolute z-50 mt-2 bg-white shadow-lg rounded-lg border border-gray-200">
                <DateRange
                  ranges={[{
                    startDate: filters.dateRange.start,
                    endDate: filters.dateRange.end,
                    key: 'selection'
                  }]}
                  onChange={handleDateChange}
                  months={2}
                  direction="horizontal"
                />
                <div className="p-2 border-t">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="btn btn-primary btn-sm w-full"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Zones */}
          {zones.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zones ({filters.zoneIds.length} selected)
              </label>
              <select
                multiple
                value={filters.zoneIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  onChange({ ...filters, zoneIds: selected })
                }}
                className="input text-sm"
                size={3}
              >
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Branches */}
          {branches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branches ({filters.branchIds.length} selected)
              </label>
              <select
                multiple
                value={filters.branchIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  onChange({ ...filters, branchIds: selected })
                }}
                className="input text-sm"
                size={3}
              >
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="space-y-2">
              {[AuditStatus.APPROVED, AuditStatus.COMPLETED, AuditStatus.SUBMITTED].map(status => (
                <label key={status} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status)}
                    onChange={() => handleStatusToggle(status)}
                    className="rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{status}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Score Range */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Score (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.minScore ?? ''}
              onChange={(e) => onChange({ 
                ...filters, 
                minScore: e.target.value ? Number(e.target.value) : undefined 
              })}
              className="input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Score (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.maxScore ?? ''}
              onChange={(e) => onChange({ 
                ...filters, 
                maxScore: e.target.value ? Number(e.target.value) : undefined 
              })}
              className="input"
              placeholder="100"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsFilters
