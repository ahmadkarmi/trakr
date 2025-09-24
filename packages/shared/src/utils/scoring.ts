import { Audit, Survey, QuestionType } from '../types';

export interface AuditScore {
  totalQuestions: number;
  answeredQuestions: number;
  yesAnswers: number;
  noAnswers: number;
  naAnswers: number;
  completionPercentage: number;
  compliancePercentage: number;
}

// Section weighting helpers and composites
function getSectionWeightFractions(survey: Survey): Record<string, number> {
  // Derive section weight fractions from the sum of question max points in each section
  // Max points per question = max(yesWeight, noWeight) when question is weighted
  const perSectionPoints = survey.sections.map(section => {
    let points = 0;
    section.questions.forEach(q => {
      if (!q.isWeighted || q.type !== QuestionType.YES_NO) return;
      const maxPoints = Math.max(q.yesWeight ?? 0, q.noWeight ?? 0);
      points += maxPoints;
    });
    return points;
  });
  const total = perSectionPoints.reduce((a, b) => a + b, 0);
  const n = survey.sections.length || 1;
  const map: Record<string, number> = {};
  if (total <= 0) {
    const eq = 1 / n;
    survey.sections.forEach(s => { map[s.id] = eq; });
    return map;
  }
  survey.sections.forEach((s, i) => { map[s.id] = (perSectionPoints[i] || 0) / total; });
  return map;
}

export function calculateSectionWeightedCompliance(audit: Audit, survey: Survey): number {
  const fractions = getSectionWeightFractions(survey);
  const sections = calculateSectionScores(audit, survey);
  let composite = 0;
  sections.forEach(sec => {
    const f = fractions[sec.sectionId] ?? 0;
    composite += f * (sec.compliancePercentage || 0);
  });
  return composite; // 0..100
}

export function calculateSectionWeightedWeightedCompliance(audit: Audit, survey: Survey): number {
  const fractions = getSectionWeightFractions(survey);
  const sections = calculateWeightedSectionScores(audit, survey);
  let composite = 0;
  sections.forEach(sec => {
    const f = fractions[sec.sectionId] ?? 0;
    composite += f * (sec.weightedCompliancePercentage || 0);
  });
  return composite; // 0..100
}

export interface SectionScore extends AuditScore {
  sectionId: string;
  sectionTitle: string;
}

export function calculateAuditScore(audit: Audit, survey: Survey): AuditScore {
  const allQuestions = survey.sections.flatMap(section => section.questions);
  const totalQuestions = allQuestions.length;
  
  let answeredQuestions = 0;
  let yesAnswers = 0;
  let noAnswers = 0;
  let naAnswers = 0;

  allQuestions.forEach(question => {
    const response = audit.responses[question.id];
    if (response) {
      answeredQuestions++;
      switch (response.toLowerCase()) {
        case 'yes':
          yesAnswers++;
          break;
        case 'no':
          noAnswers++;
          break;
        case 'na':
          naAnswers++;
          break;
      }
    }
  });

  const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  const applicableQuestions = yesAnswers + noAnswers; // Exclude N/A from compliance calculation
  const compliancePercentage = applicableQuestions > 0 ? (yesAnswers / applicableQuestions) * 100 : 0;

  return {
    totalQuestions,
    answeredQuestions,
    yesAnswers,
    noAnswers,
    naAnswers,
    completionPercentage,
    compliancePercentage,
  };
}

export function calculateSectionScores(audit: Audit, survey: Survey): SectionScore[] {
  return survey.sections.map(section => {
    const sectionQuestions = section.questions;
    const totalQuestions = sectionQuestions.length;
    
    let answeredQuestions = 0;
    let yesAnswers = 0;
    let noAnswers = 0;
    let naAnswers = 0;

    sectionQuestions.forEach(question => {
      const response = audit.responses[question.id];
      if (response) {
        answeredQuestions++;
        switch (response.toLowerCase()) {
          case 'yes':
            yesAnswers++;
            break;
          case 'no':
            noAnswers++;
            break;
          case 'na':
            naAnswers++;
            break;
        }
      }
    });

    const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    const applicableQuestions = yesAnswers + noAnswers;
    const compliancePercentage = applicableQuestions > 0 ? (yesAnswers / applicableQuestions) * 100 : 0;

    return {
      sectionId: section.id,
      sectionTitle: section.title,
      totalQuestions,
      answeredQuestions,
      yesAnswers,
      noAnswers,
      naAnswers,
      completionPercentage,
      compliancePercentage,
    };
  });
}

// Weighted scoring utilities (optional). Only questions with isWeighted=true are considered.
export interface WeightedAuditScore {
  weightedPossiblePoints: number;
  weightedEarnedPoints: number;
  weightedCompliancePercentage: number; // 0..100
}

export interface WeightedSectionScore extends WeightedAuditScore {
  sectionId: string;
  sectionTitle: string;
}

export function calculateWeightedAuditScore(audit: Audit, survey: Survey): WeightedAuditScore {
  let possible = 0;
  let earned = 0;

  survey.sections.forEach(section => {
    section.questions.forEach(q => {
      if (!q.isWeighted || q.type !== QuestionType.YES_NO) return;
      const response = audit.responses[q.id];
      const override = audit.overrideScores?.[q.id];
      if (!response && override == null) return; // unanswered w/o override

      const maxPoints = Math.max(q.yesWeight ?? 0, q.noWeight ?? 0);
      if (response?.toLowerCase() === 'yes' || response?.toLowerCase() === 'no') {
        possible += maxPoints;
        earned += response.toLowerCase() === 'yes' ? (q.yesWeight ?? 0) : (q.noWeight ?? 0);
      } else if (response?.toLowerCase() === 'na' && typeof override === 'number') {
        // Override turns N/A into a scored item
        possible += maxPoints;
        earned += Math.max(0, Math.min(maxPoints, override));
      }
    });
  });

  const weightedCompliancePercentage = possible > 0 ? (earned / possible) * 100 : 0;
  return {
    weightedPossiblePoints: possible,
    weightedEarnedPoints: earned,
    weightedCompliancePercentage,
  };
}

export function calculateWeightedSectionScores(audit: Audit, survey: Survey): WeightedSectionScore[] {
  return survey.sections.map(section => {
    let possible = 0;
    let earned = 0;
    section.questions.forEach(q => {
      if (!q.isWeighted || q.type !== QuestionType.YES_NO) return;
      const response = audit.responses[q.id];
      const override = audit.overrideScores?.[q.id];
      if (!response && override == null) return;
      const maxPoints = Math.max(q.yesWeight ?? 0, q.noWeight ?? 0);
      if (response?.toLowerCase() === 'yes' || response?.toLowerCase() === 'no') {
        possible += maxPoints;
        earned += response.toLowerCase() === 'yes' ? (q.yesWeight ?? 0) : (q.noWeight ?? 0);
      } else if (response?.toLowerCase() === 'na' && typeof override === 'number') {
        possible += maxPoints;
        earned += Math.max(0, Math.min(maxPoints, override));
      }
    });
    const weightedCompliancePercentage = possible > 0 ? (earned / possible) * 100 : 0;
    return {
      sectionId: section.id,
      sectionTitle: section.title,
      weightedPossiblePoints: possible,
      weightedEarnedPoints: earned,
      weightedCompliancePercentage,
    };
  });
}
