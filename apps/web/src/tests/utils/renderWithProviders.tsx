import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ToastProvider'

export function createTestClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function createTestWrapper() {
  const qc = createTestClient()
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={qc}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
  return { qc, Wrapper }
}

export async function renderWithProviders(
  ui: React.ReactElement,
  { route = '/', queryClient }: { route?: string; queryClient?: QueryClient } = {}
) {
  const qc = queryClient ?? createTestClient()
  let utils: ReturnType<typeof render>
  await act(async () => {
    utils = render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )
  })
  // Allow initial queries/mutations to settle to reduce act warnings
  await waitFor(() => qc.isFetching() === 0 && qc.getMutationCache().getAll().length === 0)
  // Flush any pending microtasks/macrotasks that may schedule state updates post-render
  await act(async () => { await Promise.resolve() })
  await new Promise(res => setTimeout(res, 0))
  // @ts-expect-error assigned in act() block
  return { qc, ...utils }
}
