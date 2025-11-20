import { create } from 'zustand'
import type { QueryKey } from '@tanstack/react-query'

type ApiHealthState = {
  issues: Record<string, string>
  setIssue: (label: string, message: string) => void
  clearIssue: (label: string) => void
  clearAll: () => void
}

export const useApiHealthStore = create<ApiHealthState>((set) => ({
  issues: {},
  setIssue: (label, message) => set((state) => ({
    issues: { ...state.issues, [label]: message },
  })),
  clearIssue: (label) => set((state) => {
    const next = { ...state.issues }
    delete next[label]
    return { issues: next }
  }),
  clearAll: () => set({ issues: {} }),
}))

const QUERY_LABEL_MAP: Record<string, string> = {
  branches: 'Branches',
  zones: 'Zones',
  'auditor-assignments': 'Assignments',
  organizations: 'Organizations',
}

export function monitoredQueryLabel(queryKey?: QueryKey): string | undefined {
  if (!queryKey || !Array.isArray(queryKey) || queryKey.length === 0) return undefined
  const first = String(queryKey[0])
  return QUERY_LABEL_MAP[first]
}
