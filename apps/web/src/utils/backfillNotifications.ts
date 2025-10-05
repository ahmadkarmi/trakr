import { api } from './api'
import { AuditStatus, NotificationType } from '@trakr/shared'

/**
 * Backfill notifications for existing audits that don't have notifications
 * This is useful for audits that were submitted/approved/rejected before the notification system was implemented
 */
export async function backfillAuditNotifications() {
  try {
    console.log('🔄 Starting notification backfill for audits...')
    
    // Get all submitted, approved, and rejected audits
    const submittedAudits = await api.getAudits({ status: AuditStatus.SUBMITTED })
    const approvedAudits = await api.getAudits({ status: AuditStatus.APPROVED })
    const rejectedAudits = await api.getAudits({ status: AuditStatus.REJECTED })
    
    console.log(`📊 Found ${submittedAudits.length} SUBMITTED, ${approvedAudits.length} APPROVED, ${rejectedAudits.length} REJECTED audits`)
    
    // Get all branches to find managers
    const branches = await api.getBranches()
    const branchMap = new Map(branches.map(b => [b.id, b]))
    
    // Get all users to get auditor/manager names
    const users = await api.getUsers()
    const userMap = new Map(users.map(u => [u.id, u]))
    
    let notificationsCreated = 0
    
    // Process submitted audits (notify managers)
    console.log('📤 Processing SUBMITTED audits for branch managers...')
    if (submittedAudits.length > 0) {
      const count = await backfillSubmittedNotifications(submittedAudits, branchMap, userMap)
      notificationsCreated += count
    }
    
    // Process approved audits (notify auditors)
    console.log('✅ Processing APPROVED audits for auditors...')
    if (approvedAudits.length > 0) {
      const count = await backfillApprovedNotifications(approvedAudits, branchMap, userMap)
      notificationsCreated += count
    }
    
    // Process rejected audits (notify auditors)
    console.log('❌ Processing REJECTED audits for auditors...')
    if (rejectedAudits.length > 0) {
      const count = await backfillRejectedNotifications(rejectedAudits, branchMap, userMap)
      notificationsCreated += count
    }
    
    console.log(`🎉 Backfill complete! Created ${notificationsCreated} notifications`)
    return notificationsCreated
  } catch (error) {
    console.error('❌ Error during notification backfill:', error)
    throw error
  }
}

async function backfillSubmittedNotifications(
  submittedAudits: any[],
  branchMap: Map<string, any>,
  userMap: Map<string, any>
): Promise<number> {
  let notificationsCreated = 0
  
  for (const audit of submittedAudits) {
      try {
        // Get branch info
        const branch = branchMap.get(audit.branchId)
        if (!branch) {
          console.log(`⚠️ Branch ${audit.branchId} not found for audit ${audit.id}`)
          continue
        }
        
        // Get branch manager assignments
        const assignments = await api.getBranchManagerAssignments(branch.id)
        if (!assignments || assignments.length === 0) {
          console.log(`⚠️ No managers assigned to branch ${branch.id} for audit ${audit.id}`)
          continue
        }
        
        // Get auditor name
        const auditor = userMap.get(audit.assignedTo)
        const auditorName = auditor?.name || auditor?.email || 'Unknown Auditor'
        
        // Check if notification already exists for each manager
        for (const assignment of assignments) {
          const existingNotifications = await api.getNotifications(assignment.managerId)
          const hasNotification = existingNotifications.some(
            n => n.relatedId === audit.id && n.actionType === 'REVIEW_AUDIT'
          )
          
          if (hasNotification) {
            console.log(`ℹ️ Notification already exists for manager ${assignment.managerId} and audit ${audit.id}`)
            continue
          }
          
          // Create notification for this manager
          await api.createNotification({
            userId: assignment.managerId,
            type: 'AUDIT_SUBMITTED',
            title: '✅ Audit Submitted for Approval',
            message: `${auditorName} submitted an audit for ${branch.name}`,
            link: `/audits/${audit.id}/summary`,
            relatedId: audit.id,
            requiresAction: true,
            actionType: 'REVIEW_AUDIT',
          })
          
          notificationsCreated++
          console.log(`✅ Created notification for manager ${assignment.managerId} for audit ${audit.id}`)
        }
      } catch (error) {
        console.error(`❌ Error processing audit ${audit.id}:`, error)
      }
    }
  
  return notificationsCreated
}

async function backfillApprovedNotifications(
  approvedAudits: any[],
  branchMap: Map<string, any>,
  userMap: Map<string, any>
): Promise<number> {
  let notificationsCreated = 0
  
  for (const audit of approvedAudits) {
    try {
      const auditor = userMap.get(audit.assignedTo)
      const branch = branchMap.get(audit.branchId)
      const approver = userMap.get(audit.approvedBy)
      
      if (!auditor || !branch) continue
      
      // Check if notification already exists
      const existingNotifications = await api.getNotifications(audit.assignedTo)
      const hasNotification = existingNotifications.some(
        n => n.relatedId === audit.id && n.type === NotificationType.AUDIT_APPROVED
      )
      
      if (hasNotification) {
        console.log(`ℹ️  Notification already exists for auditor ${audit.assignedTo} and audit ${audit.id}`)
        continue
      }
      
      await api.createNotification({
        userId: audit.assignedTo,
        type: 'AUDIT_APPROVED',
        title: '✅ Audit Approved',
        message: `Your audit for ${branch.name} was approved${approver ? ` by ${approver.name || approver.email}` : ''}`,
        link: `/audits/${audit.id}/summary`,
        relatedId: audit.id,
      })
      
      notificationsCreated++
      console.log(`✅ Created approved notification for auditor ${audit.assignedTo} for audit ${audit.id}`)
    } catch (error) {
      console.error(`❌ Error processing approved audit ${audit.id}:`, error)
    }
  }
  
  return notificationsCreated
}

async function backfillRejectedNotifications(
  rejectedAudits: any[],
  branchMap: Map<string, any>,
  userMap: Map<string, any>
): Promise<number> {
  let notificationsCreated = 0
  
  for (const audit of rejectedAudits) {
    try {
      const auditor = userMap.get(audit.assignedTo)
      const branch = branchMap.get(audit.branchId)
      const rejector = userMap.get(audit.rejectedBy)
      
      if (!auditor || !branch) continue
      
      // Check if notification already exists
      const existingNotifications = await api.getNotifications(audit.assignedTo)
      const hasNotification = existingNotifications.some(
        n => n.relatedId === audit.id && n.type === NotificationType.AUDIT_REJECTED
      )
      
      if (hasNotification) {
        console.log(`ℹ️  Notification already exists for auditor ${audit.assignedTo} and audit ${audit.id}`)
        continue
      }
      
      await api.createNotification({
        userId: audit.assignedTo,
        type: 'AUDIT_REJECTED',
        title: '❌ Audit Rejected',
        message: audit.rejectionNote 
          ? `Your audit for ${branch.name} was rejected: ${audit.rejectionNote}`
          : `Your audit for ${branch.name} was rejected${rejector ? ` by ${rejector.name || rejector.email}` : ''}`,
        link: `/audits/${audit.id}/summary`,
        relatedId: audit.id,
      })
      
      notificationsCreated++
      console.log(`✅ Created rejected notification for auditor ${audit.assignedTo} for audit ${audit.id}`)
    } catch (error) {
      console.error(`❌ Error processing rejected audit ${audit.id}:`, error)
    }
  }
  
  return notificationsCreated
}
