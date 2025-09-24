import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Do not throw here because this file may exist while backend is still mocked.
  // Consumers should only import this when VITE_BACKEND === 'supabase'.
  // eslint-disable-next-line no-console
  console.warn('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getSupabase() {
  return supabase
}
