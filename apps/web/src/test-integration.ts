// Integration test for multiple branch manager system
// This can be run in the browser console to test the API

import { api } from './utils/api'

export async function testMultipleBranchManagerSystem() {
  console.log('🧪 Testing Multiple Branch Manager System Integration...\n')

  try {
    // Test 1: Get initial data
    console.log('1️⃣ Getting initial data...')
    const branches = await api.getBranches()
    const users = await api.getUsers()
    
    console.log(`   Found ${branches.length} branches`)
    console.log(`   Found ${users.length} users`)
    
    const branchManagers = users.filter(u => u.role === 'BRANCH_MANAGER' as any)
    const admins = users.filter(u => u.role === 'ADMIN' as any)
    
    console.log(`   Found ${branchManagers.length} branch managers`)
    console.log(`   Found ${admins.length} admins`)

    if (branches.length === 0) {
      console.log('❌ No branches found for testing')
      return
    }

    const testBranch = branches[0]
    console.log(`   Testing with branch: ${testBranch.name} (${testBranch.id})`)

    // Test 2: Test new API methods exist
    console.log('\n2️⃣ Testing API method availability...')
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
        console.log(`   ✅ ${method} - Available`)
      } else {
        console.log(`   ❌ ${method} - Missing`)
      }
    })

    // Test 3: Test branch manager assignments
    console.log('\n3️⃣ Testing branch manager assignments...')
    try {
      const assignments = await api.getBranchManagerAssignments(testBranch.id)
      console.log(`   ✅ getBranchManagerAssignments: Found ${assignments.length} assignment(s)`)
      
      assignments.forEach((assignment, index) => {
        const manager = users.find(u => u.id === assignment.managerId)
        console.log(`   Assignment ${index + 1}: ${manager?.name || 'Unknown'} (${assignment.managerId})`)
      })
    } catch (error) {
      console.log(`   ❌ getBranchManagerAssignments failed: ${(error as Error).message}`)
    }

    // Test 4: Test approval authority
    console.log('\n4️⃣ Testing approval authority...')
    
    if (branchManagers.length > 0) {
      try {
        const manager = branchManagers[0]
        const authority = await api.getApprovalAuthority(testBranch.id, manager.id)
        console.log(`   ✅ Manager authority check:`)
        console.log(`      Can approve: ${authority.canApprove}`)
        console.log(`      Authority: ${authority.authority}`)
        console.log(`      Reason: ${authority.reason}`)
      } catch (error) {
        console.log(`   ❌ Manager authority check failed: ${(error as Error).message}`)
      }
    }

    if (admins.length > 0) {
      try {
        const admin = admins[0]
        const authority = await api.getApprovalAuthority(testBranch.id, admin.id)
        console.log(`   ✅ Admin authority check:`)
        console.log(`      Can approve: ${authority.canApprove}`)
        console.log(`      Authority: ${authority.authority}`)
        console.log(`      Reason: ${authority.reason}`)
      } catch (error) {
        console.log(`   ❌ Admin authority check failed: ${(error as Error).message}`)
      }
    }

    // Test 5: Test review locks
    console.log('\n5️⃣ Testing review locks...')
    try {
      const testAuditId = 'test-audit-123'
      const testUserId = users[0]?.id || 'test-user'
      
      // Create a lock
      const lock = await api.createReviewLock(testAuditId, testUserId)
      console.log(`   ✅ Created review lock: ${lock.auditId}`)
      console.log(`      Reviewer: ${lock.reviewedBy}`)
      console.log(`      Expires: ${lock.lockExpiresAt}`)
      
      // Get active lock
      const activeLock = await api.getActiveReviewLock(testAuditId)
      console.log(`   ✅ Retrieved active lock: ${activeLock ? 'Found' : 'Not found'}`)
      
      // Release lock
      await api.releaseReviewLock(testAuditId, testUserId)
      console.log(`   ✅ Released review lock`)
      
      // Verify lock is gone
      const noLock = await api.getActiveReviewLock(testAuditId)
      console.log(`   ✅ Lock after release: ${noLock ? 'Still exists' : 'Properly removed'}`)
      
    } catch (error) {
      console.log(`   ❌ Review lock test failed: ${(error as Error).message}`)
    }

    console.log('\n🎉 Integration test completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Test the UI components in the browser')
    console.log('   2. Test branch manager assignment workflow')
    console.log('   3. Test approval authority in real audit scenarios')
    console.log('   4. Verify audit trail is properly recorded')

  } catch (error) {
    console.error('❌ Integration test failed:', error)
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testMultipleBranchManagerSystem = testMultipleBranchManagerSystem
}
