import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '@trakr/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (role: UserRole) => Promise<void>;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
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
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      initialize: async () => {
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ isLoading: false });
      },

      signIn: async (role: UserRole) => {
        set({ isLoading: true });
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const user = mockUsers[role];
        set({ 
          user, 
          isAuthenticated: true, 
          isLoading: false 
        });
      },

      signOut: () => {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'trakr-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
