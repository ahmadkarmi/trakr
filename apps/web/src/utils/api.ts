// Central API wrapper for the web app.
// Using Supabase backend directly - mock API removed
import { supabaseApi } from './supabaseApi'
import { logger } from './logger'

// Force Supabase in development - change back to 'mock' if needed for testing
const backend = ((import.meta as any).env?.VITE_BACKEND || 'supabase').toLowerCase()

// Log warning if backend is not supabase
if (backend !== 'supabase') {
  logger.warn('Only Supabase backend is supported', { context: 'API' })
}

// Export supabaseApi as api
export const api = supabaseApi
