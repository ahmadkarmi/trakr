import type { AuditStatus } from '@trakr/shared'

export const QK = {
  ORGANIZATIONS: ['organizations'] as const,
  USERS: ['users'] as const,
  USER: (id?: string) => ['user', id] as const,
  AUDITS: (scope?: string | AuditStatus) => (scope ? (['audits', scope] as const) : (['audits'] as const)),
  AUDIT: (id?: string) => ['audit', id] as const,
  BRANCHES: (orgId?: string) => ['branches', orgId] as const,
  ZONES: (orgId?: string) => ['zones', orgId] as const,
  ASSIGNMENTS: ['auditor-assignments'] as const,
  LOGS: (entityType: 'audit' | 'survey' | 'user' | 'branch' | 'organization', id?: string) => ['logs', entityType, id] as const,
  SURVEYS: ['surveys'] as const,
  SURVEY: (id?: string) => ['survey', id] as const,
  ACTIVITY: (scope?: string) => (scope ? (['activity-logs', scope] as const) : (['activity-logs'] as const)),
  NOTIFICATIONS: (userId?: string) => ['notifications', userId] as const,
  UNREAD_NOTIFICATIONS: (userId?: string) => ['unread-notifications', userId] as const,
}
