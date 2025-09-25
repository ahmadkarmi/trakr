import '@testing-library/jest-dom'
import { beforeAll } from 'vitest'
import { getSupabase } from './utils/supabaseClient'

// jsdom doesn't implement scrollTo; stub to avoid errors in components that may call it.
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true })

// Reduce noise in test output: filter only the known React testing act() warnings.
// We still surface all other warnings/errors.
const originalError = console.error
const originalWarn = console.warn
const suppressPatterns = [
  /Warning:.*not wrapped in act/i,
  /When testing, code that causes React state updates should be wrapped in act/i,
  /An update to .* inside a test was not wrapped in act/i,
]

type ConsoleArgs = Parameters<typeof console.error>
console.error = (...args: ConsoleArgs) => {
  const first = args[0]
  if (typeof first === 'string' && suppressPatterns.some((re) => re.test(first))) {
    return
  }
  originalError(...args)
}

type ConsoleWarnArgs = Parameters<typeof console.warn>
console.warn = (...args: ConsoleWarnArgs) => {
  const first = args[0]
  if (typeof first === 'string' && suppressPatterns.some((re) => re.test(first))) {
    return
  }
  originalWarn(...args)
}

// Ensure Supabase sign-in happens BEFORE tests run when using the Supabase backend.
beforeAll(async () => {
  try {
    const backend = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase()
    if (backend !== 'supabase') return
    const supabase = getSupabase()
    const { data: sessionRes } = await supabase.auth.getSession()
    if (sessionRes?.session?.user) return
    const email = (import.meta as any).env?.VITE_TEST_EMAIL || (globalThis as any)?.process?.env?.VITE_TEST_EMAIL
    const password = (import.meta as any).env?.VITE_TEST_PASSWORD || (globalThis as any)?.process?.env?.VITE_TEST_PASSWORD
    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[setupTests] Supabase sign-in failed:', error.message)
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('[setupTests] Missing VITE_TEST_EMAIL / VITE_TEST_PASSWORD for Supabase tests under RLS')
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[setupTests] Supabase pre-test sign-in skipped due to error:', (e as any)?.message || e)
  }
})
