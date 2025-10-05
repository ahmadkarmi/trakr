export enum NotificationType {
  AUDIT_ASSIGNED = 'audit_assigned',
  AUDIT_SUBMITTED = 'audit_submitted',
  AUDIT_APPROVED = 'audit_approved',
  AUDIT_REJECTED = 'audit_rejected',
  AUDIT_DUE_SOON = 'audit_due_soon',
  AUDIT_OVERDUE = 'audit_overdue',
  SURVEY_CREATED = 'survey_created',
  BRANCH_ASSIGNED = 'branch_assigned',
  USER_MENTION = 'user_mention',
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string // Optional link to related resource
  relatedId?: string // ID of related audit/survey/etc
  isRead: boolean
  createdAt: Date
  readAt?: Date
  requiresAction?: boolean // If true, notification persists until action is completed
  actionType?: string // Type of action required (e.g., 'REVIEW_AUDIT')
  actionCompletedAt?: Date // When the required action was completed
}

export interface NotificationPreferences {
  userId: string
  emailNotifications: boolean
  pushNotifications: boolean
  auditAssigned: boolean
  auditSubmitted: boolean
  auditApproved: boolean
  auditRejected: boolean
  auditDueSoon: boolean
  auditOverdue: boolean
}
