import { describe, it, expect, beforeAll } from 'vitest'
import { api } from '../utils/api'
import { AuditStatus } from '@trakr/shared'
import { getSupabaseTestProfile, ensureAuditorCoverage } from '../tests/utils/supabaseFixtures'

const isSupabase = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase() === 'supabase'
const maybe = isSupabase ? describe : describe.skip

maybe('Supabase assignment policy behavior', () => {
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

  it('does not allow reassigning SUBMITTED audits', async () => {
    const orgs = await api.getOrganizations()
    expect(orgs.length).toBeGreaterThan(0)
    const orgId = await resolveOrgId()

    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(1)
    const auditors = users.filter(u => (u.role || '').toLowerCase() === 'auditor')
    const u1 = auditors[0] || users[0]
    const u2 = auditors.find(u => u.id !== u1.id) || users.find(u => u.id !== u1.id) || users[0]

    // ensure branch
    const branches = await api.getBranches(orgId)
    let branchId: string | null = branches[0]?.id ?? null
    if (!branchId) {
      const created = await api.createBranch({ orgId, name: `Assign Policy Branch ${Date.now()}` })
      branchId = created.id
    }
    if (!branchId) throw new Error('Failed to resolve branch for assignment policy test')
    await ensureAuditorCoverage(u1.id, orgId, branchId)
    await ensureAuditorCoverage(u2.id, orgId, branchId)

    // create minimal survey
    const s = await api.createSurvey({
      title: `AssignPolicy ${Date.now()}`,
      description: 'tmp',
      createdBy: u1.id,
      orgId,
      sections: [ { id: 's1', title: 'P1', description: '', order: 0, questions: [] } ],
    })

    const resolvedBranchId = branchId
    const audit = await api.createAudit({ orgId, branchId: resolvedBranchId, surveyId: s.id, assignedTo: u1.id })
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
