import React, { ReactNode } from 'react'
import { AuditPermissions } from '../hooks/useAuditStateMachine'

interface Props {
  permissions: AuditPermissions
  action: 'edit' | 'submit' | 'delete' | 'reopen' | 'view'
  children: ReactNode
  fallback?: ReactNode
  tooltip?: string
}

/**
 * Guard component that conditionally renders based on audit permissions
 * Acts like a bouncer - only allows actions that are permitted by the state machine
 * 
 * Usage:
 * <AuditActionGuard permissions={permissions} action="submit">
 *   <button onClick={handleSubmit}>Submit Audit</button>
 * </AuditActionGuard>
 */
export function AuditActionGuard({ 
  permissions, 
  action, 
  children, 
  fallback = null,
  tooltip 
}: Props) {
  const canPerform = getPermission(permissions, action)

  if (!canPerform) {
    // Show fallback (could be a disabled button, tooltip, or nothing)
    return <>{fallback}</>
  }

  // User has permission - render the children
  return <>{children}</>
}

/**
 * Helper to map action strings to permission booleans
 */
function getPermission(permissions: AuditPermissions, action: string): boolean {
  switch (action) {
    case 'edit':
      return permissions.canEdit
    case 'submit':
      return permissions.canSubmit
    case 'delete':
      return permissions.canDelete
    case 'reopen':
      return permissions.canReopen
    case 'view':
      return permissions.canViewOnly || permissions.canEdit
    default:
      return false
  }
}

/**
 * Alternative: Disabled button version (shows button but disables it with tooltip)
 */
interface DisabledButtonProps {
  permissions: AuditPermissions
  action: 'edit' | 'submit' | 'delete' | 'reopen'
  children: ReactNode
  disabledMessage?: string
}

export function AuditActionButton({ 
  permissions, 
  action, 
  children, 
  disabledMessage 
}: DisabledButtonProps) {
  const canPerform = getPermission(permissions, action)
  
  // Clone the child button and add disabled state if needed
  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: !canPerform,
      title: !canPerform ? (disabledMessage || getDefaultDisabledMessage(action, permissions)) : undefined,
      className: `${(children as any).props.className || ''} ${!canPerform ? 'opacity-50 cursor-not-allowed' : ''}`,
    })
  }

  return <>{children}</>
}

/**
 * Get default disabled message based on action and current state
 */
function getDefaultDisabledMessage(action: string, permissions: AuditPermissions): string {
  if (!permissions.canEdit && !permissions.canSubmit) {
    return `Cannot ${action} - ${permissions.statusLabel.toLowerCase()}`
  }
  
  switch (action) {
    case 'submit':
      return 'Complete all questions before submitting'
    case 'edit':
      return `Cannot edit - audit is ${permissions.statusLabel.toLowerCase()}`
    case 'delete':
      return `Cannot delete - audit is ${permissions.statusLabel.toLowerCase()}`
    case 'reopen':
      return 'Only admins can reopen finalized audits'
    default:
      return `Action not allowed in current state`
  }
}

/**
 * Wrapper for entire sections of UI that should be hidden/shown based on permissions
 */
interface SectionGuardProps {
  permissions: AuditPermissions
  show: 'edit' | 'viewOnly' | 'submit' | 'always'
  children: ReactNode
}

export function AuditSectionGuard({ permissions, show, children }: SectionGuardProps) {
  const shouldShow = () => {
    switch (show) {
      case 'edit':
        return permissions.canEdit
      case 'viewOnly':
        return permissions.canViewOnly && !permissions.canEdit
      case 'submit':
        return permissions.canSubmit
      case 'always':
        return true
      default:
        return false
    }
  }

  if (!shouldShow()) {
    return null
  }

  return <>{children}</>
}
