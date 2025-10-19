import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useOrganization } from '../contexts/OrganizationContext'
import { Survey } from '@trakr/shared'
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  FunnelIcon, 
  ArrowDownTrayIcon,
  ArrowPathIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

const AdvancedAnalytics: React.FC = () => {
  const navigate = useNavigate()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)

  // Determine data scope
  const isGlobalView = isSuperAdmin && !effectiveOrgId
  
  // Fetch surveys (respects Super Admin global vs org-specific view)
  const { data: surveys = [], isLoading: loadingSurveys } = useQuery<Survey[]>({
    queryKey: ['surveys', effectiveOrgId],
    queryFn: () => (api as any).getSurveys(effectiveOrgId), // undefined = all surveys for Super Admin
    enabled: !!effectiveOrgId || isSuperAdmin
  })

  // Auto-select first survey
  React.useEffect(() => {
    if (!selectedSurveyId && surveys.length > 0) {
      setSelectedSurveyId(surveys[0].id)
    }
  }, [surveys, selectedSurveyId])

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId)

  if (loadingSurveys) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Surveys Available</h3>
        <p className="text-gray-600 mb-6">Create survey templates to start analyzing results</p>
        <button
          onClick={() => navigate('/surveys')}
          className="btn btn-primary"
        >
          Create Survey Template
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Survey Results Explorer</h1>
            <p className="text-gray-600 mt-1">
              Deep-dive analysis with Excel-like data grid and interactive visualizations
            </p>
            {isGlobalView && (
              <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                <GlobeAltIcon className="w-4 h-4" />
                <span className="font-medium">Global View - All Organizations</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline btn-sm">
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Survey Selector */}
        <div className="card p-4 sm:p-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Select Survey
            </label>
            <select
              value={selectedSurveyId || ''}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="input w-full md:w-96"
            >
              {surveys.map(survey => (
                <option key={survey.id} value={survey.id}>
                  {survey.title} ({survey.sections?.length || 0} sections)
                </option>
              ))}
            </select>
            {selectedSurvey && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedSurvey.description}
              </p>
            )}
        </div>

        {/* Coming Soon Notice */}
        <div className="card bg-blue-50 border-blue-200 p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  🚀 Advanced Analytics Dashboard
                </h3>
                <p className="text-blue-800 mb-4">
                  This powerful analytics platform is being built with enterprise-grade tools:
                </p>
                
                {/* Access Level Info */}
                <div className="bg-white rounded-lg p-3 mb-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">📊 Data Access</h4>
                  <p className="text-sm text-blue-800">
                    {isSuperAdmin ? (
                      effectiveOrgId ? (
                        <>
                          <strong>Super Admin (Organization View):</strong> Viewing data for selected organization only
                        </>
                      ) : (
                        <>
                          <strong>Super Admin (Global View):</strong> Viewing data across all organizations
                        </>
                      )
                    ) : (
                      <>
                        <strong>Admin:</strong> Viewing data for your organization only
                      </>
                    )}
                  </p>
                </div>
                <ul className="space-y-2 text-blue-900 mb-4">
                  <li className="flex items-start gap-2">
                    <TableCellsIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>AG Grid:</strong> Excel-like data grid with filtering, sorting, pivoting, and grouping</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChartBarIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Plotly.js:</strong> Interactive data science charts with zoom, pan, and export</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FunnelIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Advanced Filters:</strong> Date ranges, zones, branches, auditors, and score thresholds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowDownTrayIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Export:</strong> Excel, PDF, and CSV with one click</span>
                  </li>
                </ul>
                
                <div className="bg-white rounded-lg p-4 border border-blue-300">
                  <h4 className="font-semibold text-blue-900 mb-2">Features Being Implemented:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                    <div>✓ Survey results data grid</div>
                    <div>✓ Question-level analysis</div>
                    <div>✓ Compliance trend charts</div>
                    <div>✓ Branch performance heatmap</div>
                    <div>✓ Auditor productivity stats</div>
                    <div>✓ Issue tracking dashboard</div>
                    <div>✓ Time-series forecasting</div>
                    <div>✓ Custom report builder</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                  <p className="text-sm text-green-900">
                    <strong>✅ Ready to Build:</strong> All dependencies installed! The full AG Grid + Plotly.js implementation is ready to be developed.
                  </p>
                </div>
              </div>
            </div>
        </div>

        {/* Quick Stats Preview */}
        {selectedSurvey && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 sm:p-6">
                <div className="text-sm text-gray-600 mb-1">Total Questions</div>
                <div className="text-2xl font-bold text-gray-900">
                  {selectedSurvey.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0}
                </div>
            </div>
            <div className="card p-4 sm:p-6">
                <div className="text-sm text-gray-600 mb-1">Sections</div>
                <div className="text-2xl font-bold text-gray-900">
                  {selectedSurvey.sections?.length || 0}
                </div>
            </div>
            <div className="card p-4 sm:p-6">
                <div className="text-sm text-gray-600 mb-1">Frequency</div>
                <div className="text-lg font-semibold text-gray-900">
                  {selectedSurvey.frequency?.replace('_', ' ') || 'Unlimited'}
                </div>
            </div>
            <div className="card p-4 sm:p-6">
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedSurvey.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-lg font-semibold text-gray-900">
                    {selectedSurvey.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default AdvancedAnalytics
