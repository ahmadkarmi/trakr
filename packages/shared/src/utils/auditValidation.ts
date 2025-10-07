import { Audit, Survey, Question } from '../types'

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
      // Skip non-required questions if we add that feature later
      // For now, all questions are required
      totalRequired++

      const response = audit.responses[question.id]
      const hasNaReason = audit.naReasons && audit.naReasons[question.id]

      // Valid if: has a response (Yes/No) OR has N/A with reason
      if (response === 'Yes' || response === 'No') {
        answered++
      } else if (response === 'N/A' && hasNaReason) {
        answered++
      } else {
        // Missing or invalid response
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
