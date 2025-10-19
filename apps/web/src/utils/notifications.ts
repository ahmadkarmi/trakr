import { NotificationType } from '@trakr/shared'
import { api } from './api'
import { logger } from './logger'

/**
 * Helper utility to create notifications for audit lifecycle events
 */
export const notificationHelpers = {
  /**
   * Create notification when an audit is assigned to an auditor
   */
  async notifyAuditAssigned(params: {
    auditorId: string
    auditId: string
    branchName: string
    surveyTitle: string
  }) {
    try {
      await api.createNotification({
        userId: params.auditorId,
        type: NotificationType.AUDIT_ASSIGNED,
        title: '📋 New Audit Assigned',
        message: `You have been assigned a new audit for ${params.branchName}`,
        link: `/audits/${params.auditId}/summary`,
        relatedId: params.auditId,
      })
    } catch (error) {
      logger.error('Failed to create audit assigned notification', error, { context: 'NotificationHelpers' })
    }
  },

  /**
   * Create notification when an audit is submitted for approval
   */
  async notifyAuditSubmitted(params: {
    managerId: string
    auditId: string
    branchName: string
    auditorName: string
  }) {
    try {
      logger.debug('Creating audit submitted notification for manager', { context: 'NotificationHelpers', data: { managerId: params.managerId } })
      await api.createNotification({
        userId: params.managerId,
        type: NotificationType.AUDIT_SUBMITTED,
        title: '✅ Audit Submitted for Approval',
        message: `${params.auditorName} submitted an audit for ${params.branchName}`,
        // Managers should land on the review screen to approve/reject
        link: `/audit/${params.auditId}/review`,
        relatedId: params.auditId,
        requiresAction: true,
        actionType: 'REVIEW_AUDIT',
      })
      logger.debug('Notification created successfully (requires action)', { context: 'NotificationHelpers' })
    } catch (error) {
      logger.error('Failed to create audit submitted notification', error, { context: 'NotificationHelpers' })
      // Re-throw to surface the error
      throw error
    }
  },

  /**
   * Create notification when an audit is approved
   */
  async notifyAuditApproved(params: {
    auditorId: string
    auditId: string
    branchName: string
    approverName: string
  }) {
    try {
      logger.debug('Creating audit approved notification for auditor', { context: 'NotificationHelpers', data: { auditorId: params.auditorId } })
      await api.createNotification({
        userId: params.auditorId,
        type: NotificationType.AUDIT_APPROVED,
        title: '✅ Audit Approved',
        message: `Your audit for ${params.branchName} was approved by ${params.approverName}`,
        link: `/audits/${params.auditId}/summary`,
        relatedId: params.auditId,
      })
      logger.debug('Notification created successfully', { context: 'NotificationHelpers' })
    } catch (error) {
      logger.error('Failed to create audit approved notification', error, { context: 'NotificationHelpers' })
      throw error
    }
  },

  /**
   * Create notification when an audit is rejected
   */
  async notifyAuditRejected(params: {
    auditorId: string
    auditId: string
    branchName: string
    rejectorName: string
    reason?: string
  }) {
    try {
      logger.debug('Creating audit rejected notification for auditor', { context: 'NotificationHelpers', data: { auditorId: params.auditorId } })
      await api.createNotification({
        userId: params.auditorId,
        type: NotificationType.AUDIT_REJECTED,
        title: '❌ Audit Rejected',
        message: params.reason 
          ? `Your audit for ${params.branchName} was rejected: ${params.reason}`
          : `Your audit for ${params.branchName} was rejected by ${params.rejectorName}`,
        // Auditor should be taken to fix it in the wizard
        link: `/audit/${params.auditId}/wizard`,
        relatedId: params.auditId,
      })
      logger.debug('Notification created successfully', { context: 'NotificationHelpers' })
    } catch (error) {
      logger.error('Failed to create audit rejected notification', error, { context: 'NotificationHelpers' })
      throw error
    }
  },

  /**
   * Create notification when an audit is due soon (within 24 hours)
   */
  async notifyAuditDueSoon(params: {
    auditorId: string
    auditId: string
    branchName: string
    dueDate: Date
  }) {
    try {
      const hoursRemaining = Math.round((params.dueDate.getTime() - Date.now()) / (1000 * 60 * 60))
      await api.createNotification({
        userId: params.auditorId,
        type: NotificationType.AUDIT_DUE_SOON,
        title: '⏰ Audit Due Soon',
        message: `Audit for ${params.branchName} is due in ${hoursRemaining} hours`,
        link: `/audits/${params.auditId}/summary`,
        relatedId: params.auditId,
      })
    } catch (error) {
      logger.error('Failed to create audit due soon notification', error, { context: 'NotificationHelpers' })
    }
  },

  /**
   * Create notification when an audit is overdue
   */
  async notifyAuditOverdue(params: {
    auditorId: string
    auditId: string
    branchName: string
  }) {
    try {
      await api.createNotification({
        userId: params.auditorId,
        type: NotificationType.AUDIT_OVERDUE,
        title: '🔴 Audit Overdue',
        message: `Audit for ${params.branchName} is now overdue`,
        link: `/audits/${params.auditId}/summary`,
        relatedId: params.auditId,
      })
    } catch (error) {
      logger.error('Failed to create audit overdue notification', error, { context: 'NotificationHelpers' })
    }
  },

  /**
   * Create notification when a new survey is created
   */
  async notifySurveyCreated(params: {
    userIds: string[]
    surveyTitle: string
    surveyId: string
  }) {
    try {
      const promises = params.userIds.map(userId =>
        api.createNotification({
          userId,
          type: NotificationType.SURVEY_CREATED,
          title: '📝 New Survey Available',
          message: `A new survey "${params.surveyTitle}" is now available`,
          link: `/manage/surveys`,
          relatedId: params.surveyId,
        })
      )
      await Promise.all(promises)
    } catch (error) {
      logger.error('Failed to create survey created notifications', error, { context: 'NotificationHelpers' })
    }
  },

  /**
   * Create notification when a user is assigned to a branch
   */
  async notifyBranchAssigned(params: {
    userId: string
    branchName: string
    branchId: string
  }) {
    try {
      await api.createNotification({
        userId: params.userId,
        type: NotificationType.BRANCH_ASSIGNED,
        title: '🏢 Branch Assigned',
        message: `You have been assigned to ${params.branchName}`,
        link: `/manage/branches`,
        relatedId: params.branchId,
      })
    } catch (error) {
      logger.error('Failed to create branch assigned notification', error, { context: 'NotificationHelpers' })
    }
  },
}
