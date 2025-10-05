import { useMemo } from 'react'
import { Audit, Survey } from '@trakr/shared'

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

    const answers = audit.answers || {}
    
    // Calculate overall progress
    const totalQuestions = survey.sections.reduce(
      (sum, section) => sum + section.questions.length,
      0
    )
    
    const answeredQuestions = Object.keys(answers).filter(
      questionId => answers[questionId] !== undefined && answers[questionId] !== null && answers[questionId] !== ''
    ).length
    
    const completionPercent = totalQuestions > 0 
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0
    
    // Calculate section-level progress
    const sectionProgress: SectionProgress[] = survey.sections.map(section => {
      const sectionQuestions = section.questions.map(q => q.id)
      const sectionAnswered = sectionQuestions.filter(
        qId => answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== ''
      ).length
      
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
  }, [audit?.answers, survey])
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
      const answer = answers[question.id]
      if (answer === undefined || answer === null || answer === '') {
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
    
    const totalQuestions = survey.sections.reduce(
      (sum, section) => sum + section.questions.length,
      0
    )
    
    if (totalQuestions === 0) return 0
    
    const answers = audit.answers || {}
    const answeredQuestions = Object.keys(answers).filter(
      questionId => answers[questionId] !== undefined && answers[questionId] !== null && answers[questionId] !== ''
    ).length
    
    return Math.round((answeredQuestions / totalQuestions) * 100)
  }, [audit?.answers, survey])
}
