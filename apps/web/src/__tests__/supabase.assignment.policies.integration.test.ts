import { describe, it, expect } from 'vitest'
import { api } from '../utils/api'
import { AuditStatus } from '@trakr/shared'

const isSupabase = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase() === 'supabase'
const maybe = isSupabase ? describe : describe.skip

maybe('Supabase assignment policy behavior', () => {
  it('does not allow reassigning SUBMITTED audits', async () => {
    const orgs = await api.getOrganizations()
    expect(orgs.length).toBeGreaterThan(0)
    const orgId = orgs[0].id

    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(1)
    const u1 = users[0]
    const u2 = users.find(u => u.id !== u1.id) || users[0]

    // ensure branch
    const branches = await api.getBranches(orgId)
    const branchId = branches[0]?.id || (await api.createBranch({ orgId, name: `Assign Policy Branch ${Date.now()}` })).id

    // create minimal survey
    const s = await api.createSurvey({
      title: `AssignPolicy ${Date.now()}`,
      description: 'tmp',
      createdBy: u1.id,
      sections: [ { id: 's1', title: 'P1', description: '', order: 0, questions: [] } ],
    })

    const audit = await api.createAudit({ orgId, branchId, surveyId: s.id, assignedTo: u1.id })
    // move to in progress
    await api.saveAuditProgress(audit.id, { responses: {} })

    // submit
    const submitted = await api.submitAuditForApproval(audit.id, u1.id)
    expect(submitted.status).toBe(AuditStatus.SUBMITTED)

    // attempt reassign
    await api.setAuditAssignedTo(audit.id, u2.id)
    const after = await api.getAuditById(audit.id)
    // should remain with original assignee
    expect(after?.assignedTo).toBe(u1.id)

    // cleanup
    await api.deleteAudit(audit.id)
    await api.deleteSurvey(s.id)
  }, 60000)
})
