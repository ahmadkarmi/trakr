import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string | undefined

let supabase: any | null = null

export function hasSupabaseEnv(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey
}

export function getSupabase() {
  if (!hasSupabaseEnv()) {
    throw new Error('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }
  if (!supabase) {
    supabase = createClient(supabaseUrl as string, supabaseAnonKey as string)
  }
  return supabase
}
