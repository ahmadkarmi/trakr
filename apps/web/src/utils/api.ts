// Central API wrapper for the web app.
// Swap between mock and supabase backends without touching feature code.
import { mockApi } from '@trakr/shared'
import { supabaseApi } from './supabaseApi'

const backend = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase()
// During incremental migration, route known methods to Supabase and fall back to
// the mock API for anything not yet implemented. This prevents runtime errors
// on screens that still rely on unported endpoints while allowing us to switch
// the backend flag safely.
const __warnedFallbacks = new Set<string>()
const proxyApi = new Proxy(supabaseApi as any, {
  get(target, prop, receiver) {
    const supaVal = Reflect.get(target, prop, receiver)
    if (typeof supaVal !== 'undefined') return supaVal
    const mockVal = (mockApi as any)[prop]
    // Dev-only: warn once per missing method to surface migration gaps
    const key = String(prop)
    if (!__warnedFallbacks.has(key)) {
      try {
        // eslint-disable-next-line no-console
        console.warn(`[api] Falling back to mockApi.${key} (Supabase not implemented)`) // visible in dev console/tests
      } catch {}
      __warnedFallbacks.add(key)
    }
    if (typeof mockVal === 'function') return mockVal.bind(mockApi)
    return mockVal
  },
})

export const api: typeof mockApi = (backend === 'supabase' ? (proxyApi as any) : mockApi) as typeof mockApi
