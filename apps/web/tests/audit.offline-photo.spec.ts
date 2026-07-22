import { test, expect } from '@playwright/test'
import {
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  ensureAuditorAssignedToBranch,
  ensureAuditFor,
  deleteAudits,
  getAdminClient,
} from './helpers/e2eSetup'

// End-to-end proof of the offline photo-capture outbox (utils/photoOutbox). Uses a
// REAL browser IndexedDB (jsdom has none) via page.context().setOffline:
//   - capture while offline -> a "Saved offline" tile appears and NOTHING uploads;
//   - the compressed blob is durably in IndexedDB (read directly — the old code
//     kept it only in an in-memory object URL and lost it) -- the whole point;
//   - on reconnect it flushes to exactly ONE audit_photos row, and a further reload
//     (which re-triggers flush) still yields exactly one row (exactly-once replay).
// (An offline page reload can't be tested against the Vite dev server: setOffline
// blocks the localhost document fetch too; a direct IndexedDB read proves the same
// durability more strongly.)
async function outboxCount(page: import('@playwright/test').Page, aid: string): Promise<number> {
  return page.evaluate(
    (auditId) =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('trakr-photo-outbox', 1)
        req.onsuccess = () => {
          try {
            const all = req.result.transaction('photos', 'readonly').objectStore('photos').getAll()
            all.onsuccess = () => resolve((all.result as Array<{ auditId: string }>).filter((r) => r.auditId === auditId).length)
            all.onerror = () => resolve(-1)
          } catch { resolve(-1) }
        }
        req.onerror = () => resolve(-1)
      }),
    aid,
  )
}
const PNG_1x1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
const pngBuffer = Buffer.from(PNG_1x1_BASE64, 'base64')

test.describe('Offline photo capture outbox', () => {
  test.setTimeout(120_000)

  let orgId: string
  let branchId: string
  let surveyId: string
  let auditId: string
  const createdAuditIds: string[] = []

  test.beforeAll(async () => {
    const auditor = await getUserByEmail('auditor@trakr.com')
    if (!auditor?.org_id) throw new Error('Seed auditor@trakr.com missing or has no org_id')
    orgId = auditor.org_id
    branchId = (await ensureBranchForOrg(orgId, 'E2E Offline Photo Branch')).id
    surveyId = (await ensureSimpleSurvey(orgId, 'E2E Offline Photo Survey')).id
    await ensureAuditorAssignedToBranch(auditor.id, branchId)
    const audit = await ensureAuditFor(auditor.id, orgId, branchId, surveyId) // DRAFT, editable
    auditId = audit.id
    createdAuditIds.push(audit.id)
  })

  test.afterAll(async () => {
    await deleteAudits(createdAuditIds) // also removes the storage objects
  })

  async function countPhotos(): Promise<number> {
    const admin = getAdminClient()
    const { count } = await admin
      .from('audit_photos')
      .select('*', { count: 'exact', head: true })
      .eq('audit_id', auditId)
    return count ?? 0
  }

  test('captures offline, survives reload, flushes exactly once on reconnect', async ({ page, context }) => {
    // Sign in as the assigned auditor (email/password to guarantee the account).
    await page.goto('/login')
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'auditor@trakr.com')
    await page.fill('input[type="password"]', 'Password@123')
    await page.getByRole('button', { name: /Sign in|Log in/i }).click()
    await page.waitForURL((u) => u.pathname.includes('/dashboard'), { timeout: 60_000 })

    // Open the audit wizard (warms the React Query cache so an offline reload can rehydrate).
    await page.goto(`/audit/${auditId}/wizard`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /Add Photos/i })).toBeVisible({ timeout: 30_000 })

    // Go offline and capture a photo.
    await context.setOffline(true)
    await page.setInputFiles('input[type="file"]', { name: 'offline.png', mimeType: 'image/png', buffer: pngBuffer })

    // Pending tile appears; nothing is uploaded while offline.
    await expect(page.getByText('Saved offline').first()).toBeVisible({ timeout: 15_000 })
    expect(await countPhotos()).toBe(0)

    // The compressed blob is durably persisted in IndexedDB (not a transient
    // in-memory object URL) — this is what makes it survive a crash/reload.
    expect(await outboxCount(page, auditId)).toBe(1)

    // Simulate a crash mid-upload: strand the record at 'uploading' in IndexedDB.
    // The flush must reclaim it (not leave it stuck forever).
    await page.evaluate(
      (auditId) =>
        new Promise<void>((resolve) => {
          const req = indexedDB.open('trakr-photo-outbox', 1)
          req.onsuccess = () => {
            const tx = req.result.transaction('photos', 'readwrite')
            const store = tx.objectStore('photos')
            const all = store.getAll()
            all.onsuccess = () => {
              for (const r of all.result as Array<{ auditId: string; status: string }>) {
                if (r.auditId === auditId) { r.status = 'uploading'; store.put(r) }
              }
            }
            tx.oncomplete = () => resolve()
            tx.onerror = () => resolve()
          }
          req.onerror = () => resolve()
        }),
      auditId,
    )

    // Reconnect -> the outbox reclaims the stranded record and flushes it to
    // exactly one server row; the pending record is purged after confirmation.
    await context.setOffline(false)
    await expect.poll(() => countPhotos(), { timeout: 30_000, intervals: [1000] }).toBe(1)
    await expect(page.getByText('Saved offline')).toHaveCount(0, { timeout: 20_000 })
    await expect.poll(() => outboxCount(page, auditId), { timeout: 15_000, intervals: [1000] }).toBe(0)

    // Exactly-once: another reload re-triggers flush but must not duplicate.
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    expect(await countPhotos()).toBe(1)
  })
})
