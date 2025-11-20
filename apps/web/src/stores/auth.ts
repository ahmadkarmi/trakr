import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { getSupabase, hasSupabaseEnv } from '../utils/supabaseClient'
import { preloadDashboardChunk } from '../hooks/useDashboardPrefetch'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { logger } from '../utils/logger'
import { setSentryUser, clearSentryUser } from '../utils/sentry'

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function fetchAppUserWithRetry(authUserId: string, email?: string | null, maxAttempts = 5, delayMs = 300): Promise<User | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const [byId, all] = await Promise.allSettled([
        api.getUserById(authUserId),
        api.getUsers(),
      ])
      if (byId.status === 'fulfilled' && byId.value) {
        return byId.value as User
      }
      if (all.status === 'fulfilled' && all.value && email) {
        const found = (all.value as User[]).find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase()) || null
        if (found) return found
      }
    } catch {}
    if (attempt < maxAttempts) await sleep(delayMs)
  }
  return null
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (role: UserRole) => Promise<void>
  signInWithCredentials: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setLoading: (loading: boolean) => void
  updateUser: (user: User) => void
  init: () => Promise<void>
  sessionError: string | null
  acknowledgeSessionError: () => void
  isManualSignOut: boolean
}

// Mock users for different roles
const mockUsers: Record<UserRole, User> = {
  [UserRole.AUDITOR]: {
    id: 'user-1',
    name: 'John Auditor',
    email: 'auditor@trakr.com',
    role: UserRole.AUDITOR,
    orgId: 'org-1',
    branchId: 'branch-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  [UserRole.BRANCH_MANAGER]: {
    id: 'user-2',
    name: 'Jane Manager',
    email: 'branchmanager@trakr.com',
    role: UserRole.BRANCH_MANAGER,
    orgId: 'org-1',
    branchId: 'branch-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  [UserRole.ADMIN]: {
    id: 'user-3',
    name: 'Admin User',
    email: 'admin@trakr.com',
    role: UserRole.ADMIN,
    orgId: 'org-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  [UserRole.SUPER_ADMIN]: {
    id: 'user-4',
    name: 'Super Admin',
    email: 'superadmin@trakr.com',
    role: UserRole.SUPER_ADMIN,
    orgId: 'org-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionError: null,
      isManualSignOut: false,

      signIn: async (role: UserRole) => {
        set({ isLoading: true })
        try {
          if (hasSupabaseEnv()) {
            const emailByRole: Record<UserRole, string> = {
              [UserRole.ADMIN]: 'admin@trakr.com',
              [UserRole.BRANCH_MANAGER]: 'branchmanager@trakr.com',
              [UserRole.AUDITOR]: 'auditor@trakr.com',
              [UserRole.SUPER_ADMIN]: 'admin@trakr.com',
            }
            const email = emailByRole[role]
            const password = (import.meta as any).env?.VITE_DEFAULT_PASSWORD || 'Password@123'
            const supabase = getSupabase()
            let authUser = null as null | { id: string; email?: string | null }
            try {
              const { data, error } = await supabase.auth.signInWithPassword({ email, password })
              if (error) throw error
              authUser = data.user
            } catch (signInErr) {
              // Auto-provision with default password if user exists in DB
              try {
                const users = await api.getUsers()
                const existsInDb = !!users.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
                if (existsInDb) {
                  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
                  if (signUpError) throw signUpError
                  if (!signUpData.session || !signUpData.user) {
                    throw new Error(`Account created. Check ${email} to verify, then log in.`)
                  }
                  authUser = signUpData.user
                } else {
                  throw signInErr
                }
              } catch (autoErr) {
                throw autoErr
              }
            }
            if (!authUser) throw new Error('No auth user returned')

            let appUser: User | null = null
            try {
              const [userById, allUsers] = await Promise.allSettled([
                api.getUserById(authUser.id),
                api.getUsers()
              ])
              if (userById.status === 'fulfilled' && userById.value) {
                appUser = userById.value
              } else if (allUsers.status === 'fulfilled' && allUsers.value) {
                appUser = allUsers.value.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase()) || null
              }
            } catch (parallelError) {
              logger.warn('Parallel lookup failed, trying sequential', { context: 'AuthStore', data: parallelError })
              try {
                appUser = await api.getUserById(authUser.id)
              } catch {
                const users = await api.getUsers()
                appUser = users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase()) || null
              }
            }
            if (!appUser) throw new Error('User profile not found in database')

            preloadDashboardChunk(appUser.role)
            setSentryUser({ id: appUser.id, email: appUser.email, role: appUser.role, orgId: appUser.orgId })
            set({ user: appUser, isAuthenticated: true, isLoading: false })
            return
          }
          
          // Fallback for non-Supabase environments (mock/CI)
          const users = await api.getUsers()
          let user = users.find(u => u.role === role)
          if (!user) {
            const emailByRole: Record<UserRole, string> = {
              [UserRole.ADMIN]: 'admin@trakr.com',
              [UserRole.BRANCH_MANAGER]: 'branchmanager@trakr.com',
              [UserRole.AUDITOR]: 'auditor@trakr.com',
              [UserRole.SUPER_ADMIN]: 'admin@trakr.com',
            }
            const target = emailByRole[role]?.toLowerCase()
            user = users.find(u => (u.email || '').toLowerCase() === target)
          }
          if (!user) user = users[0]
          if (!user) throw new Error('No users available from backend')

          // Preload dashboard chunk for faster navigation
          preloadDashboardChunk(user.role)
          
          // Track user in Sentry for error monitoring
          setSentryUser({
            id: user.id,
            email: user.email,
            role: user.role,
            orgId: user.orgId
          })
          
          set({ user, isAuthenticated: true, isLoading: false })
        } catch (e) {
          // Last-resort fallback to local mock identity (development only)
          if (import.meta.env.DEV) {
            const fallback = mockUsers[role]
            preloadDashboardChunk(fallback.role)
            set({ user: fallback, isAuthenticated: true, isLoading: false })
            logger.error('Role-based login failed, using mock fallback (DEV only)', e, { context: 'AuthStore' })
          } else {
            // In production, fail loudly instead of masking the issue
            set({ isLoading: false })
            logger.error('Role-based login failed in production', e, { context: 'AuthStore' })
            throw e
          }
        }
      },

      signInWithCredentials: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          if (!hasSupabaseEnv()) {
            // Supabase auth not configured in this environment
            set({ isLoading: false })
            throw new Error('Supabase auth is not configured (missing VITE_SUPABASE_URL/ANON_KEY)')
          }
          const supabase = getSupabase()
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          const authUser = data.user
          if (!authUser) throw new Error('No auth user returned')

          // Hydrate application user from DB (parallel lookup for speed)
          let appUser: User | null = null
          try {
            const [userById, allUsers] = await Promise.allSettled([
              api.getUserById(authUser.id),
              api.getUsers()
            ])
            
            if (userById.status === 'fulfilled' && userById.value) {
              appUser = userById.value
            } else if (allUsers.status === 'fulfilled' && allUsers.value) {
              appUser = allUsers.value.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null
            }
          } catch (parallelError) {
            console.warn('[Auth] Parallel lookup failed, trying sequential', parallelError)
            // Fallback to sequential lookup
            try {
              appUser = await api.getUserById(authUser.id)
            } catch {
              const users = await api.getUsers()
              appUser = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null
            }
          }
          
          if (!appUser) {
            throw new Error('User profile not found. Ensure seed created users in the database.')
          }

          // Preload dashboard chunk for faster navigation
          preloadDashboardChunk(appUser.role)
          
          // Track user in Sentry for error monitoring
          setSentryUser({
            id: appUser.id,
            email: appUser.email,
            role: appUser.role,
            orgId: appUser.orgId
          })
          
          set({ user: appUser, isAuthenticated: true, isLoading: false })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      signOut: async () => {
        set({ isManualSignOut: true })
        try {
          if (hasSupabaseEnv()) {
            await getSupabase().auth.signOut()
          }
        } catch {}

        // Clear persisted auth state from localStorage
        try {
          localStorage.removeItem('trakr-auth')
        } catch {}

        // Clear Sentry user context
        clearSentryUser()

        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          sessionError: null, 
          isManualSignOut: false,
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      updateUser: (user: User) => {
        set({ user })
      },
      init: async () => {
        // Establish session and auth state listener
        try {
          set({ isLoading: true })
          // If Supabase is not configured (e.g., CI mock backend), skip auth wiring
          if (!hasSupabaseEnv()) {
            return
          }
          const supabase = getSupabase()
          // Handle Supabase magic link (email) sign-in via token_hash (supports E2E helper and real magic links)
          try {
            const currentUrl = new URL(window.location.href)
            const search = currentUrl.searchParams
            const hashParams = new URLSearchParams((currentUrl.hash || '').replace(/^#/, ''))
            const tokenHash = search.get('token_hash') || hashParams.get('token_hash')
            const t = (search.get('type') || hashParams.get('type') || '').toLowerCase()
            if (tokenHash) {
              await supabase.auth.verifyOtp({ type: (t === 'recovery' ? 'recovery' : 'magiclink') as any, token_hash: tokenHash })
              // Clean sensitive params from the URL
              search.delete('token_hash'); search.delete('type')
              currentUrl.hash = ''
              const cleaned = currentUrl.pathname + (search.toString() ? `?${search.toString()}` : '')
              try { window.history.replaceState({}, '', cleaned) } catch {}
            }
          } catch {}
          const { data: sessionRes } = await supabase.auth.getSession()
          const sessUser = sessionRes?.session?.user
          if (sessUser) {
            // If we already have a user persisted and IDs match, keep it
            // Regardless, hydrate with retry to avoid race where DB user isn't ready yet
            const appUser = await fetchAppUserWithRetry(sessUser.id, sessUser.email || '', 6, 350)
            if (appUser) {
              setSentryUser({
                id: appUser.id,
                email: appUser.email,
                role: appUser.role,
                orgId: appUser.orgId
              })
              set({ user: appUser, isAuthenticated: true })
            }
          }
          // Subscribe to auth changes
          supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            const u = session?.user
            if (!u) {
              const wasManual = _get().isManualSignOut
              const hadUser = !!_get().user
              if (!wasManual && hadUser && event !== 'INITIAL_SESSION') {
                set({ sessionError: 'Your session expired. Please sign in again.' })
              } else {
                set({ sessionError: null })
              }
              clearSentryUser()
              set({ user: null, isAuthenticated: false, isManualSignOut: false })
              return
            }
            const appUser = await fetchAppUserWithRetry(u.id, u.email || '', 6, 350)
            if (appUser) {
              setSentryUser({
                id: appUser.id,
                email: appUser.email,
                role: appUser.role,
                orgId: appUser.orgId
              })
              set({ user: appUser, isAuthenticated: true })
            }
          })
        } finally {
          set({ isLoading: false })
        }
      },
      acknowledgeSessionError: () => set({ sessionError: null }),
    }),
    {
      name: 'trakr-auth',
      version: 1,
      migrate: (persisted: any, _version: number) => {
        try {
          const u = (persisted as any)?.user
          const isUuid = typeof u?.id === 'string' && /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(u.id)
          if (!isUuid) {
            return { ...persisted, user: null, isAuthenticated: false }
          }
        } catch {}
        return persisted
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
