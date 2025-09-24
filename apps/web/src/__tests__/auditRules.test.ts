import { describe, it, expect } from 'vitest'
import { mockApi, AuditStatus } from '@trakr/shared'

// These tests validate core audit lifecycle rules implemented in the mock API
// - Block edits to Submitted/Approved via saveAuditProgress
// - Allow admin override edits regardless of status
// - Reopen Rejected to In Progress on save
// - Restrict submission to In Progress or Completed only (block Draft)

describe('Audit lifecycle rules (mock API)', () => {
  it('blocks saveAuditProgress when status is SUBMITTED and allows admin override', async () => {
    const a = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })
    await mockApi.saveAuditProgress(a.id, { responses: { q1: 'yes' } }) // move to IN_PROGRESS
    await mockApi.submitAuditForApproval(a.id, 'user-1')

    // Blocked normal save (SUBMITTED)
    const afterBlocked = await mockApi.saveAuditProgress(a.id, { responses: { q2: 'no' } })
    expect(afterBlocked.status).toBe(AuditStatus.SUBMITTED)
    expect(afterBlocked.responses?.q2).toBeUndefined()

    // Admin override is allowed and does not change status
    const afterAdmin = await mockApi.adminEditAudit(a.id, { responses: { q2: 'no' } }, 'user-3')
    expect(afterAdmin.status).toBe(AuditStatus.SUBMITTED)
    expect(afterAdmin.responses?.q2).toBe('no')
  })

  it('blocks saveAuditProgress when status is APPROVED and allows admin override', async () => {
    const a = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-2', surveyId: 'survey-1', assignedTo: 'user-10' })
    await mockApi.saveAuditProgress(a.id, { responses: { q1: 'yes' } }) // move to IN_PROGRESS
    await mockApi.submitAuditForApproval(a.id, 'user-10')
    await mockApi.setAuditApproval(a.id, { status: 'approved', userId: 'user-3' })

    // Blocked normal save (APPROVED)
    const afterBlocked = await mockApi.saveAuditProgress(a.id, { responses: { q3: 'maybe' } })
    expect(afterBlocked.status).toBe(AuditStatus.APPROVED)
    expect(afterBlocked.responses?.q3).toBeUndefined()

    // Admin override is allowed; status remains APPROVED
    const afterAdmin = await mockApi.adminEditAudit(a.id, { responses: { q3: 'maybe' } }, 'user-3')
    expect(afterAdmin.status).toBe(AuditStatus.APPROVED)
    expect(afterAdmin.responses?.q3).toBe('maybe')
  })

  it('reopens REJECTED to IN_PROGRESS on save', async () => {
    const a = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })
    await mockApi.saveAuditProgress(a.id, { responses: { q1: 'yes' } }) // IN_PROGRESS
    await mockApi.submitAuditForApproval(a.id, 'user-1')
    await mockApi.setAuditApproval(a.id, { status: 'rejected', userId: 'user-3' })

    const afterSave = await mockApi.saveAuditProgress(a.id, { responses: { q2: 'no' } })
    expect(afterSave.status).toBe(AuditStatus.IN_PROGRESS)
    expect(afterSave.responses?.q2).toBe('no')
  })

  it('blocks submit from DRAFT; allows submit from IN_PROGRESS and COMPLETED', async () => {
    // From DRAFT: blocked
    const draftAudit = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-2', surveyId: 'survey-1', assignedTo: 'user-10' })
    await expect(mockApi.submitAuditForApproval(draftAudit.id, 'user-10')).rejects.toThrow(/Cannot submit/i)

    // From IN_PROGRESS: allowed
    const inprog = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-1', surveyId: 'survey-1', assignedTo: 'user-1' })
    await mockApi.saveAuditProgress(inprog.id, { responses: { q1: 'yes' } })
    const submitted1 = await mockApi.submitAuditForApproval(inprog.id, 'user-1')
    expect(submitted1.status).toBe(AuditStatus.SUBMITTED)

    // From COMPLETED: allowed
    const completed = await mockApi.createAudit({ orgId: 'org-1', branchId: 'branch-2', surveyId: 'survey-1', assignedTo: 'user-10' })
    await mockApi.setAuditStatus(completed.id, AuditStatus.COMPLETED)
    const submitted2 = await mockApi.submitAuditForApproval(completed.id, 'user-10')
    expect(submitted2.status).toBe(AuditStatus.SUBMITTED)
  })
})
