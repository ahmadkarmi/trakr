import { describe, it, expect } from 'vitest'
import { api } from '../utils/api'
import type { Survey } from '@trakr/shared'

// Only run when VITE_BACKEND === 'supabase'
const isSupabase = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase() === 'supabase'
const maybe = isSupabase ? describe : describe.skip

const PNG_1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='

maybe('Supabase storage integration', () => {
  it('updates user avatar and signature via storage uploads', async () => {
    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(0)
    const u = users.find(x => (x.email || '').toLowerCase() === 'auditor@trakr.com') || users[0]

    const afterAvatar = await api.setUserAvatar(u.id, PNG_1x1)
    expect(afterAvatar.avatarUrl && typeof afterAvatar.avatarUrl === 'string').toBe(true)
    expect(afterAvatar.avatarUrl!.startsWith('http')).toBe(true)

    const afterSig = await api.setUserSignature(u.id, PNG_1x1)
    expect(afterSig.signatureUrl && typeof afterSig.signatureUrl === 'string').toBe(true)
    expect(afterSig.signatureUrl!.startsWith('http')).toBe(true)
  }, 60000)

  it('adds a section photo to an audit and returns it from getAuditById', async () => {
    const orgs = await api.getOrganizations()
    expect(orgs.length).toBeGreaterThan(0)
    const orgId = orgs[0].id

    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(0)
    const u = users[0]

    // Create a survey with one section
    const created = await api.createSurvey({
      title: `Storage Test ${Date.now()}`,
      description: 'tmp',
      createdBy: u.id,
      sections: [
        { id: 's1', title: 'P1', description: '', order: 0, questions: [] },
      ],
    })

    // get section id from DB (new id generated on insert)
    const survey = (await api.getSurveyById(created.id)) as Survey
    const sectionId = survey.sections?.[0]?.id as string
    expect(typeof sectionId).toBe('string')

    // Create audit and add a section photo
    const branches = await api.getBranches(orgId)
    const branchId = branches[0]?.id || (await api.createBranch({ orgId, name: `Storage Branch ${Date.now()}` })).id
    const audit = await api.createAudit({ orgId, branchId, surveyId: created.id, assignedTo: u.id })
    const photo = await api.addSectionPhoto(audit.id, sectionId, { filename: 'test.png', url: PNG_1x1, uploadedBy: u.id })
    expect(photo && photo.id && photo.url).toBeTruthy()

    // Read back
    const withPhotos = await api.getAuditById(audit.id)
    expect(withPhotos?.sectionPhotos && withPhotos.sectionPhotos.length).toBeGreaterThan(0)

    // Cleanup
    await api.deleteAudit(audit.id)
    await api.deleteSurvey(created.id)
  }, 60000)
})
