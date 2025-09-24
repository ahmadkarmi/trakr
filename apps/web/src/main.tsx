import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
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
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
