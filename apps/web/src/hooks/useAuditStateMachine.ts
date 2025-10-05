import { AuditStatus, UserRole } from '@trakr/shared'

export interface AuditPermissions {
  canEdit: boolean
  canSubmit: boolean
  canDelete: boolean
  canReopen: boolean
  canViewOnly: boolean
  showWarning: string | null
  warningType: 'info' | 'warning' | 'error' | null
  nextAction: string | null
  statusLabel: string
}

/**
 * State machine that controls what actions are allowed based on audit status and user role
 * This is the single source of truth for audit permissions throughout the app
 */
export function useAuditStateMachine(
  currentStatus: AuditStatus,
  userRole: UserRole,
  completionPercent: number
): AuditPermissions {
  const permissions: AuditPermissions = {
    canEdit: false,
    canSubmit: false,
    canDelete: false,
    canReopen: false,
    canViewOnly: false,
    showWarning: null,
    warningType: null,
    nextAction: null,
    statusLabel: getStatusLabel(currentStatus),
  }

  // AUDITOR permissions - most restrictive role
  if (userRole === UserRole.AUDITOR) {
    switch (currentStatus) {
      case AuditStatus.DRAFT:
        permissions.canEdit = true
        permissions.canDelete = true
        permissions.canSubmit = completionPercent === 100
        
        if (completionPercent === 0) {
          permissions.nextAction = 'Start answering questions to begin your audit'
          permissions.warningType = 'info'
        } else if (completionPercent < 100) {
          permissions.nextAction = `Complete ${100 - completionPercent}% more to submit`
          permissions.warningType = 'info'
        } else {
          permissions.nextAction = 'All questions answered! Ready to submit for review'
          permissions.warningType = 'info'
        }
        break

      case AuditStatus.IN_PROGRESS:
        permissions.canEdit = true
        permissions.canDelete = true
        permissions.canSubmit = completionPercent === 100
        
        if (completionPercent < 100) {
          permissions.nextAction = `Complete ${100 - completionPercent}% more to submit`
          permissions.warningType = 'info'
        } else {
          permissions.nextAction = 'Audit complete! Submit for manager review'
          permissions.warningType = 'info'
        }
        break

      case AuditStatus.COMPLETED:
        permissions.canEdit = true
        permissions.canSubmit = true
        permissions.nextAction = 'Submit this audit for manager review'
        permissions.warningType = 'info'
        break

      case AuditStatus.SUBMITTED:
        permissions.canEdit = false
        permissions.canViewOnly = true
        permissions.showWarning = 'This audit has been submitted and is awaiting manager review. You cannot edit it while under review.'
        permissions.warningType = 'info'
        permissions.nextAction = 'Waiting for manager review'
        break

      case AuditStatus.REJECTED:
        permissions.canEdit = true
        permissions.canSubmit = completionPercent === 100
        permissions.showWarning = 'This audit was rejected by your manager. Please review the feedback comments, make necessary corrections, and resubmit.'
        permissions.warningType = 'warning'
        
        if (completionPercent < 100) {
          permissions.nextAction = `Fix issues and complete ${100 - completionPercent}% more to resubmit`
        } else {
          permissions.nextAction = 'All corrections made. Ready to resubmit'
        }
        break

      case AuditStatus.APPROVED:
        permissions.canEdit = false
        permissions.canViewOnly = true
        permissions.showWarning = 'This audit has been approved by your manager. No further edits are allowed.'
        permissions.warningType = 'info'
        permissions.nextAction = null
        break

      case AuditStatus.FINALIZED:
        permissions.canEdit = false
        permissions.canViewOnly = true
        permissions.showWarning = 'This audit has been finalized and locked. No changes can be made.'
        permissions.warningType = 'info'
        permissions.nextAction = null
        break
    }
  }

  // BRANCH_MANAGER permissions - can review and approve
  if (userRole === UserRole.BRANCH_MANAGER) {
    switch (currentStatus) {
      case AuditStatus.DRAFT:
      case AuditStatus.IN_PROGRESS:
      case AuditStatus.COMPLETED:
        permissions.canViewOnly = true
        permissions.showWarning = 'This audit is still being worked on by the auditor.'
        permissions.warningType = 'info'
        break

      case AuditStatus.SUBMITTED:
        permissions.canViewOnly = true
        permissions.canEdit = false // Managers review, don't edit
        permissions.nextAction = 'Review this audit and approve or reject'
        permissions.warningType = 'info'
        break

      case AuditStatus.REJECTED:
        permissions.canViewOnly = true
        permissions.showWarning = 'You rejected this audit. Waiting for auditor to make corrections and resubmit.'
        permissions.warningType = 'warning'
        break

      case AuditStatus.APPROVED:
        permissions.canViewOnly = true
        permissions.showWarning = 'You approved this audit.'
        permissions.warningType = 'info'
        break

      case AuditStatus.FINALIZED:
        permissions.canViewOnly = true
        permissions.showWarning = 'This audit has been finalized.'
        permissions.warningType = 'info'
        break
    }
  }

  // ADMIN/SUPER_ADMIN permissions - can do anything (but should respect workflow)
  if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
    // Admins can view everything
    permissions.canViewOnly = true
    
    // Admins can override in special cases (but UI should make this clear)
    if (currentStatus === AuditStatus.DRAFT || currentStatus === AuditStatus.IN_PROGRESS) {
      permissions.canEdit = true
      permissions.canDelete = true
    }
    
    if (currentStatus === AuditStatus.FINALIZED) {
      permissions.canReopen = true
      permissions.showWarning = 'This audit is finalized. Only admins can reopen it.'
      permissions.warningType = 'warning'
    }
  }

  return permissions
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: AuditStatus): string {
  const labels: Record<AuditStatus, string> = {
    [AuditStatus.DRAFT]: 'Draft',
    [AuditStatus.IN_PROGRESS]: 'In Progress',
    [AuditStatus.COMPLETED]: 'Completed',
    [AuditStatus.SUBMITTED]: 'Submitted for Review',
    [AuditStatus.REJECTED]: 'Rejected - Needs Revision',
    [AuditStatus.APPROVED]: 'Approved',
    [AuditStatus.FINALIZED]: 'Finalized',
  }
  
  return labels[status] || status
}
