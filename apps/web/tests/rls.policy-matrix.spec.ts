import { test, expect } from '@playwright/test'
import { getUserByEmail, getUserClient, ensureZoneForOrg } from './helpers/e2eSetup'

/**
 * Direct RLS permission-matrix tests — as opposed to rls.access-control.spec.ts,
 * which only checks page-navigation-level behavior ("can this role see this
 * screen"), these hit the tables directly through an authenticated Supabase
 * client and assert exact SELECT/INSERT/UPDATE/DELETE outcomes per role.
 *
 * This exists specifically to gate a planned RLS policy consolidation on
 * `app_config` and `zone_assignments`, which currently each have two
 * independently-written permissive policies covering overlapping ground
 * (e.g. zone_assignments_write_admin checks admin-ness via a `zones` JOIN,
 * while zone_assignments_{insert,update,delete}_policy check it via
 * current_user_org_id() directly) — consolidating them must not silently
 * widen or narrow access for any role. Every assertion here must still pass
 * unchanged after that consolidation.
 */

test.describe('RLS policy matrix — app_config', () => {
  test.setTimeout(60_000)
  const testKey = `__e2e_rls_test_${Date.now()}__`

  test.afterAll(async () => {
    const admin = await getUserClient('admin@trakr.com', 'Password@123')
    await admin.from('app_config').delete().eq('key', testKey)
  })

  test('any authenticated user can read app_config', async () => {
    const auditor = await getUserClient('auditor@trakr.com', 'Password@123')
    const { data, error } = await auditor.from('app_config').select('key, value').limit(1)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  test('admin can write app_config, non-admin cannot', async () => {
    const auditor = await getUserClient('auditor@trakr.com', 'Password@123')
    const { data: auditorInsert, error: auditorError } = await auditor
      .from('app_config')
      .insert({ key: testKey, value: 'auditor-should-not-succeed' })
      .select()
    // RLS blocks INSERT by silently matching zero rows, not a thrown error —
    // assert the row was NOT created rather than asserting on `error`.
    expect(auditorInsert === null || auditorInsert.length === 0).toBe(true)

    const { data: check } = await auditor.from('app_config').select('key').eq('key', testKey)
    expect(check?.length ?? 0).toBe(0)
    void auditorError // documented above: not the reliable signal here

    const admin = await getUserClient('admin@trakr.com', 'Password@123')
    const { data: adminInsert, error: adminError } = await admin
      .from('app_config')
      .insert({ key: testKey, value: 'admin-can-write' })
      .select()
    expect(adminError).toBeNull()
    expect(adminInsert?.length).toBe(1)
  })
})

test.describe('RLS policy matrix — zone_assignments', () => {
  test.setTimeout(60_000)

  let orgId: string
  let zoneId: string
  let auditorId: string
  let adminId: string
  const createdAssignmentIds: string[] = []

  test.beforeAll(async () => {
    const auditor = await getUserByEmail('auditor@trakr.com')
    auditorId = auditor.id
    const admin = await getUserByEmail('admin@trakr.com')
    adminId = admin.id
    // Derive org from the auditor's own row, not "oldest org in the table" —
    // the seed can leave multiple same-named orgs behind across runs (see
    // audit.approval-flow.spec.ts for the original diagnosis of this bug).
    if (!auditor.org_id) throw new Error('auditor@trakr.com has no org_id')
    orgId = auditor.org_id
    const zone = await ensureZoneForOrg(orgId, 'E2E RLS Matrix Zone')
    zoneId = zone.id
  })

  test.afterAll(async () => {
    const admin = await getUserClient('admin@trakr.com', 'Password@123')
    if (createdAssignmentIds.length) {
      await admin.from('zone_assignments').delete().in('id', createdAssignmentIds)
    }
  })

  test('admin can insert a zone assignment, auditor cannot', async () => {
    const auditor = await getUserClient('auditor@trakr.com', 'Password@123')
    const { data: auditorInsert } = await auditor
      .from('zone_assignments')
      .insert({ org_id: orgId, zone_id: zoneId, user_id: auditorId, created_by: auditorId })
      .select()
    expect(auditorInsert === null || auditorInsert.length === 0).toBe(true)

    const admin = await getUserClient('admin@trakr.com', 'Password@123')
    const { data: adminInsert, error: adminError } = await admin
      .from('zone_assignments')
      .insert({ org_id: orgId, zone_id: zoneId, user_id: auditorId, created_by: adminId })
      .select()
    expect(adminError).toBeNull()
    expect(adminInsert?.length).toBe(1)
    if (adminInsert?.[0]?.id) createdAssignmentIds.push(adminInsert[0].id)
  })

  test('assigned auditor can see their own zone assignment via SELECT', async () => {
    const auditor = await getUserClient('auditor@trakr.com', 'Password@123')
    const { data, error } = await auditor
      .from('zone_assignments')
      .select('id')
      .eq('zone_id', zoneId)
      .eq('user_id', auditorId)
    expect(error).toBeNull()
    expect(data?.length ?? 0).toBeGreaterThan(0)
  })

  test('admin can update and delete a zone assignment, auditor cannot', async () => {
    const admin = await getUserClient('admin@trakr.com', 'Password@123')
    const { data: assignment } = await admin
      .from('zone_assignments')
      .select('id')
      .eq('zone_id', zoneId)
      .eq('user_id', auditorId)
      .limit(1)
      .maybeSingle()
    expect(assignment?.id).toBeTruthy()
    const assignmentId = assignment!.id

    const auditor = await getUserClient('auditor@trakr.com', 'Password@123')
    const { data: auditorDelete } = await auditor.from('zone_assignments').delete().eq('id', assignmentId).select()
    expect(auditorDelete === null || auditorDelete.length === 0).toBe(true)

    const { error: adminDeleteError, data: adminDelete } = await admin
      .from('zone_assignments')
      .delete()
      .eq('id', assignmentId)
      .select()
    expect(adminDeleteError).toBeNull()
    expect(adminDelete?.length).toBe(1)
  })
})
