import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useOrganization } from '../contexts/OrganizationContext'
import { Survey, AuditStatus, Branch, Zone, QuestionType, calculateWeightedAuditScore } from '@trakr/shared'
import { SurveyResultRow, AnalyticsFilters as FiltersType } from '../types/analytics'
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  ArrowDownTrayIcon,
  ArrowPathIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import SurveyResultsGrid from '../components/analytics/SurveyResultsGrid'
import SurveyCharts from '../components/analytics/SurveyCharts'
import AnalyticsFilters from '../components/analytics/AnalyticsFilters'
import { exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils'

const AdvancedAnalyticsComplete: React.FC = () => {
  const navigate = useNavigate()
  const { effectiveOrgId, isSuperAdmin } = useOrganization()
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'grid' | 'trends' | 'branches' | 'questions' | 'heatmap'>('grid')

  // Initialize filters
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      start: new Date(new Date().setMonth(new Date().getMonth() - 3)),
      end: new Date()
    },
    zoneIds: [],
    branchIds: [],
    auditorIds: [],
    statuses: ['APPROVED' as AuditStatus, 'COMPLETED' as AuditStatus]
  })

  // Determine data scope
  const isGlobalView = isSuperAdmin && !effectiveOrgId
  
  // Fetch surveys
  const { data: surveys = [], isLoading: loadingSurveys } = useQuery<Survey[]>({
    queryKey: ['surveys', effectiveOrgId],
    queryFn: () => (api as any).getSurveys(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin
  })

  // Fetch branches/zones for filters (org-scoped for Admin, global for Super Admin if no org selected)
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches', effectiveOrgId],
    queryFn: () => (api as any).getBranches(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ['zones', effectiveOrgId],
    queryFn: () => (api as any).getZones(effectiveOrgId),
    enabled: !!effectiveOrgId || isSuperAdmin,
  })

  // Auto-select first survey
  React.useEffect(() => {
    if (!selectedSurveyId && surveys.length > 0) {
      setSelectedSurveyId(surveys[0].id)
    }
  }, [surveys, selectedSurveyId])

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId)

  // Fetch survey results
  const { data: rawResults = [], isLoading: loadingResults, refetch } = useQuery({
    queryKey: ['survey-results', selectedSurveyId, filters, effectiveOrgId],
    queryFn: () => selectedSurveyId ? (api as any).getSurveyResults(selectedSurveyId, {
      dateStart: filters.dateRange.start,
      dateEnd: filters.dateRange.end,
      branchIds: filters.branchIds,
      zoneIds: filters.zoneIds,
      statuses: filters.statuses,
      orgId: effectiveOrgId
    }) : Promise.resolve([]),
    enabled: !!selectedSurveyId && !!selectedSurvey
  })

  // Transform raw results to SurveyResultRow format
  const results: SurveyResultRow[] = useMemo(() => {
    if (!selectedSurvey) return []
    
    return rawResults.map((audit: any) => {
      const responses: Record<string, string> = audit.responses || {}
      const allQuestions = selectedSurvey.sections?.flatMap(s => s.questions || []) || []
      
      let yesCount = 0
      let noCount = 0
      let naCount = 0
      let answeredQuestions = 0
      const totalQuestions = allQuestions.length

      // Build question responses and counts
      const questionResponses: any = {}
      for (const q of allQuestions) {
        const raw = responses[q.id] ?? ''
        const lower = typeof raw === 'string' ? raw.toLowerCase() : ''
        if (lower === 'yes') yesCount++
        else if (lower === 'no') noCount++
        else if (lower === 'na' || lower === 'n/a') naCount++

        // Determine answered for non-YES/NO
        let answered = false
        if (q.type === QuestionType.CHECKBOX) {
          try {
            const arr = JSON.parse(raw)
            answered = Array.isArray(arr) && arr.length > 0
          } catch {
            answered = !!raw
          }
        } else {
          answered = !!raw
        }
        if (answered) answeredQuestions++

        // Format display value for grid
        let display: string = raw || '-'
        if (q.type === QuestionType.CHECKBOX) {
          try {
            const arr = JSON.parse(raw)
            if (Array.isArray(arr)) display = arr.join(', ')
          } catch {}
        }
        questionResponses[`q_${q.id}`] = display
      }

      // Weighted compliance score for the survey (primary metric)
      const tmpAudit: any = { responses, overrideScores: audit.override_scores || {} }
      const weighted = calculateWeightedAuditScore(tmpAudit, selectedSurvey)
      const complianceScore = Math.round(weighted.weightedCompliancePercentage)

      return {
        auditId: audit.id,
        surveyId: audit.survey_id,
        surveyTitle: selectedSurvey.title,
        surveyVersion: (audit as any).survey_version ?? selectedSurvey.version,
        branchId: audit.branch_id,
        branchName: audit.branch?.name || 'Unknown',
        zoneId: undefined,
        zoneName: undefined,
        auditorId: audit.assigned_to,
        auditorName: audit.auditor?.full_name || 'Unknown',
        completedAt: new Date(audit.updated_at),
        submittedAt: audit.submitted_at ? new Date(audit.submitted_at) : undefined,
        approvedAt: audit.approved_at ? new Date(audit.approved_at) : undefined,
        status: audit.status,
        periodStart: new Date(audit.period_start),
        periodEnd: new Date(audit.period_end),
        totalQuestions,
        answeredQuestions,
        yesCount,
        noCount,
        naCount,
        unansweredCount: totalQuestions - answeredQuestions,
        complianceScore,
        weightedScore: weighted.weightedCompliancePercentage,
        completionPercentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
        ...questionResponses
      } as SurveyResultRow
    })
  }, [rawResults, selectedSurvey])

  // Calculate stats
  const stats = useMemo(() => {
    if (results.length === 0) return null
    return {
      totalAudits: results.length,
      avgScore: Math.round(results.reduce((sum, r) => sum + r.complianceScore, 0) / results.length),
      passRate: Math.round((results.filter(r => r.complianceScore >= 75).length / results.length) * 100),
      totalBranches: new Set(results.map(r => r.branchId)).size
    }
  }, [results])

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
          <button onClick={() => refetch()} className="btn btn-outline btn-sm">
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
    </div>

    {/* Analytics Filters */}
    {selectedSurvey && (
      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        branches={branches.map(b => ({ id: b.id, name: (b as any).name || (b as any).title || 'Branch' }))}
        zones={zones.map(z => ({ id: z.id, name: (z as any).name || (z as any).title || 'Zone' }))}
      />
    )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 sm:p-6">
              <div className="text-sm text-gray-600 mb-1">Total Audits</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalAudits}</div>
          </div>
          <div className="card p-4 sm:p-6">
              <div className="text-sm text-gray-600 mb-1">Average Score</div>
              <div className="text-2xl font-bold text-gray-900">{stats.avgScore}%</div>
          </div>
          <div className="card p-4 sm:p-6">
              <div className="text-sm text-gray-600 mb-1">Pass Rate (≥75%)</div>
              <div className="text-2xl font-bold text-gray-900">{stats.passRate}%</div>
          </div>
          <div className="card p-4 sm:p-6">
              <div className="text-sm text-gray-600 mb-1">Branches</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalBranches}</div>
          </div>
        </div>
      )}

      {/* View Selector */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('grid')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeView === 'grid' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <TableCellsIcon className="w-4 h-4 inline mr-2" />
          Data Grid
        </button>
        <button
          onClick={() => setActiveView('trends')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeView === 'trends' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveView('branches')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeView === 'branches' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Branches
        </button>
        <button
          onClick={() => setActiveView('questions')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeView === 'questions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Questions
        </button>
        <button
          onClick={() => setActiveView('heatmap')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeView === 'heatmap' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Heatmap
        </button>
      </div>

      {/* Content */}
      {selectedSurvey && (
        <>
          {activeView === 'grid' && (
            <SurveyResultsGrid 
              survey={selectedSurvey} 
              results={results}
              isLoading={loadingResults}
            />
          )}
          
          {activeView !== 'grid' && results.length > 0 && (
            <SurveyCharts
              survey={selectedSurvey}
              results={results}
              activeChart={activeView}
            />
          )}

          {/* Export Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => void exportToExcel(results, selectedSurvey.title)}
              className="btn btn-outline btn-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={() => exportToCSV(results, selectedSurvey.title)}
              className="btn btn-outline btn-sm"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportToPDF(results, selectedSurvey.title)}
              className="btn btn-outline btn-sm"
            >
              Export PDF
            </button>
          </div>
        </>
      )}

      {loadingResults && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}

export default AdvancedAnalyticsComplete
