import { Audit, Survey, SurveySection } from '../types';

export interface AuditScore {
  totalQuestions: number;
  answeredQuestions: number;
  yesAnswers: number;
  noAnswers: number;
  naAnswers: number;
  completionPercentage: number;
  compliancePercentage: number;
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
