import { describe, it, expect } from 'vitest'
import {
  calculateWeightedAuditScore,
  calculateSectionWeightedCompliance,
  calculateSectionWeightedWeightedCompliance,
} from './scoring'
import { QuestionType } from '../types'
import type { Audit, Survey, SurveyQuestion } from '../types'

// Characterization suite for weighted compliance scoring — the metric a bank
// pilot's compliance decisions rest on. Two intents, kept strictly separate:
//
//   1. `characterization` LOCKS current behavior as a regression net. These are
//      "this is what it does today"; a fix that changes any of them must change
//      the test in the same commit, deliberately.
//   2. `FLAGGED semantic behaviors` also assert the CURRENT number, but each is a
//      behavior we suspect is wrong and are surfacing for a PRODUCT decision —
//      NOT an endorsement. Per the hardening plan we flag, we do not silently
//      encode suspected-wrong output as "correct". See docs/memory.md
//      (scoring-semantics decision log) for the open questions.

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

function multiSurvey(sections: { id: string; questions: SurveyQuestion[] }[]): Survey {
  return {
    id: 's1', title: 't', description: '', version: 1, isActive: true,
    createdBy: 'u', createdAt: new Date(0), updatedAt: new Date(0),
    sections: sections.map((s, i) => ({ id: s.id, title: s.id, questions: s.questions, order: i })),
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

  it('N/A is excluded from the denominator (not counted as non-compliant)', () => {
    const s = survey([q('q1'), q('q2')])
    const a = audit({ q1: 'yes', q2: 'na' })
    // Only q1 contributes: possible 10, earned 10 → 100%. The N/A question is
    // dropped from both possible and earned rather than scored as a miss.
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 10,
      weightedEarnedPoints: 10,
      weightedCompliancePercentage: 100,
    })
  })

  it('empty sections (no questions) contribute nothing', () => {
    const s = multiSurvey([
      { id: 'a', questions: [q('q1')] },
      { id: 'b', questions: [] },
    ])
    const a = audit({ q1: 'yes' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 10,
      weightedEarnedPoints: 10,
      weightedCompliancePercentage: 100,
    })
  })

  it('non-weighted questions are excluded entirely', () => {
    const s = survey([q('q1'), q('q2', { isWeighted: false })])
    const a = audit({ q1: 'yes', q2: 'no' }) // q2 answered "no" but not weighted
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 10,
      weightedEarnedPoints: 10,
      weightedCompliancePercentage: 100,
    })
  })

  it('a zero-weight weighted question adds nothing to possible or earned', () => {
    const s = survey([q('q1'), q('q2', { yesWeight: 0, noWeight: 0 })])
    const a = audit({ q1: 'yes', q2: 'yes' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 10,
      weightedEarnedPoints: 10,
      weightedCompliancePercentage: 100,
    })
  })

  it('nothing answered → all zeros, guarded to 0% (no divide-by-zero)', () => {
    const s = survey([q('q1'), q('q2')])
    const a = audit({})
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 0,
      weightedEarnedPoints: 0,
      weightedCompliancePercentage: 0,
    })
  })

  it('a numeric override on an N/A response scores that item', () => {
    const s = survey([q('q1')])
    const a = audit({ q1: 'na' }, { q1: 8 })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 10,
      weightedEarnedPoints: 8,
      weightedCompliancePercentage: 80,
    })
  })

  it('an override is clamped to [0, maxPoints]', () => {
    const over = survey([q('q1')])
    expect(calculateWeightedAuditScore(audit({ q1: 'na' }, { q1: 999 }), over).weightedEarnedPoints).toBe(10)
    const under = survey([q('q1')])
    expect(calculateWeightedAuditScore(audit({ q1: 'na' }, { q1: -5 }), under).weightedEarnedPoints).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// FLAGGED — current behavior captured for a REGRESSION net, but each is an open
// product/design question, NOT a statement that the behavior is correct. If a
// decision changes one of these, update the test deliberately. Details:
// docs/memory.md → "Weighted scoring: flagged semantic decisions".
// ---------------------------------------------------------------------------
describe('FLAGGED semantic behaviors (documented, NOT endorsed)', () => {
  it('FLAG: unanswered questions are excluded, so partial audits inflate compliance', () => {
    // 100 weighted questions, only ONE answered "yes" → reports 100% compliant.
    // Compliance is computed over *answered* questions only; completion is a
    // separate metric the score does not reflect. Open question: should the UI
    // gate the score behind a completion threshold?
    const questions = Array.from({ length: 100 }, (_, i) => q(`q${i}`))
    const s = survey(questions)
    const a = audit({ q0: 'yes' })
    const r = calculateWeightedAuditScore(a, s)
    expect(r.weightedPossiblePoints).toBe(10)
    expect(r.weightedCompliancePercentage).toBe(100)
  })

  it('FLAG: no weighted questions yields a real-looking 0%, indistinguishable from fully non-compliant', () => {
    // A survey with zero weighted questions returns 0% — the same number as an
    // audit that answered every weighted question "no". A consumer cannot tell
    // "not applicable" from "totally failed". Open question: return a null/NaN
    // sentinel or a hasWeightedQuestions flag so the UI can render "N/A".
    const s = survey([q('q1', { isWeighted: false }), q('q2', { isWeighted: false })])
    const a = audit({ q1: 'yes', q2: 'yes' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 0,
      weightedEarnedPoints: 0,
      weightedCompliancePercentage: 0,
    })
  })

  it('FLAG: maxPoints uses max(yes,no), so an all-"yes" audit can score below 100%', () => {
    // yesWeight 5, noWeight 10 → maxPoints 10. Answering "yes" earns 5 of a
    // possible 10 = 50%, despite being the compliant answer. Whether noWeight
    // may exceed yesWeight (and what that means) is a survey-authoring question.
    const s = survey([q('q1', { yesWeight: 5, noWeight: 10 })])
    const a = audit({ q1: 'yes' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 10,
      weightedEarnedPoints: 5,
      weightedCompliancePercentage: 50,
    })
  })

  it('FLAG: an override is silently ignored unless the response is exactly N/A', () => {
    // Override present but the question is unanswered (not "na"): the override is
    // dropped and the item scores nothing. A reviewer setting a score on an
    // unanswered question sees no effect. Open question: apply overrides
    // regardless of response state.
    const s = survey([q('q1')])
    const a = audit({}, { q1: 8 })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 0,
      weightedEarnedPoints: 0,
      weightedCompliancePercentage: 0,
    })
  })

  it('FLAG: a NaN override poisons the entire score (no Number.isFinite guard)', () => {
    // Math.max(0, Math.min(maxPoints, NaN)) === NaN, so one bad override turns the
    // whole audit score into NaN. Suggested fix: guard with Number.isFinite.
    const s = survey([q('q1'), q('q2')])
    const a = audit({ q1: 'na', q2: 'yes' }, { q1: NaN })
    const r = calculateWeightedAuditScore(a, s)
    expect(r.weightedEarnedPoints).toBeNaN()
    expect(r.weightedCompliancePercentage).toBeNaN()
  })

  it('FLAG: a response with surrounding whitespace scores nothing', () => {
    // Matching is `response.toLowerCase() === 'yes'` with no trim, so " yes "
    // matches neither yes/no nor the isNA() path → the item is dropped. Depends
    // on writers always persisting canonical tokens; defensive normalization
    // would remove the footgun.
    const s = survey([q('q1')])
    const a = audit({ q1: ' yes ' })
    expect(calculateWeightedAuditScore(a, s)).toEqual({
      weightedPossiblePoints: 0,
      weightedEarnedPoints: 0,
      weightedCompliancePercentage: 0,
    })
  })

  it('FLAG: the three "weighted" definitions disagree on the same audit', () => {
    // calculateWeightedAuditScore pools weighted points (pooled ratio);
    // calculateSectionWeightedCompliance blends each section's *unweighted*
    // yes-ratio by section weight. On a section whose within-section weights are
    // lopsided they diverge sharply. Only one can be the canonical metric shown
    // to the bank; today different screens can show different numbers.
    const s = survey([
      q('q1', { yesWeight: 100, noWeight: 0 }), // heavy, answered yes
      q('q2', { yesWeight: 1, noWeight: 0 }),   // light, answered no
    ])
    const a = audit({ q1: 'yes', q2: 'no' })

    const pooled = calculateWeightedAuditScore(a, s).weightedCompliancePercentage
    const sectionBlended = calculateSectionWeightedCompliance(a, s)

    expect(pooled).toBeCloseTo(99.0099, 3)      // 100 of 101 weighted points
    expect(sectionBlended).toBe(50)             // unweighted 1-of-2 yes ratio
    expect(Math.abs(pooled - sectionBlended)).toBeGreaterThan(40)

    // The third definition is merely an alias of the first — assert that so a
    // future refactor doesn't silently make it a fourth divergent formula.
    expect(calculateSectionWeightedWeightedCompliance(a, s)).toBe(pooled)
  })
})
