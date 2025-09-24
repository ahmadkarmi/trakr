import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole } from '@trakr/shared'
import { api } from '../utils/api'
import { getSupabase } from '../utils/supabaseClient'

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
    email: 'manager@trakr.com',
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
          // Prefer real users from the active backend (Supabase when VITE_BACKEND=supabase)
          const users = await api.getUsers()
          // Primary: match by role
          let user = users.find(u => u.role === role)
          // Secondary: match by seeded email for reliability
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
          // Fallback: first available
          if (!user) user = users[0]
          if (!user) throw new Error('No users available from backend')

          set({ user, isAuthenticated: true, isLoading: false })
        } catch (_e) {
          // Last-resort fallback to local mock identity (keeps demo usable)
          const fallback = mockUsers[role]
          set({ user: fallback, isAuthenticated: true, isLoading: false })
        }
      },

      signInWithCredentials: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const supabase = getSupabase()
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          const authUser = data.user
          if (!authUser) throw new Error('No auth user returned')

          // Hydrate application user from DB (id matches auth uid in our schema)
          let appUser: User | null = null
          try {
            const maybe = await api.getUserById(authUser.id)
            appUser = maybe
          } catch {}
          if (!appUser) {
            const byEmail = (await api.getUsers()).find(u => (u.email || '').toLowerCase() === email.toLowerCase())
            if (byEmail) appUser = byEmail
          }
          if (!appUser) throw new Error('User profile not found. Ensure seed created users in the database.')

          set({ user: appUser, isAuthenticated: true, isLoading: false })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      signOut: () => {
        try { getSupabase().auth.signOut() } catch {}
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
          const supabase = getSupabase()
          set({ isLoading: true })
          const { data: sessionRes } = await supabase.auth.getSession()
          const sessUser = sessionRes?.session?.user
          if (sessUser) {
            // If we already have a user persisted and IDs match, keep it
            // Regardless, try to hydrate to ensure consistency
            let appUser: User | null = null
            try {
              const maybe = await api.getUserById(sessUser.id)
              appUser = maybe
            } catch {}
            if (!appUser) {
              const email = sessUser.email || ''
              const byEmail = (await api.getUsers()).find(u => (u.email || '').toLowerCase() === email.toLowerCase())
              if (byEmail) appUser = byEmail
            }
            if (appUser) {
              set({ user: appUser, isAuthenticated: true })
            }
          }
          // Subscribe to auth changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            const u = session?.user
            if (!u) {
              set({ user: null, isAuthenticated: false })
              return
            }
            let appUser: User | null = null
            try { appUser = await api.getUserById(u.id) } catch {}
            if (!appUser && u.email) {
              const byEmail = (await api.getUsers()).find(x => (x.email || '').toLowerCase() === u.email!.toLowerCase())
              if (byEmail) appUser = byEmail
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
