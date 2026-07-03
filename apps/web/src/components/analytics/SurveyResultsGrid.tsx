import React, { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { AgGridReactProps } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Survey } from '@trakr/shared'
import { SurveyResultRow } from '../../types/analytics'
import { ColDef } from 'ag-grid-community'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

interface SurveyResultsGridProps {
  survey: Survey
  results: SurveyResultRow[]
  isLoading?: boolean
  onExport?: (format: 'excel' | 'csv') => void
}

const SurveyResultsGrid: React.FC<SurveyResultsGridProps> = ({ 
  survey, 
  results,
  isLoading = false,
}) => {
  // Generate dynamic columns based on survey questions
  const columnDefs = useMemo<ColDef[]>(() => {
    const baseCols: ColDef[] = [
      { 
        field: 'branchName', 
        headerName: 'Branch', 
        pinned: 'left',
        filter: 'agTextColumnFilter',
        width: 120,
        cellStyle: { fontWeight: '500' }
      },
      { 
        field: 'completedAt', 
        headerName: 'Date',
        filter: 'agDateColumnFilter',
        valueFormatter: (params) => {
          if (!params.value) return ''
          return new Date(params.value).toLocaleDateString()
        },
        width: 100
      },
      {
        field: 'surveyVersion',
        headerName: 'Version',
        filter: 'agNumberColumnFilter',
        width: 100,
      },
      { 
        field: 'auditorName', 
        headerName: 'Auditor',
        filter: 'agTextColumnFilter',
        width: 100
      },
    ]

    // Add question columns
    const questionCols: ColDef[] = survey.sections?.flatMap(section => 
      section.questions?.map((q, idx) => ({
        field: `q_${q.id}`,
        headerName: `${section.title} - Q${idx + 1}`,
        headerTooltip: q.text,
        filter: 'agTextColumnFilter',
        width: 100,
        cellStyle: (params: any) => {
          const value = (params.value ?? '').toString().toLowerCase()
          if (value === 'no') return { backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: '500' }
          if (value === 'yes') return { backgroundColor: '#d1fae5', color: '#065f46', fontWeight: '500' }
          if (value === 'n/a' || value === 'na') return { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '500' }
          return null
        },
        cellRenderer: (params: any) => {
          if (params.value == null || params.value === '') return '-'
          const raw = params.value.toString()
          const lower = raw.toLowerCase()
          if (lower === 'yes') return '✓'
          if (lower === 'no') return '✗'
          if (lower === 'n/a' || lower === 'na') return 'N/A'
          // Other types: display the value as-is (dates, text, numbers, choices, checkbox list)
          return raw
        }
      })) || []
    ) || []

    // Add score column
    const scoreCols: ColDef[] = [
      { 
        field: 'complianceScore', 
        headerName: 'Score',
        filter: 'agNumberColumnFilter',
        valueFormatter: (params) => params.value != null ? `${params.value}%` : '-',
        width: 100,
        pinned: 'right',
        cellStyle: (params) => {
          const score = params.value
          if (score >= 90) return { backgroundColor: '#4ade80', color: 'white', fontWeight: 'bold', textAlign: 'center' }
          if (score >= 75) return { backgroundColor: '#fbbf24', color: 'white', fontWeight: 'bold', textAlign: 'center' }
          if (score >= 60) return { backgroundColor: '#fb923c', color: 'white', fontWeight: 'bold', textAlign: 'center' }
          return { backgroundColor: '#f87171', color: 'white', fontWeight: 'bold', textAlign: 'center' }
        }
      },
      { 
        field: 'status', 
        headerName: 'Status',
        filter: 'agTextColumnFilter',
        width: 100,
        pinned: 'right',
        cellStyle: (params) => {
          if (params.value === 'APPROVED') return { color: '#059669', fontWeight: '500' }
          if (params.value === 'COMPLETED') return { color: '#0284c7', fontWeight: '500' }
          return { color: '#6b7280', fontWeight: '500' }
        }
      }
    ]

    return [...baseCols, ...questionCols, ...scoreCols]
  }, [survey])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    width: 100,
  }), [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
        {/* Casts below: ag-grid-react 34.2 bundles its own ag-grid-community typings,
            structurally incompatible with the root ag-grid-community 34.3 */}
        <AgGridReact
          rowData={results}
          columnDefs={columnDefs as unknown as AgGridReactProps['columnDefs']}
          defaultColDef={defaultColDef as unknown as AgGridReactProps['defaultColDef']}
          theme="legacy"
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          animateRows={true}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{results.length} audit results</span>
        <span>
          Tip: Click column headers to sort, use filters to narrow results
        </span>
      </div>
    </div>
  )
}

export default SurveyResultsGrid
