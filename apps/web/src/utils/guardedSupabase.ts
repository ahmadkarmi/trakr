import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CircuitBreaker, guardedFetch } from './circuitBreaker'

type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = Parameters<typeof fetch>[1]

const defaultBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30_000 })

export async function guardedRequest(input: FetchInput, init?: FetchInit, opts?: { breaker?: CircuitBreaker; timeoutMs?: number; maxRetries?: number }) {
  return guardedFetch(input as RequestInfo, init as RequestInit, { breaker: opts?.breaker ?? defaultBreaker, timeoutMs: opts?.timeoutMs, maxRetries: opts?.maxRetries })
}

export function createGuardedSupabaseClient(url: string, anonKey: string, options?: { breaker?: CircuitBreaker }): SupabaseClient {
  const breaker = options?.breaker ?? defaultBreaker
  return createClient(url, anonKey, {
    global: {
      fetch: (input: FetchInput, init?: FetchInit) => guardedFetch(input as RequestInfo, init as RequestInit, { breaker }),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}
