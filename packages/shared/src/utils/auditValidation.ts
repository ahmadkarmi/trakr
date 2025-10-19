import { Audit, Survey, QuestionType } from '../types'

export interface AuditValidationResult {
  isValid: boolean
  missingResponses: Array<{
    sectionTitle: string
    questionText: string
    questionId: string
  }>
  completionPercentage: number
}

/**
 * Validates that all required questions in an audit have been answered
 * 
 * @param audit - The audit to validate
 * @param survey - The survey template used for the audit
 * @returns Validation result with details about missing responses
 */
export function validateAuditCompletion(
  audit: Audit,
  survey: Survey
): AuditValidationResult {
  const missingResponses: AuditValidationResult['missingResponses'] = []
  let totalRequired = 0
  let answered = 0

  // Iterate through all sections and questions
  for (const section of survey.sections) {
    for (const question of section.questions) {
      // Only count required questions
      if (!question.required) continue
      totalRequired++

      const raw = audit.responses?.[question.id]
      const response = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
      const naReasonRaw = audit.naReasons?.[question.id]
      const hasNaReason = typeof naReasonRaw === 'string' ? naReasonRaw.trim().length > 0 : !!naReasonRaw

      // Validity by type
      const qType = (question.type || QuestionType.YES_NO)
      let isAnswered = false
      if (qType === QuestionType.YES_NO) {
        // Treat N/A as answered regardless of justification to avoid blocking completion
        if (response === 'yes' || response === 'no') isAnswered = true
        else if (response === 'n/a' || response === 'na') isAnswered = true
      } else if (qType === QuestionType.CHECKBOX) {
        // CHECKBOX stored as JSON array string; require at least one selection
        try {
          const arr = JSON.parse((audit.responses?.[question.id] as any) || '[]')
          isAnswered = Array.isArray(arr) && arr.length > 0
        } catch {
          isAnswered = false
        }
      } else {
        // For other types, any non-empty response is considered answered
        isAnswered = response.length > 0
      }

      if (isAnswered) {
        answered++
      } else {
        missingResponses.push({
          sectionTitle: section.title,
          questionText: question.text,
          questionId: question.id
        })
      }
    }
  }

  const completionPercentage = totalRequired > 0 
    ? Math.round((answered / totalRequired) * 100) 
    : 0

  return {
    isValid: missingResponses.length === 0,
    missingResponses,
    completionPercentage
  }
}

/**
 * Gets a human-readable summary of validation errors
 */
export function getValidationErrorMessage(result: AuditValidationResult): string {
  if (result.isValid) {
    return ''
  }

  const count = result.missingResponses.length
  const sections = new Set(result.missingResponses.map(m => m.sectionTitle))

  return `Cannot submit: ${count} unanswered question${count !== 1 ? 's' : ''} in ${sections.size} section${sections.size !== 1 ? 's' : ''}. Please complete all questions before submitting.`
}

/**
 * Groups missing responses by section for display
 */
export function groupMissingResponsesBySection(
  result: AuditValidationResult
): Record<string, Array<{ questionText: string; questionId: string }>> {
  const grouped: Record<string, Array<{ questionText: string; questionId: string }>> = {}

  for (const missing of result.missingResponses) {
    if (!grouped[missing.sectionTitle]) {
      grouped[missing.sectionTitle] = []
    }
    grouped[missing.sectionTitle].push({
      questionText: missing.questionText,
      questionId: missing.questionId
    })
  }

  return grouped
}
