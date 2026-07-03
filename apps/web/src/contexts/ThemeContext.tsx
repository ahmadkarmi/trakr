import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { safeLocalStorage } from '../utils/safeStorage'

export type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (value: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const STORAGE_KEY = 'trakr:theme-preference'

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(getSystemTheme)

  useEffect(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setPreference(stored)
    }
  }, [])

  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEY, preference)
  }, [preference])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const root = document.documentElement

    const applyTheme = (value: ResolvedTheme) => {
      setResolvedTheme(value)
      if (value === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      root.dataset.theme = value
      root.style.setProperty('color-scheme', value)
    }

    const current = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference
    applyTheme(current)

    const handleChange = (event: MediaQueryListEvent) => {
      if (preference === 'system') {
        applyTheme(event.matches ? 'dark' : 'light')
      }
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [preference])

  const updatePreference = useCallback((value: ThemePreference) => {
    setPreference(value)
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    setPreference: updatePreference,
  }), [preference, resolvedTheme, updatePreference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
