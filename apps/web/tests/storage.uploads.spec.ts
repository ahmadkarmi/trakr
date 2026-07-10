import { test, expect } from '@playwright/test'
import { getUserClient, getAnonClient } from './helpers/e2eSetup'

// Regression coverage for the storage-upload RLS bug (PR #99): the 2026-07-03
// hardening dropped the SELECT policy that the upload path needs, and every
// authenticated avatar/signature/audit-photo upload failed with an RLS
// violation in production for six days - undetected because e2e had no upload
// coverage. These specs drive the real authenticated storage path (not the
// service key, which bypasses RLS) so a regression fails CI immediately.
//
// 1x1 transparent PNG.
const PNG_1x1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='

function pngBlob(): Blob {
  const bytes = Uint8Array.from(atob(PNG_1x1_BASE64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: 'image/png' })
}

test.describe('Authenticated storage uploads (RLS)', () => {
  test.setTimeout(60_000)

  const uploaded: Array<{ bucket: string; path: string }> = []

  test.afterAll(async () => {
    if (!uploaded.length) return
    const supa = await getUserClient('admin@trakr.com', 'Password@123')
    for (const { bucket, path } of uploaded) {
      await supa.storage.from(bucket).remove([path]).catch(() => {})
    }
  })

  test('authenticated user can upload to profile-media (avatar path)', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const path = `avatars/e2e-${Date.now()}.png`
    const { error } = await supa.storage
      .from('profile-media')
      .upload(path, pngBlob(), { contentType: 'image/png', upsert: true })
    expect(error, error?.message).toBeNull()
    uploaded.push({ bucket: 'profile-media', path })
  })

  test('authenticated user can upload to audit-photos', async () => {
    const supa = await getUserClient('auditor@trakr.com', 'Password@123')
    const path = `audits/e2e-${Date.now()}.png`
    const { error } = await supa.storage
      .from('audit-photos')
      .upload(path, pngBlob(), { contentType: 'image/png', upsert: true })
    expect(error, error?.message).toBeNull()
    uploaded.push({ bucket: 'audit-photos', path })
  })

  test('anon cannot enumerate a media bucket (hardening preserved)', async () => {
    // The #99 fix restored SELECT for authenticated only; a genuinely anon
    // caller must still list nothing (RLS-filtered) - proving we didn't
    // re-open the enumeration hole the 2026-07-03 hardening closed.
    const anon = getAnonClient()
    test.skip(!anon, 'anon key not provided to e2e env')
    const { data, error } = await anon!.storage.from('profile-media').list('avatars', { limit: 1 })
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })
})
