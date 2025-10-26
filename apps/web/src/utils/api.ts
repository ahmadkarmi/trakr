// Central API wrapper for the web app.
// Using Supabase backend directly - mock API removed
import { supabaseApi } from './supabaseApi'
import { logger } from './logger'

// Force Supabase in development - change back to 'mock' if needed for testing
const backend = ((import.meta as any).env?.VITE_BACKEND || 'supabase').toLowerCase()

// Production safeguard - prevent accidentally using mock backend in production
if (!import.meta.env.DEV && backend !== 'supabase') {
  const error = 'CRITICAL: Production must use Supabase backend. Check VITE_BACKEND environment variable.'
  logger.error(error, new Error(error), { context: 'API', data: { backend } })
  throw new Error(error)
}

// Log warning if backend is not supabase in development
if (backend !== 'supabase') {
  logger.warn('Only Supabase backend is supported', { context: 'API' })
}

// Export supabaseApi as api
export const api = supabaseApi
