import { describe, it, expect } from 'vitest'
import { calculateWeightedAuditScore } from './scoring'
import { QuestionType } from '../types'
import type { Audit, Survey, SurveyQuestion } from '../types'

// Characterization tests for the weighted compliance score — the core metric.
// These LOCK CURRENT BEHAVIOR (they are a regression net, not an assertion that
// the behavior is ideal). Phase 2 expands this suite to the full case matrix and
// adds separately-tagged repros for the flagged semantic decisions. This first
// set exists so the new @trakr/shared CI step gates on real assertions: a broken
// weight flip must turn the PR red.

function q(id: string, over: Partial<SurveyQuestion> = {}): SurveyQuestion {
  return {
    id,
    text: id,
    type: QuestionType.YES_NO,
    required: false,
    order: 0,
    isWeighted: true,
    yesWeight: 10,
    noWeight: 0,
    ...over,
  }
}

function survey(questions: SurveyQuestion[]): Survey {
  return {
    id: 's1', title: 't', description: '', version: 1, isActive: true,
    createdBy: 'u', createdAt: new Date(0), updatedAt: new Date(0),
    sections: [{ id: 'sec1', title: 'Section 1', questions, order: 0 }],
  }
}

function audit(responses: Record<string, string>, overrideScores?: Record<string, number>): Audit {
  return { responses, overrideScores } as unknown as Audit
}

describe('calculateWeightedAuditScore — characterization (current behavior locked)', () => {
  it('all-compliant → 100% (yesWeight is the max)', () => {
    const s = survey([q('q1'), q('q2')])
    const a = audit({ q1: 'yes', q2: 'yes' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 20,
      weightedEarnedPoints: 20,
      weightedCompliancePercentage: 100,
    })
  })

  it('all-non-compliant → 0% (noWeight is 0)', () => {
    const s = survey([q('q1'), q('q2')])
    const a = audit({ q1: 'no', q2: 'no' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 20,
      weightedEarnedPoints: 0,
      weightedCompliancePercentage: 0,
    })
  })

  it('mixed one yes / one no → 50%', () => {
    const s = survey([q('q1'), q('q2')])
    const a = audit({ q1: 'yes', q2: 'no' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 20,
      weightedEarnedPoints: 10,
      weightedCompliancePercentage: 50,
    })
  })
})
