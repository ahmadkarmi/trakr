import React, { ReactNode } from 'react'
import { useAuthStore } from '../stores/auth'
import { USER_ROLE_LABELS } from '@trakr/shared'

interface DashboardLayoutProps {
  title: string
  children: ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, children }) => {
  const { user, signOut } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">Trakr</h1>
              <span className="ml-4 text-gray-400">|</span>
              <h2 className="ml-4 text-xl font-semibold text-gray-900">{title}</h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role && USER_ROLE_LABELS[user.role]}</p>
              </div>
              <button
                onClick={signOut}
                className="btn-outline text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout
