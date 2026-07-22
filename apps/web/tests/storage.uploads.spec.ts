import { test, expect } from '@playwright/test'
import {
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  ensureAuditorAssignedToBranch,
  ensureAuditFor,
  deleteAudits,
  getUserClient,
  getAnonClient,
} from './helpers/e2eSetup'

// Regression coverage for the storage-upload RLS bug (PR #99) AND the Phase 1a
// audit-photos privatization. The audit-photos bucket is now private and its
// storage.objects policies are org-scoped on the audits/<auditId>/... path
// segment (via storage_audit_in_my_org, a SECURITY DEFINER helper). These specs
// drive the real authenticated path (not the service key, which bypasses RLS):
//   - an in-org auditor can upload under their own audit's path and read it back
//     via a signed URL (the display/PDF path);
//   - an upload under an audit id that isn't in the caller's org is denied;
//   - profile-media (now private too, 1a-2): a user can write their own
//     avatar/signature path but not another user's;
//   - anon can enumerate neither bucket.
//
// 1x1 transparent PNG.
const PNG_1x1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='

function pngBlob(): Blob {
  const bytes = Uint8Array.from(atob(PNG_1x1_BASE64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: 'image/png' })
}

test.describe('Authenticated storage uploads (RLS)', () => {
  test.setTimeout(90_000)

  let orgId: string
  let branchId: string
  let surveyId: string
  let auditId: string
  let auditorUserId: string
  const uploaded: Array<{ bucket: string; path: string }> = []
  const createdAuditIds: string[] = []

  test.beforeAll(async () => {
    const auditor = await getUserByEmail('auditor@trakr.com')
    if (!auditor) throw new Error('Seed user auditor@trakr.com missing')
    if (!auditor.org_id) throw new Error('auditor@trakr.com has no org_id')
    orgId = auditor.org_id
    auditorUserId = auditor.id
    const branch = await ensureBranchForOrg(orgId, 'E2E Storage Branch')
    branchId = branch.id
    const survey = await ensureSimpleSurvey(orgId, 'E2E Storage Survey')
    surveyId = survey.id
    await ensureAuditorAssignedToBranch(auditor.id, branchId)
    const audit = await ensureAuditFor(auditor.id, orgId, branchId, surveyId)
    auditId = audit.id
    createdAuditIds.push(audit.id)
  })

  test.afterAll(async () => {
    if (uploaded.length) {
      const supa = await getUserClient('auditor@trakr.com', 'Password@123')
      for (const { bucket, path } of uploaded) {
        await supa.storage.from(bucket).remove([path]).catch(() => {})
      }
    }
    await deleteAudits(createdAuditIds)
  })

  test('user can upload their own avatar to profile-media (own path)', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const path = `avatars/${auditorUserId}/e2e-${Date.now()}.png`
    const { error } = await supa.storage
      .from('profile-media')
      .upload(path, pngBlob(), { contentType: 'image/png', upsert: true })
    expect(error, error?.message).toBeNull()
    uploaded.push({ bucket: 'profile-media', path })
  })

  test('user CANNOT upload profile media under another user\'s path (own-only RLS)', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const otherUserId = '00000000-0000-0000-0000-000000000000'
    const path = `avatars/${otherUserId}/e2e-${Date.now()}.png`
    const { data, error } = await supa.storage
      .from('profile-media')
      .upload(path, pngBlob(), { contentType: 'image/png', upsert: true })
    expect(error, 'upload under another user\'s profile path must be denied by RLS').toBeTruthy()
    if (!error && data) uploaded.push({ bucket: 'profile-media', path })
  })

  test('auditor can upload an audit photo under their own audit path', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const path = `audits/${auditId}/e2e-${Date.now()}.png`
    const { error } = await supa.storage
      .from('audit-photos')
      .upload(path, pngBlob(), { contentType: 'image/png', upsert: true })
    expect(error, error?.message).toBeNull()
    uploaded.push({ bucket: 'audit-photos', path })
  })

  test('auditor can read back their own audit photo via a signed URL (display/PDF path)', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const path = `audits/${auditId}/e2e-signed-${Date.now()}.png`
    const up = await supa.storage.from('audit-photos').upload(path, pngBlob(), { contentType: 'image/png', upsert: true })
    expect(up.error, up.error?.message).toBeNull()
    uploaded.push({ bucket: 'audit-photos', path })

    const { data, error } = await supa.storage.from('audit-photos').createSignedUrl(path, 60)
    expect(error, error?.message).toBeNull()
    expect(data?.signedUrl).toBeTruthy()
    const res = await fetch(data!.signedUrl)
    expect(res.status, 'signed URL must serve the object').toBe(200)
  })

  test('auditor CANNOT upload under an audit that is not in their org (org-scoped RLS)', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    // A random UUID is not an audit in the caller's org → storage_audit_in_my_org false.
    const foreignAuditId = '00000000-0000-0000-0000-000000000000'
    const path = `audits/${foreignAuditId}/e2e-${Date.now()}.png`
    const { data, error } = await supa.storage
      .from('audit-photos')
      .upload(path, pngBlob(), { contentType: 'image/png', upsert: true })
    expect(error, 'upload under a foreign audit path must be denied by RLS').toBeTruthy()
    if (!error && data) uploaded.push({ bucket: 'audit-photos', path }) // cleanup if it wrongly succeeded
  })

  test('anon cannot enumerate either media bucket (hardening preserved)', async () => {
    const anon = getAnonClient()
    test.skip(!anon, 'anon key not provided to e2e env')
    const profile = await anon!.storage.from('profile-media').list('avatars', { limit: 1 })
    expect(profile.error).toBeNull()
    expect(profile.data ?? []).toHaveLength(0)
    const photos = await anon!.storage.from('audit-photos').list('audits', { limit: 1 })
    // Private bucket: anon is RLS-filtered to nothing (list returns empty, not the objects).
    expect(photos.data ?? []).toHaveLength(0)
  })
})
