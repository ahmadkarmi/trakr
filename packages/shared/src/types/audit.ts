export enum AuditStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SUBMITTED = 'submitted',
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
  // Optional, per-section notes and photos captured by auditors
  sectionComments?: Record<string, string>; // sectionId -> comment
  sectionPhotos?: AuditPhoto[]; // section photos
  photos?: AuditPhoto[]; // question/comment photos
  // Admin overrides for N/A on weighted questions (points are 0..maxPoints for the question)
  overrideScores?: Record<string, number>; // questionId -> override points
  overrideNotes?: Record<string, string>; // questionId -> note
  // Approval workflow metadata
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNote?: string;
  approvalSignatureUrl?: string; // image data/url used for signature
  approvalSignatureType?: 'image' | 'typed' | 'drawn';
  approvalName?: string; // if typed signature
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionNote?: string;
  // Scheduling metadata
  periodStart?: Date; // beginning of day/week/month/quarter for this audit based on survey frequency
  periodEnd?: Date;   // end of period for this audit
  dueAt?: Date;       // usually equal to periodEnd
  isArchived?: boolean; // archived at end of period; can still be continued; admin may manually archive
  archivedAt?: Date;
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
  sectionId?: string; // optional when photo is tied to a section rather than a question/comment
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
  [AuditStatus.SUBMITTED]: 'Submitted for Approval',
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
