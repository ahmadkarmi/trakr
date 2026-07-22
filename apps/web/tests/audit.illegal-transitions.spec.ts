import { test, expect } from '@playwright/test'
import {
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  ensureAuditorAssignedToBranch,
  ensureBranchManagerAssigned,
  ensureAuditFor,
  setAuditSubmitted,
  setAuditApproved,
  getAuditStatus,
  deleteAudits,
  getUserClient,
} from './helpers/e2eSetup'

// Regression net for the audit state machine (Phase 1b). The `audits` UPDATE
// RLS policy's WITH CHECK has no status constraint, so before the
// enforce_audit_status_transition trigger a raw client UPDATE let an AUDITOR
// self-approve their own audit (status->APPROVED) and skip set_audit_approval
// entirely. These assert the illegal raw transitions now fail closed while the
// legitimate auditor transition still succeeds. Phase 3 extends the net with
// branch-manager / non-assignee / RPC-authz cases.
test.describe('Audit illegal status transitions are blocked', () => {
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
    const branch = await ensureBranchForOrg(orgId, 'E2E IllegalTransition Branch')
    branchId = branch.id
    const survey = await ensureSimpleSurvey(orgId, 'E2E IllegalTransition Survey')
    surveyId = survey.id
    await ensureAuditorAssignedToBranch(auditorId, branchId)
    await ensureBranchManagerAssigned(managerId, branchId)
  })

  const createdAuditIds: string[] = []
  test.afterAll(async () => {
    await deleteAudits(createdAuditIds)
  })

  test('auditor CANNOT self-approve their own audit via a raw status update', async () => {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId) // DRAFT
    createdAuditIds.push(audit.id)
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const { error } = await supa.from('audits').update({ status: 'APPROVED' }).eq('id', audit.id)
    expect(error, 'trigger must reject auditor self-approval').toBeTruthy()
    expect(await getAuditStatus(audit.id)).toBe('DRAFT')
  })

  test('auditor CANNOT self-submit via a raw status update (must use submit_audit)', async () => {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId) // DRAFT
    createdAuditIds.push(audit.id)
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const { error } = await supa.from('audits').update({ status: 'SUBMITTED' }).eq('id', audit.id)
    expect(error, 'trigger must reject raw SUBMITTED transition').toBeTruthy()
    expect(await getAuditStatus(audit.id)).toBe('DRAFT')
  })

  test('auditor CAN still complete their own audit (legit transition preserved)', async () => {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId) // DRAFT
    createdAuditIds.push(audit.id)
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const { error } = await supa.from('audits').update({ status: 'COMPLETED' }).eq('id', audit.id)
    expect(error, 'auditor DRAFT->COMPLETED must remain allowed').toBeFalsy()
    expect(await getAuditStatus(audit.id)).toBe('COMPLETED')
  })

  test('a branch manager CANNOT raw-rewrite the status of an APPROVED audit', async () => {
    // A finalized (APPROVED) audit must not be un-approved or re-decided by a raw
    // client UPDATE; decisions flow only through set_audit_approval. The trigger
    // blocks any BRANCH_MANAGER raw status change.
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId)
    createdAuditIds.push(audit.id)
    await setAuditSubmitted(audit.id, auditorId)
    await setAuditApproved(audit.id, managerId)
    expect(await getAuditStatus(audit.id)).toBe('APPROVED')

    const supa = await getUserClient('branchmanager@trakr.com', 'Password@123')
    const { error } = await supa.from('audits').update({ status: 'REJECTED' }).eq('id', audit.id)
    expect(error, 'trigger must block a BM raw status rewrite of an APPROVED audit').toBeTruthy()
    expect(await getAuditStatus(audit.id)).toBe('APPROVED')
  })

  test('a non-BM, non-admin user CANNOT approve via set_audit_approval', async () => {
    // set_audit_approval only lets the assigned branch manager (or an admin)
    // decide. The assigned auditor is neither, so their RPC call is rejected and
    // the audit stays SUBMITTED.
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId)
    createdAuditIds.push(audit.id)
    await setAuditSubmitted(audit.id, auditorId)

    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const { error } = await supa.rpc('set_audit_approval', {
      p_audit_id: audit.id, p_status: 'approved', p_user_id: auditorId,
    })
    expect(error, 'set_audit_approval must reject a non-BM non-admin approver').toBeTruthy()
    expect(await getAuditStatus(audit.id)).toBe('SUBMITTED')
  })
})
