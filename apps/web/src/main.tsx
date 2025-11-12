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
import { ensureClientEnv, formatMissingHtml } from '@trakr/shared'

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

const clientEnv = ensureClientEnv((key) => (import.meta.env as Record<string, string | undefined>)[key])

if (clientEnv.missing.length > 0) {
  const names = clientEnv.missing.map((def) => def.key).join(', ')
  console.error('❌ Missing required environment variables:', names)
  console.error('Please configure these in your Vercel dashboard or .env file')

  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif;">
      <div style="max-width: 32rem; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
        <h1 style="color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem;">⚠️ Configuration Error</h1>
        <p style="color: #4b5563; margin-bottom: 1rem;">The application is missing required environment variables:</p>
        <ul style="color: #6b7280; margin-bottom: 1.5rem; padding-left: 1.5rem;">
          ${formatMissingHtml(clientEnv.missing)}
        </ul>
        <p style="color: #4b5563; font-size: 0.875rem;">
          Please contact your system administrator or check the deployment configuration.
        </p>
      </div>
    </div>
  `

  throw new Error(`Missing required environment variables: ${names}`)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
