import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App.tsx'
import './index.css'
import { emitToast } from './utils/toastBus'
import { apiErrorMessage } from './utils/apiError'
import { initSentry } from './utils/sentry'

// Initialize Sentry error tracking (production only)
initSentry()

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only toast for queries that have been retried at least once or are not disabled
      // Avoid spamming for background prefetches
      if (query.state.status === 'error') {
        emitToast({ message: apiErrorMessage(error, 'Something went wrong'), variant: 'error' })
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      emitToast({ message: apiErrorMessage(error, 'Action failed'), variant: 'error' })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (how long inactive data stays in cache)
      retry: 1,
    },
  },
})

// Persist React Query cache to localStorage for faster reloads
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'trakr-query-cache',
})

// Validate required environment variables in production
if (import.meta.env.PROD) {
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]
  
  const missing = requiredEnvVars.filter(varName => {
    const value = (import.meta.env as any)[varName]
    return !value || value.trim() === ''
  })
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '))
    console.error('Please configure these in your Vercel dashboard or .env file')
    
    // Show user-friendly error
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif;">
        <div style="max-width: 32rem; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
          <h1 style="color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem;">⚠️ Configuration Error</h1>
          <p style="color: #4b5563; margin-bottom: 1rem;">The application is missing required environment variables:</p>
          <ul style="color: #6b7280; margin-bottom: 1.5rem; padding-left: 1.5rem;">
            ${missing.map(v => `<li><code style="background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">${v}</code></li>`).join('')}
          </ul>
          <p style="color: #4b5563; font-size: 0.875rem;">
            Please contact your system administrator or check the deployment configuration.
          </p>
        </div>
      </div>
    `
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
