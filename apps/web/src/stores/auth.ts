import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { getSupabase, hasSupabaseEnv } from '../utils/supabaseClient'
import { preloadDashboardChunk } from '../hooks/useDashboardPrefetch'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (role: UserRole) => Promise<void>
  signInWithCredentials: (email: string, password: string) => Promise<void>
  signOut: () => void
  setLoading: (loading: boolean) => void
  updateUser: (user: User) => void
  init: () => Promise<void>
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

      signIn: async (role: UserRole) => {
        set({ isLoading: true })
        try {
          // If Supabase is configured, authenticate properly with real auth session
          if (hasSupabaseEnv()) {
            const emailByRole: Record<UserRole, string> = {
              [UserRole.ADMIN]: 'admin@trakr.com',
              [UserRole.BRANCH_MANAGER]: 'branchmanager@trakr.com',
              [UserRole.AUDITOR]: 'auditor@trakr.com',
              [UserRole.SUPER_ADMIN]: 'admin@trakr.com',
            }
            const email = emailByRole[role]
            const password = 'Password@123' // Default password set by our script
            
            // Use the credentials login flow to create a real Supabase session
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
            
            if (!appUser) throw new Error('User profile not found in database')

            // Preload dashboard chunk for faster navigation
            preloadDashboardChunk(appUser.role)
            
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
          
          set({ user, isAuthenticated: true, isLoading: false })
        } catch (e) {
          // Last-resort fallback to local mock identity (keeps demo usable)
          const fallback = mockUsers[role]
          preloadDashboardChunk(fallback.role)
          set({ user: fallback, isAuthenticated: true, isLoading: false })
          console.error('Role-based login failed, using mock fallback:', e)
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
          
          set({ user: appUser, isAuthenticated: true, isLoading: false })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      signOut: () => {
        try { if (hasSupabaseEnv()) getSupabase().auth.signOut() } catch {}
        set({ user: null, isAuthenticated: false, isLoading: false })
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
            // Regardless, try to hydrate to ensure consistency (parallel for speed)
            let appUser: User | null = null
            try {
              const [userById, allUsers] = await Promise.allSettled([
                api.getUserById(sessUser.id),
                api.getUsers()
              ])
              
              if (userById.status === 'fulfilled' && userById.value) {
                appUser = userById.value
              } else if (allUsers.status === 'fulfilled' && allUsers.value) {
                const email = sessUser.email || ''
                appUser = allUsers.value.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null
              }
            } catch (parallelError) {
              console.warn('[Auth] Parallel init lookup failed, trying sequential', parallelError)
              try {
                appUser = await api.getUserById(sessUser.id)
              } catch {
                const email = sessUser.email || ''
                const users = await api.getUsers()
                appUser = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null
              }
            }
            
            if (appUser) {
              set({ user: appUser, isAuthenticated: true })
            }
          }
          // Subscribe to auth changes
          supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
            const u = session?.user
            if (!u) {
              set({ user: null, isAuthenticated: false })
              return
            }
            // Parallel user lookup for speed
            let appUser: User | null = null
            const [userById, allUsers] = await Promise.allSettled([
              api.getUserById(u.id),
              api.getUsers()
            ])
            
            if (userById.status === 'fulfilled') {
              appUser = userById.value
            } else if (allUsers.status === 'fulfilled' && u.email) {
              appUser = allUsers.value.find(x => (x.email || '').toLowerCase() === u.email!.toLowerCase()) || null
            }
            
            if (appUser) set({ user: appUser, isAuthenticated: true })
          })
        } finally {
          set({ isLoading: false })
        }
      },
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
