import { ensureClientEnv } from '@trakr/shared'
import { createGuardedSupabaseClient } from './guardedSupabase'

type ViteEnvRecord = Record<string, string | undefined>

const clientEnvResult = ensureClientEnv((key: string) => {
  return (import.meta.env as ViteEnvRecord)[key]
})

const supabaseUrl = clientEnvResult.resolved.VITE_SUPABASE_URL
const supabaseAnonKey = clientEnvResult.resolved.VITE_SUPABASE_ANON_KEY

let supabase: any | null = null

export function hasSupabaseEnv(): boolean {
  return clientEnvResult.missing.length === 0
}

export function getSupabase() {
  if (!hasSupabaseEnv()) {
    throw new Error('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  if (!supabase) {
    supabase = createGuardedSupabaseClient(supabaseUrl as string, supabaseAnonKey as string)
  }
  return supabase
}
