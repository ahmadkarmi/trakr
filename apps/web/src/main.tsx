import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App.tsx'
import './index.css'
import { emitToast } from './utils/toastBus'
import { apiErrorMessage } from './utils/apiError'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
