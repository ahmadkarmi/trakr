import { test, expect } from '@playwright/test'
import {
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  ensureAuditorAssignedToBranch,
  ensureBranchManagerAssigned,
  ensureAuditFor,
  getAuditStatus,
  deleteAudits,
  getUserClient,
} from './helpers/e2eSetup'

// Regression net for Phase 1c: the SECURITY DEFINER RPCs (submit_audit,
// set_auditor_assignment, reassign_*, set_audit_assigned_to) bypass RLS and
// were callable by any authenticated user with NO org/role authorization.
// Cross-org denial is proven by role-switched rollback transactions in the
// migration; these single-org integration tests assert the in-org
// authorization (admin-only ops reject non-admins; submit requires the
// assigned auditor or an admin) while the legitimate path still works.
test.describe('SECURITY DEFINER RPC authorization', () => {
  test.setTimeout(120_000)

  let orgId: string
  let branchId: string
  let surveyId: string
  let auditorId: string
  let managerId: string

  test.beforeAll(async () => {
    const auditor = await getUserByEmail('auditor@trakr.com')
    const manager = await getUserByEmail('branchmanager@trakr.com')
    if (!auditor || !manager) throw new Error('Seed users missing')
    if (!manager.org_id) throw new Error('branchmanager@trakr.com has no org_id')
    auditorId = auditor.id
    managerId = manager.id
    orgId = manager.org_id
    const branch = await ensureBranchForOrg(orgId, 'E2E RpcAuthz Branch')
    branchId = branch.id
    const survey = await ensureSimpleSurvey(orgId, 'E2E RpcAuthz Survey')
    surveyId = survey.id
    await ensureAuditorAssignedToBranch(auditorId, branchId)
    await ensureBranchManagerAssigned(managerId, branchId)
  })

  const createdAuditIds: string[] = []
  test.afterAll(async () => {
    await deleteAudits(createdAuditIds)
  })

  test('a non-admin (auditor) CANNOT call set_auditor_assignment', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const { error } = await supa.rpc('set_auditor_assignment', {
      p_user_id: auditorId, p_branch_ids: [branchId], p_zone_ids: [],
    })
    expect(error, 'set_auditor_assignment must reject a non-admin caller').toBeTruthy()
  })

  test('a branch manager (non-assignee, non-admin) CANNOT submit another user\'s audit', async () => {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId) // DRAFT, assigned to auditor
    createdAuditIds.push(audit.id)
    const supa = await getUserClient('branchmanager@trakr.com', 'Password@123')
    const { error } = await supa.rpc('submit_audit', { p_audit_id: audit.id, p_submitted_by: managerId })
    expect(error, 'submit_audit must reject a non-assignee non-admin').toBeTruthy()
    expect(await getAuditStatus(audit.id)).toBe('DRAFT')
  })

  test('the assigned auditor CAN submit their own audit via submit_audit (legit path)', async () => {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId) // DRAFT
    createdAuditIds.push(audit.id)
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const { error } = await supa.rpc('submit_audit', { p_audit_id: audit.id, p_submitted_by: auditorId })
    expect(error, 'assigned auditor submit must succeed').toBeFalsy()
    expect(await getAuditStatus(audit.id)).toBe('SUBMITTED')
  })
})
