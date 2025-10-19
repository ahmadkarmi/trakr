import { AuditStatus } from '@trakr/shared'

export interface SurveyResultRow {
  // Identifiers
  auditId: string
  surveyId: string
  surveyTitle: string
  surveyVersion: number
  branchId: string
  branchName: string
  zoneId?: string
  zoneName?: string
  auditorId: string
  auditorName: string
  
  // Metadata
  completedAt: Date
  submittedAt?: Date
  approvedAt?: Date
  status: AuditStatus
  periodStart: Date
  periodEnd: Date
  
  // Scores
  totalQuestions: number
  answeredQuestions: number
  yesCount: number
  noCount: number
  naCount: number
  unansweredCount: number
  complianceScore: number // Weighted compliance percentage for the survey (primary metric)
  completionPercentage: number
  weightedScore?: number // Duplicate of complianceScore for explicitness in some views
  
  // Question-level responses (dynamic)
  [key: `q_${string}`]: 'yes' | 'no' | 'n/a' | string
}

export interface AnalyticsFilters {
  surveyId?: string
  dateRange: {
    start: Date
    end: Date
  }
  zoneIds: string[]
  branchIds: string[]
  auditorIds: string[]
  statuses: AuditStatus[]
  minScore?: number
  maxScore?: number
}

export interface SurveyResultsStats {
  totalAudits: number
  avgComplianceScore: number
  avgWeightedScore?: number
  totalBranches: number
  totalAuditors: number
  passRate: number // % with score >= threshold
  trendDirection: 'up' | 'down' | 'stable'
  trendPercentage: number
}

export interface QuestionAnalysis {
  questionId: string
  questionText: string
  sectionTitle: string
  totalResponses: number
  yesCount: number
  noCount: number
  naCount: number
  passRate: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface BranchPerformance {
  branchId: string
  branchName: string
  zoneName?: string
  totalAudits: number
  avgScore: number
  trend: 'up' | 'down' | 'stable'
  lastAuditDate: Date
  passRate: number
}

export type ChartType = 'trends' | 'branches' | 'questions' | 'heatmap' | 'distribution'
export type ExportFormat = 'excel' | 'pdf' | 'csv'
