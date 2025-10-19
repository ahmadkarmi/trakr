// Integration test for multiple branch manager system
// This can be run in the browser console to test the API

import { api } from './utils/api'
import { logger } from './utils/logger'

export async function testMultipleBranchManagerSystem() {
  logger.info('Testing Multiple Branch Manager System Integration...', { context: 'IntegrationTest' })

  try {
    // Test 1: Get initial data
    logger.info('1️⃣ Getting initial data...', { context: 'IntegrationTest' })
    const branches = await api.getBranches()
    const users = await api.getUsers()
    
    logger.info(`Found ${branches.length} branches`, { context: 'IntegrationTest' })
    logger.info(`Found ${users.length} users`, { context: 'IntegrationTest' })
    
    const branchManagers = users.filter(u => u.role === 'BRANCH_MANAGER' as any)
    const admins = users.filter(u => u.role === 'ADMIN' as any)
    
    logger.info(`Found ${branchManagers.length} branch managers`, { context: 'IntegrationTest' })
    logger.info(`Found ${admins.length} admins`, { context: 'IntegrationTest' })

    if (branches.length === 0) {
      logger.warn('No branches found for testing', { context: 'IntegrationTest' })
      return
    }

    const testBranch = branches[0]
    logger.info(`Testing with branch: ${testBranch.name} (${testBranch.id})`, { context: 'IntegrationTest' })

    // Test 2: Test new API methods exist
    logger.info('2️⃣ Testing API method availability...', { context: 'IntegrationTest' })
    const apiMethods = [
      'getBranchManagerAssignments',
      'assignBranchManager', 
      'unassignBranchManager',
      'getBranchesForManager',
      'getManagersForBranch',
      'getApprovalAuthority',
      'createReviewLock',
      'getActiveReviewLock',
      'releaseReviewLock'
    ]

    apiMethods.forEach(method => {
      if (typeof (api as any)[method] === 'function') {
        logger.info(`✅ ${method} - Available`, { context: 'IntegrationTest' })
      } else {
        logger.warn(`❌ ${method} - Missing`, { context: 'IntegrationTest' })
      }
    })

    // Test 3: Test branch manager assignments
    logger.info('3️⃣ Testing branch manager assignments...', { context: 'IntegrationTest' })
    try {
      const assignments = await api.getBranchManagerAssignments(testBranch.id)
      logger.info(`✅ getBranchManagerAssignments: Found ${assignments.length} assignment(s)`, { context: 'IntegrationTest' })
      
      assignments.forEach((assignment, index) => {
        const manager = users.find(u => u.id === assignment.managerId)
        logger.info(`Assignment ${index + 1}: ${manager?.name || 'Unknown'} (${assignment.managerId})`, { context: 'IntegrationTest' })
      })
    } catch (error) {
      logger.error('getBranchManagerAssignments failed', error, { context: 'IntegrationTest' })
    }

    // Test 4: Test approval authority
    logger.info('4️⃣ Testing approval authority...', { context: 'IntegrationTest' })
    
    if (branchManagers.length > 0) {
      try {
        const manager = branchManagers[0]
        const authority = await api.getApprovalAuthority(testBranch.id, manager.id)
        logger.info('✅ Manager authority check', { 
          context: 'IntegrationTest',
          data: { canApprove: authority.canApprove, authority: authority.authority, reason: authority.reason }
        })
      } catch (error) {
        logger.error('Manager authority check failed', error, { context: 'IntegrationTest' })
      }
    }

    if (admins.length > 0) {
      try {
        const admin = admins[0]
        const authority = await api.getApprovalAuthority(testBranch.id, admin.id)
        logger.info('✅ Admin authority check', {
          context: 'IntegrationTest',
          data: { canApprove: authority.canApprove, authority: authority.authority, reason: authority.reason }
        })
      } catch (error) {
        logger.error('Admin authority check failed', error, { context: 'IntegrationTest' })
      }
    }

    // Test 5: Test review locks
    logger.info('5️⃣ Testing review locks...', { context: 'IntegrationTest' })
    try {
      const testAuditId = 'test-audit-123'
      const testUserId = users[0]?.id || 'test-user'
      
      // Create a lock
      const lock = await api.createReviewLock(testAuditId, testUserId)
      logger.info('✅ Created review lock', {
        context: 'IntegrationTest',
        data: { auditId: lock.auditId, reviewer: lock.reviewedBy, expires: lock.lockExpiresAt }
      })
      
      // Get active lock
      const activeLock = await api.getActiveReviewLock(testAuditId)
      logger.info(`✅ Retrieved active lock: ${activeLock ? 'Found' : 'Not found'}`, { context: 'IntegrationTest' })
      
      // Release lock
      await api.releaseReviewLock(testAuditId, testUserId)
      logger.info('✅ Released review lock', { context: 'IntegrationTest' })
      
      // Verify lock is gone
      const noLock = await api.getActiveReviewLock(testAuditId)
      logger.info(`✅ Lock after release: ${noLock ? 'Still exists' : 'Properly removed'}`, { context: 'IntegrationTest' })
      
    } catch (error) {
      logger.error('Review lock test failed', error, { context: 'IntegrationTest' })
    }

    logger.info('🎉 Integration test completed!', { context: 'IntegrationTest' })
    logger.info('📋 Next steps:', { 
      context: 'IntegrationTest',
      data: [
        '1. Test the UI components in the browser',
        '2. Test branch manager assignment workflow',
        '3. Test approval authority in real audit scenarios',
        '4. Verify audit trail is properly recorded'
      ]
    })

  } catch (error) {
    logger.error('❌ Integration test failed', error, { context: 'IntegrationTest' })
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testMultipleBranchManagerSystem = testMultipleBranchManagerSystem
}
