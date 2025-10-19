import { useMemo } from 'react'
import { Audit, Survey, QuestionType } from '@trakr/shared'

export interface SectionProgress {
  sectionId: string
  sectionTitle: string
  total: number
  answered: number
  percent: number
  isComplete: boolean
}

export interface AuditProgress {
  totalQuestions: number
  answeredQuestions: number
  completionPercent: number
  sectionProgress: SectionProgress[]
  isComplete: boolean
  nextUnanswered: { sectionId: string; sectionTitle: string; questionId: string } | null
}

/**
 * Hook to efficiently track audit completion progress
 * Uses memoization to avoid recalculating on every render
 */
export function useAuditProgress(audit: Audit | null, survey: Survey | null): AuditProgress {
  return useMemo(() => {
    // Default empty state
    if (!audit || !survey) {
      return {
        totalQuestions: 0,
        answeredQuestions: 0,
        completionPercent: 0,
        sectionProgress: [],
        isComplete: false,
        nextUnanswered: null,
      }
    }

    const answers = (audit as any).responses || {}
    
    // Calculate overall progress
    const totalQuestions = survey.sections.reduce((sum, section) => sum + section.questions.length, 0)

    const isAnswered = (qId: string): boolean => {
      const q = survey.sections.flatMap(s => s.questions).find(qq => qq.id === qId)
      const raw = answers[qId]
      if (!q) return raw !== undefined && raw !== null && String(raw) !== ''
      if (raw === undefined || raw === null) return false
      if (q.type === QuestionType.YES_NO) {
        if (typeof raw === 'boolean') return true
        const v = String(raw).toLowerCase()
        return v === 'yes' || v === 'no' || v === 'na'
      }
      if (q.type === QuestionType.CHECKBOX) {
        if (Array.isArray(raw)) return raw.length > 0
        try { const arr = JSON.parse(String(raw) || '[]'); return Array.isArray(arr) && arr.length > 0 } catch { return false }
      }
      // TEXT, NUMBER, DATE, MULTIPLE_CHOICE
      return String(raw).trim().length > 0
    }

    const answeredQuestions = survey.sections.reduce((acc, section) => {
      return acc + section.questions.filter(q => isAnswered(q.id)).length
    }, 0)
    
    const completionPercent = totalQuestions > 0 
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0
    
    // Calculate section-level progress
    const sectionProgress: SectionProgress[] = survey.sections.map(section => {
      const sectionQuestions = section.questions.map(q => q.id)
      const sectionAnswered = sectionQuestions.filter(qId => isAnswered(qId)).length

      const percent = sectionQuestions.length > 0
        ? Math.round((sectionAnswered / sectionQuestions.length) * 100)
        : 0

      return {
        sectionId: section.id,
        sectionTitle: section.title,
        total: sectionQuestions.length,
        answered: sectionAnswered,
        percent,
        isComplete: percent === 100,
      }
    })
    
    // Find next unanswered question
    const nextUnanswered = findNextUnanswered(survey, answers)
    
    return {
      totalQuestions,
      answeredQuestions,
      completionPercent,
      sectionProgress,
      isComplete: completionPercent === 100,
      nextUnanswered,
    }
  }, [audit?.responses, survey])
}

/**
 * Find the first unanswered question to help guide the user
 */
function findNextUnanswered(
  survey: Survey,
  answers: Record<string, any>
): { sectionId: string; sectionTitle: string; questionId: string } | null {
  for (const section of survey.sections) {
    for (const question of section.questions) {
      const raw = answers[question.id]
      const unanswered = (() => {
        if (raw === undefined || raw === null) return true
        if (question.type === QuestionType.YES_NO) {
          if (typeof raw === 'boolean') return false
          const v = String(raw).toLowerCase()
          return !(v === 'yes' || v === 'no' || v === 'na')
        }
        if (question.type === QuestionType.CHECKBOX) {
          if (Array.isArray(raw)) return raw.length === 0
          try { const arr = JSON.parse(String(raw) || '[]'); return !(Array.isArray(arr) && arr.length > 0) } catch { return true }
        }
        return String(raw).trim().length === 0
      })()
      if (unanswered) {
        return {
          sectionId: section.id,
          sectionTitle: section.title,
          questionId: question.id,
        }
      }
    }
  }
  return null
}

/**
 * Helper hook to get just the completion percentage (lighter weight)
 */
export function useAuditCompletionPercent(audit: Audit | null, survey: Survey | null): number {
  return useMemo(() => {
    if (!audit || !survey) return 0

    const totalQuestions = survey.sections.reduce((sum, section) => sum + section.questions.length, 0)
    if (totalQuestions === 0) return 0

    const answers = (audit as any).responses || {}
    const answered = survey.sections.reduce((acc, section) => {
      const n = section.questions.filter(q => {
        const raw = answers[q.id]
        if (raw === undefined || raw === null) return false
        if (q.type === QuestionType.YES_NO) {
          if (typeof raw === 'boolean') return true
          const v = String(raw).toLowerCase()
          return v === 'yes' || v === 'no' || v === 'na'
        }
        if (q.type === QuestionType.CHECKBOX) {
          if (Array.isArray(raw)) return raw.length > 0
          try { const arr = JSON.parse(String(raw) || '[]'); return Array.isArray(arr) && arr.length > 0 } catch { return false }
        }
        return String(raw).trim().length > 0
      }).length
      return acc + n
    }, 0)

    return Math.round((answered / totalQuestions) * 100)
  }, [audit?.responses, survey])
}
