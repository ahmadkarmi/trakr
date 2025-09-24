import { AuditFrequency } from './organization'

export interface Survey {
  id: string;
  title: string;
  description: string;
  version: number;
  sections: SurveySection[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  frequency?: AuditFrequency; // how often this survey can be conducted per branch
}

export interface SurveySection {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  order: number;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  order: number;
  options?: string[];
  validation?: QuestionValidation;
  // Weighting: when defined, this question participates in weighted scoring
  // If not weighted, it will be excluded from weighted compliance calculations
  isWeighted?: boolean;
  yesWeight?: number; // points awarded when answered "yes"
  noWeight?: number;  // points awarded when answered "no"
}

export enum QuestionType {
  YES_NO = 'yes_no',
  TEXT = 'text',
  NUMBER = 'number',
  MULTIPLE_CHOICE = 'multiple_choice',
  CHECKBOX = 'checkbox',
  DATE = 'date',
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.YES_NO]: 'Yes/No',
  [QuestionType.TEXT]: 'Text',
  [QuestionType.NUMBER]: 'Number',
  [QuestionType.MULTIPLE_CHOICE]: 'Multiple Choice',
  [QuestionType.CHECKBOX]: 'Checkbox',
  [QuestionType.DATE]: 'Date',
};
