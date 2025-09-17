export enum AuditStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Audit {
  id: string;
  orgId: string;
  branchId: string;
  surveyId: string;
  surveyVersion: number;
  assignedTo: string;
  status: AuditStatus;
  responses: Record<string, string>; // questionId -> yes/no/na
  naReasons: Record<string, string>; // questionId -> reason
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditComment {
  id: string;
  auditId: string;
  questionId: string;
  comment: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditPhoto {
  id: string;
  auditId: string;
  questionId?: string;
  commentId?: string;
  filename: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface AuditSection {
  id: string;
  title: string;
  questions: AuditQuestion[];
  order: number;
}

export interface AuditQuestion {
  id: string;
  text: string;
  type: 'yes_no' | 'text' | 'number';
  required: boolean;
  order: number;
  sectionId: string;
}

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  [AuditStatus.DRAFT]: 'Draft',
  [AuditStatus.IN_PROGRESS]: 'In Progress',
  [AuditStatus.COMPLETED]: 'Completed',
  [AuditStatus.APPROVED]: 'Approved',
  [AuditStatus.REJECTED]: 'Rejected',
};

export function getAuditStatusFromKey(key: string): AuditStatus {
  const status = Object.values(AuditStatus).find(s => s === key);
  if (!status) {
    throw new Error(`Unknown audit status: ${key}`);
  }
  return status;
}
