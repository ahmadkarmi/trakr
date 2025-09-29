// Test script to verify multiple branch manager functionality
// This tests the new API methods and approval logic

const { mockApi } = require('./packages/shared/src/services/mockData.js');

async function testMultipleBranchManagers() {
  console.log('🧪 Testing Multiple Branch Manager System...\n');

  try {
    // Test 1: Get initial data
    console.log('1️⃣ Getting initial data...');
    const branches = await mockApi.getBranches();
    const users = await mockApi.getUsers();
    const branchManagers = users.filter(u => u.role === 'BRANCH_MANAGER');
    
    console.log(`   Found ${branches.length} branches`);
    console.log(`   Found ${branchManagers.length} branch managers`);
    
    if (branches.length === 0 || branchManagers.length === 0) {
      console.log('❌ Need branches and branch managers to test');
      return;
    }

    const testBranch = branches[0];
    const manager1 = branchManagers[0];
    const manager2 = branchManagers.length > 1 ? branchManagers[1] : null;
    
    console.log(`   Testing with branch: ${testBranch.name}`);
    console.log(`   Manager 1: ${manager1.name}`);
    if (manager2) console.log(`   Manager 2: ${manager2.name}`);

    // Test 2: Assign first manager
    console.log('\n2️⃣ Assigning first manager...');
    const assignment1 = await mockApi.assignBranchManager(testBranch.id, manager1.id, 'admin-user');
    console.log(`   ✅ Assigned ${manager1.name} to ${testBranch.name}`);
    console.log(`   Assignment ID: ${assignment1.id}`);

    // Test 3: Get assignments for branch
    console.log('\n3️⃣ Getting assignments for branch...');
    const assignments = await mockApi.getBranchManagerAssignments(testBranch.id);
    console.log(`   Found ${assignments.length} assignment(s)`);
    assignments.forEach(a => {
      const manager = users.find(u => u.id === a.managerId);
      console.log(`   - ${manager?.name} (assigned ${a.assignedAt.toISOString()})`);
    });

    // Test 4: Assign second manager (if available)
    if (manager2) {
      console.log('\n4️⃣ Assigning second manager...');
      const assignment2 = await mockApi.assignBranchManager(testBranch.id, manager2.id, 'admin-user');
      console.log(`   ✅ Assigned ${manager2.name} to ${testBranch.name}`);
      
      const updatedAssignments = await mockApi.getBranchManagerAssignments(testBranch.id);
      console.log(`   Now have ${updatedAssignments.length} manager(s) assigned`);
    }

    // Test 5: Test approval authority
    console.log('\n5️⃣ Testing approval authority...');
    
    // Test manager approval authority
    const managerAuthority = await mockApi.getApprovalAuthority(testBranch.id, manager1.id);
    console.log(`   Manager 1 authority: ${managerAuthority.canApprove ? '✅ CAN APPROVE' : '❌ CANNOT APPROVE'}`);
    console.log(`   Authority type: ${managerAuthority.authority}`);
    console.log(`   Reason: ${managerAuthority.reason}`);

    // Test admin authority (should be blocked if managers assigned)
    const adminUser = users.find(u => u.role === 'ADMIN');
    if (adminUser) {
      const adminAuthority = await mockApi.getApprovalAuthority(testBranch.id, adminUser.id);
      console.log(`   Admin authority: ${adminAuthority.canApprove ? '✅ CAN APPROVE' : '❌ CANNOT APPROVE'}`);
      console.log(`   Authority type: ${adminAuthority.authority}`);
      console.log(`   Reason: ${adminAuthority.reason}`);
    }

    // Test 6: Get branches for manager
    console.log('\n6️⃣ Getting branches for manager...');
    const managerBranches = await mockApi.getBranchesForManager(manager1.id);
    console.log(`   Manager ${manager1.name} is assigned to ${managerBranches.length} branch(es)`);
    managerBranches.forEach(b => console.log(`   - ${b.name}`));

    // Test 7: Get managers for branch
    console.log('\n7️⃣ Getting managers for branch...');
    const branchManagers2 = await mockApi.getManagersForBranch(testBranch.id);
    console.log(`   Branch ${testBranch.name} has ${branchManagers2.length} manager(s)`);
    branchManagers2.forEach(m => console.log(`   - ${m.name} (${m.email})`));

    // Test 8: Test unassignment
    console.log('\n8️⃣ Testing manager unassignment...');
    await mockApi.unassignBranchManager(testBranch.id, manager1.id, 'admin-user');
    console.log(`   ✅ Unassigned ${manager1.name} from ${testBranch.name}`);
    
    const finalAssignments = await mockApi.getBranchManagerAssignments(testBranch.id);
    console.log(`   Remaining assignments: ${finalAssignments.length}`);

    // Test 9: Test admin fallback authority (no managers assigned)
    if (finalAssignments.length === 0 && adminUser) {
      console.log('\n9️⃣ Testing admin fallback authority...');
      const adminFallbackAuthority = await mockApi.getApprovalAuthority(testBranch.id, adminUser.id);
      console.log(`   Admin fallback: ${adminFallbackAuthority.canApprove ? '✅ CAN APPROVE' : '❌ CANNOT APPROVE'}`);
      console.log(`   Authority type: ${adminFallbackAuthority.authority}`);
      console.log(`   Reason: ${adminFallbackAuthority.reason}`);
    }

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testMultipleBranchManagers();
