import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getFirstOrganization, ensureBranchForOrg, getUserByEmail } from './helpers/e2eSetup'

const REQUIRES_ENV = !process.env.E2E_SUPABASE_SERVICE_KEY || !process.env.E2E_SUPABASE_URL

function getAdminClient() {
  const url = (process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const service = (process.env.E2E_SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !service) throw new Error('Missing E2E_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY')
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
}

test.describe('Branch activation requires auditor coverage', () => {
  test.setTimeout(120_000)
  test.skip(REQUIRES_ENV, 'Requires E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_KEY')

  test('activation fails without coverage, succeeds with coverage', async () => {
    const org = await getFirstOrganization()
    if (!org) test.skip(true, 'No organization available')

    const supa = getAdminClient()
    const b = await ensureBranchForOrg(org.id)

    const { error: e1 } = await supa.from('branches').update({ is_active: true } as any).eq('id', b.id)
    expect(e1).toBeTruthy()

    const auditor = await getUserByEmail('auditor@trakr.com')
    if (!auditor) test.skip(true, 'Auditor user not found')

    const { error: assignErr } = await supa.from('auditor_assignments').insert({ user_id: auditor.id, branch_ids: [b.id], zone_ids: [] } as any)
    if (assignErr) test.skip(true, 'Failed to assign auditor')

    const { error: e2, data: ok } = await supa.from('branches').update({ is_active: true } as any).eq('id', b.id).select('id').single()
    expect(e2).toBeFalsy()
    expect(ok?.id).toBe(b.id)
  })
})
