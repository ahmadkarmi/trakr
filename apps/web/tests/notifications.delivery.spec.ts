import { test, expect, type Page } from '@playwright/test'
import {
  getUserByEmail,
  ensureBranchForOrg,
  ensureSimpleSurvey,
  ensureBranchManagerAssigned,
  ensureAuditFor,
  setAuditSubmitted,
  getFirstQuestionId,
  getNotificationsFor,
  insertNotificationAs,
  deleteNotificationProbes,
  deleteAudits,
} from './helpers/e2eSetup'
// NOTE: deliberately does NOT assign auditor@trakr.com to this branch. That
// auditor's assignment row is a single shared record (assignAuditor REPLACES
// its branch_ids), so touching it here races branch.activation-guard.spec,
// which relies on that auditor's coverage for its own branch. This spec
// doesn't need it: the audit is inserted directly with assigned_to, and the
// approval is gated on the MANAGER's assignment, not the auditor's.

// Regression coverage for the cross-user notification bug (PR #115):
// createNotification chained .select() onto the insert, and INSERT ...
// RETURNING also requires the new row to satisfy the SELECT policy
// (user_id = current_user_id()) - impossible for the SENDER of a cross-user
// notification. Every auditor->manager / manager->auditor notification
// silently failed RLS 42501; only self-notifications worked. Nothing caught
// it because no test asserted a notification actually LANDS for its recipient.
test.describe('Cross-user notification delivery', () => {
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

    const branch = await ensureBranchForOrg(orgId, 'E2E Notify Branch')
    branchId = branch.id
    const survey = await ensureSimpleSurvey(orgId, 'E2E Notify Survey')
    surveyId = survey.id
    await getFirstQuestionId(surveyId)
    await ensureBranchManagerAssigned(managerId, branchId)
  })

  const createdAuditIds: string[] = []
  test.afterAll(async () => {
    await deleteNotificationProbes()
    await deleteAudits(createdAuditIds)
  })

  // Transport-level guard: the fastest, least flaky assertion that the
  // INSERT policy permits a same-org cross-user send. Directly mirrors the
  // failing operation from #115.
  test('a same-org user can insert a notification for another user (both directions)', async () => {
    const a2m = await insertNotificationAs('auditor@trakr.com', 'Password@123', managerId)
    expect(a2m, a2m ? `auditor->manager: ${a2m.code} ${a2m.message}` : undefined).toBeNull()

    const m2a = await insertNotificationAs('branchmanager@trakr.com', 'Password@123', auditorId)
    expect(m2a, m2a ? `manager->auditor: ${m2a.code} ${m2a.message}` : undefined).toBeNull()
    // Probe rows are title-tagged and removed in afterAll (deleteNotificationProbes).
  })

  // End-to-end guard through real app code: approving a submitted audit in the
  // manager UI fires notifyAuditApproved -> createNotification (manager ->
  // auditor). Assert the auditor's notification row actually materializes.
  test('approving an audit delivers an AUDIT_APPROVED notification to the auditor', async ({ page }) => {
    const audit = await ensureAuditFor(auditorId, orgId, branchId, surveyId)
    createdAuditIds.push(audit.id)
    await setAuditSubmitted(audit.id, auditorId)

    await loginAsBranchManager(page)
    await page.goto(`/audits/${audit.id}/summary`, { waitUntil: 'networkidle' })

    const approveButton = page.getByRole('button', { name: /Approve/i }).first()
    await expect(approveButton).toBeVisible({ timeout: 20_000 })
    await approveButton.click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 10_000 })
    await modal.getByPlaceholder(/Jane Manager/i).fill('Jane Manager')
    await modal.getByRole('button', { name: /^Approve|Approving/i }).click()

    // The cross-user notification is created after the status flips; poll the
    // recipient's notifications (admin read) until the AUDIT_APPROVED row for
    // this audit shows up. A regression of #115 leaves this empty forever.
    await expect
      .poll(
        async () => {
          const rows = await getNotificationsFor(auditorId, audit.id)
          // enum value is the lowercase 'audit_approved' (NotificationType).
          return rows.some((n) => n.type === 'audit_approved')
        },
        { timeout: 30_000, intervals: [1_000] },
      )
      .toBe(true)
  })
})

async function loginAsBranchManager(page: Page) {
  await page.goto('/login')
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login', { waitUntil: 'networkidle' })
  try {
    const roleButton = page.getByRole('button', { name: /Branch Manager/i }).first()
    if (await roleButton.isVisible({ timeout: 5_000 })) {
      await roleButton.click()
      await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 30_000 })
      return
    }
  } catch {
    // fall through to credentials
  }
  await page.fill('input[type="email"]', 'branchmanager@trakr.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.getByRole('button', { name: /Sign in|Log in/i }).click()
  await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 30_000 })
}
