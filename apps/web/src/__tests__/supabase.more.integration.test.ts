import { describe, it, expect, afterAll } from 'vitest'
import { api } from '../utils/api'
import type { Survey } from '@trakr/shared'
import { QuestionType, AuditStatus } from '@trakr/shared'

// Only run when VITE_BACKEND === 'supabase'
const isSupabase = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase() === 'supabase'
const maybe = isSupabase ? describe : describe.skip

maybe('Supabase integration (assignments + overrides + admin edit)', () => {
  let createdBranchId: string | null = null
  let createdSurveyId: string | null = null
  let createdAuditId: string | null = null

  it('reassigns DRAFT audits via reassignUnstartedAuditsForBranches and supports override/admin edit', async () => {
    // Ensure users and orgs
    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(0)
    const admin = users.find(u => u.email === 'admin@trakr.com') || users[0]
    const anotherUser = users.find(u => u.id !== admin.id) || users[0]

    const orgs = await api.getOrganizations()
    expect(orgs.length).toBeGreaterThan(0)
    const orgId = orgs[0].id

    // Ensure we have a branch to work with
    const branches = await api.getBranches(orgId)
    let branchId = branches[0]?.id as string | undefined
    if (!branchId) {
      const newBranch = await api.createBranch({ orgId, name: `Test Branch ${Date.now()}` })
      createdBranchId = newBranch.id
      branchId = newBranch.id
    }

    // Create a survey with one weighted yes/no question
    const created = await api.createSurvey({
      title: `Integration Survey ${Date.now()}`,
      description: 'tmp',
      createdBy: admin.id,
      sections: [
        {
          id: 'sec-1',
          title: 'Page 1',
          description: '',
          order: 0,
          questions: [
            {
              id: 'q-1',
              text: 'Weighted yes/no?',
              type: QuestionType.YES_NO,
              required: false,
              order: 0,
              isWeighted: true,
              yesWeight: 5,
              noWeight: 0,
            },
          ],
        },
      ],
    })
    expect(created && typeof created.id === 'string').toBe(true)
    createdSurveyId = created.id

    // Create an audit assigned to admin (any user) – DRAFT by default
    const audit = await api.createAudit({ orgId, branchId: branchId!, surveyId: createdSurveyId, assignedTo: admin.id })
    createdAuditId = audit.id

    // Reassign only DRAFT audits to anotherUser
    const reassignedCount = await api.reassignUnstartedAuditsForBranches([branchId!], anotherUser.id)
    expect(reassignedCount).toBeGreaterThan(0)

    const afterReassign = await api.getAuditById(audit.id)
    expect(afterReassign?.assignedTo).toBe(anotherUser.id)

    // Find the actual question id from survey readback
    const fullSurvey = (await api.getSurveyById(createdSurveyId)) as Survey
    const qId = fullSurvey?.sections?.[0]?.questions?.[0]?.id as string
    expect(typeof qId).toBe('string')

    // Set override score and note
    const afterOverride = await api.setOverrideScore(audit.id, qId, 5, 'grant points', admin.id)
    expect(afterOverride.overrideScores?.[qId]).toBe(5)
    expect(afterOverride.overrideNotes?.[qId]).toBe('grant points')

    // Save progress to move from DRAFT -> IN_PROGRESS (required before submit)
    await api.saveAuditProgress(audit.id, { responses: { [qId]: 'yes' } })

    // Submit for approval as the assignee
    const submitted = await api.submitAuditForApproval(audit.id, anotherUser.id)
    expect(submitted.status).toBe(AuditStatus.SUBMITTED)

    // Admin can edit responses without changing status away from SUBMITTED
    const edited = await api.adminEditAudit(audit.id, { responses: { [qId]: 'no' } }, admin.id)
    expect(edited.status).toBe(AuditStatus.SUBMITTED)
    expect(edited.responses?.[qId]).toBe('no')
  }, 60000)

  it('reassigns IN_PROGRESS audits via reassignOpenAuditsForBranches', async () => {
    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(1)
    const u1 = users[0]
    const u2 = users.find(u => u.id !== u1.id) || users[0]

    const orgs = await api.getOrganizations()
    expect(orgs.length).toBeGreaterThan(0)
    const orgId = orgs[0].id

    // Pick existing branch or create one
    const branches = await api.getBranches(orgId)
    const branchId = branches[0]?.id || (await api.createBranch({ orgId, name: `Reassign Branch ${Date.now()}` })).id
    if (!branches[0]) createdBranchId = branchId

    // Create a minimal survey
    const s = await api.createSurvey({
      title: `ReassignOpen ${Date.now()}`,
      description: 'tmp',
      createdBy: u1.id,
      sections: [
        { id: 's1', title: 'P1', description: '', order: 0, questions: [] },
      ],
    })
    const surveyId = s.id

    const audit = await api.createAudit({ orgId, branchId, surveyId, assignedTo: u1.id })
    createdAuditId = audit.id

    // Move to IN_PROGRESS via save
    await api.saveAuditProgress(audit.id, { responses: {} })

    const changed = await api.reassignOpenAuditsForBranches([branchId], u2.id)
    expect(changed).toBeGreaterThan(0)

    const after = await api.getAuditById(audit.id)
    expect(after?.assignedTo).toBe(u2.id)

    // cleanup audit (delete ensures survey can be removed)
    await api.deleteAudit(audit.id)
    createdAuditId = null
    // cleanup survey
    await api.deleteSurvey(surveyId)
  }, 60000)

  afterAll(async () => {
    // Best-effort cleanup
    if (createdAuditId) {
      try { await api.manualArchiveAudit(createdAuditId, ''); } catch {}
      createdAuditId = null
    }
    if (createdSurveyId) {
      try { await api.deleteSurvey(createdSurveyId); } catch {}
      createdSurveyId = null
    }
    if (createdBranchId) {
      try { await api.deleteBranch(createdBranchId); } catch {}
      createdBranchId = null
    }
  })
})
