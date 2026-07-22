import { test, expect } from '@playwright/test'
import { getUserClient, getAnonClient } from './helpers/e2eSetup'

// Phase 5 guardrail: dev_mode must be off on the production database, and it must
// stay off even if the dev_mode flag is flipped, because app_config.environment is
// 'production' and is_dev_mode() short-circuits on that. This protects against a
// future policy re-introducing `is_dev_mode() OR ...` and accidentally disabling
// RLS in production. The mutation half (dev_mode='true' still yields false) is
// proven by a non-persisting rollback transaction in the migration; here we assert
// the live invariant without mutating shared-DB global config.
test.describe('dev_mode production guardrail', () => {
  test('is_dev_mode() returns false on the production database', async () => {
    const supa = await getUserClient('admin@trakr.com', 'Password@123')
    const { data, error } = await supa.rpc('is_dev_mode')
    expect(error, error?.message).toBeNull()
    expect(data).toBe(false)
  })

  test('anon cannot execute is_dev_mode()', async () => {
    const anon = getAnonClient()
    test.skip(!anon, 'anon key not provided to e2e env')
    const { error } = await anon!.rpc('is_dev_mode')
    expect(error, 'anon EXECUTE on is_dev_mode must be revoked').toBeTruthy()
  })
})
