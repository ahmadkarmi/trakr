import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@trakr/shared'

// Scripted supabase stub: each from('users') terminal call consumes the next
// queued response; auth + functions are plain spies.
type QueryResult = { data: unknown; error: { code?: string; message?: string } | null }

const state = {
  queryQueue: [] as QueryResult[],
  invokeResult: { data: null as unknown, error: null as { message?: string } | null },
  invokeSpy: vi.fn(),
  authUser: { id: 'auth-uid-1', email: 'admin@acme.com' },
}

const builder = () => {
  const next = (): QueryResult => state.queryQueue.shift() ?? { data: null, error: null }
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'ilike']) b[m] = vi.fn(() => b)
  b.maybeSingle = vi.fn(async () => next())
  b.single = vi.fn(async () => next())
  return b
}

vi.mock('../supabaseClient', () => ({
  hasSupabaseEnv: () => true,
  getSupabase: () => ({
    auth: { getUser: async () => ({ data: { user: state.authUser } }) },
    from: () => builder(),
    functions: {
      invoke: (...args: unknown[]) => {
        state.invokeSpy(...args)
        return Promise.resolve(state.invokeResult)
      },
    },
  }),
}))

import { supabaseApi } from '../supabaseApi'

const invitedRow = {
  id: 'new-user-id',
  email: 'new@acme.com',
  full_name: 'New User',
  role: 'AUDITOR',
  org_id: 'org-1',
  branch_id: null,
  created_at: '2026-07-03T00:00:00Z',
  updated_at: '2026-07-03T00:00:00Z',
}

beforeEach(() => {
  state.queryQueue = []
  state.invokeSpy = vi.fn()
  state.invokeResult = { data: { user: invitedRow }, error: null }
})

describe('supabaseApi.inviteUser', () => {
  it('resolves the caller profile via auth_user_id and passes its org to the edge function', async () => {
    state.queryQueue = [
      // resolveCurrentUserProfile: auth_user_id lookup hits (id differs from auth uid)
      { data: { id: 'profile-row-id', org_id: 'org-1' }, error: null },
      // duplicate-email check: no existing user
      { data: null, error: { code: 'PGRST116' } },
    ]

    const user = await supabaseApi.inviteUser('new@acme.com', 'New User', UserRole.AUDITOR)

    expect(state.invokeSpy).toHaveBeenCalledWith('invite-user', {
      body: {
        email: 'new@acme.com',
        name: 'New User',
        role: UserRole.AUDITOR,
        orgId: 'org-1',
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
    })
    expect(user.id).toBe('new-user-id')
    expect(user.orgId).toBe('org-1')
  })

  it('falls back to id lookup for legacy rows where users.id equals the auth uid', async () => {
    state.queryQueue = [
      { data: null, error: null }, // auth_user_id miss
      { data: { id: 'auth-uid-1', org_id: 'org-2' }, error: null }, // id hit
      { data: null, error: { code: 'PGRST116' } }, // no duplicate
    ]

    await supabaseApi.inviteUser('new@acme.com', 'New User', UserRole.AUDITOR)

    expect(state.invokeSpy).toHaveBeenCalledWith('invite-user', expect.objectContaining({
      body: expect.objectContaining({ orgId: 'org-2' }),
    }))
  })

  it('rejects duplicate emails before invoking the edge function', async () => {
    state.queryQueue = [
      { data: { id: 'p', org_id: 'org-1' }, error: null },
      { data: { email: 'new@acme.com' }, error: null }, // duplicate found
    ]

    await expect(supabaseApi.inviteUser('new@acme.com', 'New User', UserRole.AUDITOR))
      .rejects.toThrow(/already exists/)
    expect(state.invokeSpy).not.toHaveBeenCalled()
  })

  it('surfaces edge-function errors', async () => {
    state.queryQueue = [
      { data: { id: 'p', org_id: 'org-1' }, error: null },
      { data: null, error: { code: 'PGRST116' } },
    ]
    state.invokeResult = { data: { error: 'Rate limit exceeded' }, error: null }

    await expect(supabaseApi.inviteUser('new@acme.com', 'New User', UserRole.AUDITOR))
      .rejects.toThrow(/rate limit/i)
  })
})
