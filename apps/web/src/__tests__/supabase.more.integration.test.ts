import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { api } from '../utils/api'
import type { Survey } from '@trakr/shared'
import { QuestionType, AuditStatus, UserRole } from '@trakr/shared'
import { getSupabaseTestProfile, ensureAuditorCoverage } from '../tests/utils/supabaseFixtures'

// Only run when VITE_BACKEND === 'supabase'
const isSupabase = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase() === 'supabase'
const maybe = isSupabase ? describe : describe.skip

maybe('Supabase integration (assignments + overrides + admin edit)', () => {
  let createdBranchId: string | null = null
  let createdSurveyId: string | null = null
  let createdAuditId: string | null = null
  let defaultOrgId: string | null = null

  beforeAll(async () => {
    const { orgId } = await getSupabaseTestProfile()
    defaultOrgId = orgId
  })

  const resolveOrgId = async () => {
    if (defaultOrgId) return defaultOrgId
    const orgs = await api.getOrganizations()
    if (!orgs.length) throw new Error('No organizations available in Supabase fixture')
    return orgs[0].id
  }

  it('reassigns DRAFT audits via reassignUnstartedAuditsForBranches and supports override/admin edit', async () => {
    // Ensure users and orgs
    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(0)
    // Find an actual admin user (ADMIN or SUPER_ADMIN role)
    const admin = users.find(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN)
    if (!admin) throw new Error('No admin user found for testing admin edit functionality')
    const anotherUser = users.find(u => u.id !== admin.id) || users[0]

    const orgs = await api.getOrganizations()
    expect(orgs.length).toBeGreaterThan(0)
    const orgId = await resolveOrgId()

    // Ensure we have a branch to work with
    const branches = await api.getBranches(orgId)
    const branchId: string = branches[0]?.id || (() => {
      // Branch will be created inline below if needed
      return ''
    })()
    
    if (!branchId) {
      const newBranch = await api.createBranch({ orgId, name: `Test Branch ${Date.now()}` })
      createdBranchId = newBranch.id
    }
    
    const finalBranchId = branchId || createdBranchId!
    await ensureAuditorCoverage(admin.id, orgId, finalBranchId)
    await ensureAuditorCoverage(anotherUser.id, orgId, finalBranchId)
    // Create a survey with one weighted yes/no question
    const created = await api.createSurvey({
      title: `Integration Survey ${Date.now()}`,
      description: 'tmp',
      createdBy: admin.id,
      orgId,
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
    if (!createdSurveyId) throw new Error('Survey creation failed')

    // Create an audit assigned to admin (any user) – DRAFT by default
    const audit = await api.createAudit({ orgId, branchId: finalBranchId, surveyId: createdSurveyId, assignedTo: admin.id })
    createdAuditId = audit.id

    // Reassign only DRAFT audits to anotherUser
    const reassignedCount = await api.reassignUnstartedAuditsForBranches([finalBranchId], anotherUser.id)
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
    expect(submitted).not.toBeNull()
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
    const orgId = await resolveOrgId()

    // Pick existing branch or create one
    const branches = await api.getBranches(orgId)
    let branchId: string
    if (branches[0]?.id) {
      branchId = branches[0].id
    } else {
      const created = await api.createBranch({ orgId, name: `Reassign Branch ${Date.now()}` })
      createdBranchId = created.id
      branchId = created.id
    }

    await ensureAuditorCoverage(u1.id, orgId, branchId)
    await ensureAuditorCoverage(u2.id, orgId, branchId)

    // Create a minimal survey
    const s = await api.createSurvey({
      title: `ReassignOpen ${Date.now()}`,
      description: 'tmp',
      createdBy: u1.id,
      orgId,
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
