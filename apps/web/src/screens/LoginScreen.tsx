import React from 'react'
import { UserRole, USER_ROLE_LABELS, USER_ROLE_EMOJIS } from '@trakr/shared'
import { useAuthStore } from '../stores/auth'

const LoginScreen: React.FC = () => {
  const { signIn, isLoading } = useAuthStore()

  const handleRoleLogin = async (role: UserRole) => {
    await signIn(role)
  }

  const roleButtons = [
    { role: UserRole.AUDITOR, icon: '🕵️‍♂️' },
    { role: UserRole.BRANCH_MANAGER, icon: '🏬' },
    { role: UserRole.ADMIN, icon: '🛠️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Trakr</h1>
          <h2 className="text-xl text-gray-600 font-medium">Modern Audit Management</h2>
          <p className="mt-4 text-sm text-gray-500">
            Select your role to continue to the application
          </p>
        </div>

        <div className="space-y-4">
          {roleButtons.map(({ role, icon }) => (
            <button
              key={role}
              onClick={() => handleRoleLogin(role)}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              ) : (
                <span className="text-xl mr-3">{icon}</span>
              )}
              Login as {USER_ROLE_LABELS[role]}
            </button>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            This is a demo application with mock authentication.
            <br />
            Choose any role to explore the features.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
