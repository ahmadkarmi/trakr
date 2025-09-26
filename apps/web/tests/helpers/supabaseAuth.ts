import { Page, test as base } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export async function signInWithMagicLink(page: Page, opts: { email: string; redirectBaseUrl?: string }) {
  const url = (process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const service = (process.env.E2E_SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !service) {
    throw new Error('Missing E2E_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY env vars')
  }

  const redirectBase = (opts.redirectBaseUrl || process.env.BASE_URL || '').trim() || 'http://localhost:3002'
  const supa = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data, error } = await supa.auth.admin.generateLink({
    type: 'magiclink',
    email: opts.email,
    options: { redirectTo: `${redirectBase}/login` },
  })
  if (error) throw error

  // Prefer hashed_token to avoid navigating to external Supabase verify endpoint.
  const hashedToken = (data as any)?.properties?.hashed_token || (data as any)?.hashed_token
  if (hashedToken) {
    await page.goto(`${redirectBase}/login?type=magiclink&token_hash=${hashedToken}`)
    return
  }

  // Fallback across SDK variations
  const actionLink = (data as any)?.properties?.action_link || (data as any)?.action_link
  if (!actionLink) throw new Error('No action_link returned from generateLink')

  await page.goto(actionLink)
  // After App init, the token_hash will be verified and you should be redirected to the home route
}

export const test = base
